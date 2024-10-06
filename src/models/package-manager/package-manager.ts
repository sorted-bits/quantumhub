import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import YAML from 'yaml';
import { compareVersions } from 'compare-versions';

import { Attribute, Logger, Definition } from 'quantumhub-sdk';

import { Hub } from '../hub';
import { PackageConfig } from '../config/interfaces/packages-config';
import { ProcessManager } from './models/process-manager.ts';
import { InstallManager } from './models/install-manager';

export interface RepositoryPackage {
  name: string;
  identifier: string;
  repository: string;
  config: string;
  description: string;
  author: string;
  version: string;

  isInstalled: boolean;
  isNewer: boolean;
}

export class PackageManager {
  private _definitions: Definition[] = [];
  private logger: Logger;
  private hub: Hub;

  private packagesLoaded: boolean = false;
  private repositoryPackageData: RepositoryPackage[] = [];

  processManager: ProcessManager;
  installManager: InstallManager;

  constructor(hub: Hub) {
    this.hub = hub;
    this.logger = this.hub.createLogger('PackageLoader');

    this.processManager = new ProcessManager(hub, this);
    this.installManager = new InstallManager(hub, this);
  }

  initialize = async (): Promise<boolean> => {
    await this.installManager.initialize();

    await this.loadPackageDefinitionsFromRepository();
    await this.loadPackages();

    try {
      await this.processManager.startAll();
    } catch (error) {
      this.logger.error('Error starting packages', error);
      return false;
    }

    return true;
  }

  get repositoryPackages(): RepositoryPackage[] {
    this.repositoryPackageData.forEach((pack) => {
      const definition = this._definitions.find((elm) => elm.identifier === pack.identifier);

      pack.isInstalled = this.installManager.isInstalled(pack.repository);
      pack.isNewer = false;

      if (definition) {
        pack.isNewer = compareVersions(pack.version, definition.version ?? '0.0.0') === 1;
      }
      this.logger.info('Repository package:', pack.name, pack.isInstalled, pack.isNewer);
    });

    return this.repositoryPackageData;
  }

  get definitions(): Definition[] {
    return this._definitions;
  }

  getDefinition = (identifier: string): Definition | undefined => {
    return this._definitions.find((elm) => elm.identifier === identifier);
  }

  getDefinitionsWithRepository = (repository: string): Definition[] => {
    return this._definitions.filter((elm) => elm.repository === repository);
  }

  loadPackages = async (): Promise<void> => {
    this.logger.info(
      'Loading packages',
      this.hub.config.packages.configuration.map((p) => p.name)
    );

    const configs = this.hub.config.packages.configuration;

    for (const config of configs) {
      if (config.disabled) {
        this.logger.info('Skipping disabled package:', config.name);
        continue;
      }

      await this.loadPackage(config);
    };
  }

  loadPackage = async (packageConfig: PackageConfig): Promise<void> => {
    if (!packageConfig.config_file || !packageConfig.repository) {
      this.logger.error('Invalid package config:', packageConfig);
      return;
    }

    this.logger.info('Checking package:', packageConfig.name);

    if (this.installManager.isInstalled(packageConfig.repository)) {
      this.logger.info('Package already installed:', packageConfig.name);
    } else {
      this.logger.info('Package not installed:', packageConfig.name);
      await this.installManager.downloadPackage(packageConfig.repository);
    }

    await this.loadPackageFromConfig(packageConfig);
  }

  reloadDefinition = async (definition: Definition): Promise<boolean> => {
    const configFile = definition.config_path;
    this.logger.info('Reloading package:', definition.identifier, configFile);
    const newDefinition = this.readPackageConfig(configFile);

    if (!newDefinition) {
      this.logger.error('Failed to reload package:', definition.identifier);
      return false;
    }

    definition.name = newDefinition.name;
    definition.identifier = newDefinition.identifier;
    definition.entry = newDefinition.entry;
    definition.author = newDefinition.author;
    definition.description = newDefinition.description;
    definition.version = newDefinition.version;
    definition.attributes = newDefinition.attributes;
    return true;
  }

  reloadPackage = async (identifier: string): Promise<boolean> => {
    const definition = this.getDefinition(identifier);
    if (!definition) {
      this.logger.error('Package not found:', identifier);
      return false;
    }

    await this.processManager.stopAllProcessesUsingPackage(definition);

    if (!await this.reloadDefinition(definition)) {
      return false;
    }

    await this.processManager.startAllUsingPackage(definition);
    return true;
  };

  loadPackageFromConfig = async (config: PackageConfig): Promise<void> => {
    if (!config.config_file) {
      this.logger.error('Invalid package config:', config);
      return;
    }

    const configPath = this.configPath(config);
    this.logger.info('Loading package from config:', configPath);

    const definition = this.readPackageConfig(configPath);
    if (definition) {
      this.logger.trace('Loaded package definition:', definition.name);
      this.addPackageDefinition(definition);
    } else {
      this.logger.error('Failed to load package definition:', configPath);
    }
  };

  private addPackageDefinition = (definition: Definition): void => {
    if (this.getDefinition(definition.identifier)) {
      this.logger.info('Package definition already exists:', definition.identifier);
      return;
    }

    this._definitions.push(definition);
  };

  private readPackageConfig = (configFile: string): Definition | undefined => {
    if (!fs.existsSync(configFile)) {
      this.logger.error('File does not exist:', configFile);
      return undefined;
    }

    const content = fs.readFileSync(configFile, 'utf8');
    const output = YAML.parse(content, {});

    const {
      name,
      entry,
      version,
      description,
      author,
      repository,
      identifier
    } = output.package;

    const directoryName = path.dirname(configFile);

    const entryFile = `${directoryName}/${entry}`;

    if (!fs.existsSync(entryFile)) {
      this.logger.error('Entry file not found:', path);
      return undefined;
    }

    const attributes: Attribute[] = [];
    for (const key in output.attributes) {
      const data = output.attributes[key];
      data.key = key;

      data.availability = data.availability ?? (data.unavailability_value === undefined);

      this.logger.trace('Loaded attribute:', JSON.stringify(data));

      attributes.push(data);
    }

    const definition: Definition = {
      config_path: configFile,
      path: entryFile,
      identifier,
      name,
      entry,
      description,
      author,
      version,
      attributes,
      repository
    };
    return definition;
  };

  loadPackageDefinitionsFromRepository = async (): Promise<void> => {
    const repository = this.hub.config.packages_repository;

    try {
      this.logger.info('Loading packages from repository:', repository);
      const response = await fetch(repository);
      const data = await response.json();

      const packages: RepositoryPackage[] = data.packages;

      for (const pack of packages) {
        const definition = this._definitions.find((elm) => elm.identifier === pack.identifier);
        pack.isInstalled = this.installManager.isInstalled(pack.repository);

        if (pack.isInstalled) {
          const compared = compareVersions(pack.version, definition?.version ?? '0.0.0');
          pack.isNewer = compared === 1;
        } else {
          pack.isNewer = false;
        }
      }

      this.packagesLoaded = true;
      this.repositoryPackageData = packages;
    } catch (error) {
      this.logger.error('Error loading packages from repository:', error);
    }
  }

  configPath = (packageConfig: PackageConfig): string => {
    const fullPath = this.installManager.installPath(packageConfig.repository);
    return path.join(fullPath, packageConfig.config_file);
  }


}
