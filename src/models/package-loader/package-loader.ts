import fs from 'fs';
import path from 'path';
import { v4 } from 'uuid';
import YAML from 'yaml';

import { Logger as ILogger } from 'quantumhub-sdk';

import { Hub } from '../hub';
import { Attribute } from './interfaces/attribute';
import { Definition } from './interfaces/definition';
import { Process, processToDto } from './interfaces/process';

import { Device } from 'quantumhub-sdk';
import { PackageProvider } from '../provider/package-provider';
import { ProcessStatus } from './enums/status';

export class PackageLoader {
  private _definitions: Definition[] = [];
  private logger: ILogger;
  private processes: { [id: string]: Process } = {};
  private hub: Hub;

  constructor(hub: Hub) {
    this.hub = hub;
    this.logger = this.hub.createLogger('PackageLoader');
  }

  get definitions(): Definition[] {
    return this._definitions;
  }

  scanFolder = async (inputFolder: string): Promise<boolean> => {
    const folder = path.resolve(inputFolder);

    if (!fs.existsSync(folder)) {
      this.logger.error('Folder does not exist:', folder);
      return false;
    }

    const files = fs.readdirSync(folder); //.filter((elm) => elm.match(/package\.json$/gi));

    for (const file of files) {
      const directoryName = `${folder}/${file}`;

      if (!fs.lstatSync(directoryName).isDirectory()) {
        continue;
      }

      this.logger.trace('Scanning directory:', directoryName);

      if (!fs.existsSync(`${directoryName}/config.yaml`)) {
        this.logger.error('No attributes.yaml found in:', directoryName);
        continue;
      }

      const definition = this.readPackageConfig(directoryName, `${directoryName}/config.yaml`);

      this.logger.trace('Loaded package definition:', definition.name);
      this._definitions.push(definition);
    }

    return true;
  };

  readPackage = async (filename: string): Promise<any> => {
    const content = fs.readFileSync(filename, 'utf8');
    const output = JSON.parse(content);

    return output;
  };

  readPackageConfig = (directoryName: string, filename: string): Definition => {
    const content = fs.readFileSync(filename, 'utf8');
    const output = YAML.parse(content, {});

    const { name, entry, version, description, author } = output.package;
    const path = `${directoryName}/${entry}`;

    const attributes: Attribute[] = [];
    for (const key in output.attributes) {
      const data = output.attributes[key];
      data.key = key;

      this.logger.trace('Loaded attribute:', JSON.stringify(data));

      attributes.push(data);
    }

    const definition: Definition = {
      path,
      name,
      entry,
      description,
      author,
      version,
      attributes,
    };
    return definition;
  };

  initializeProcess = async (definition: Definition, config: any): Promise<boolean> => {
    const uuid = v4();
    this.logger.trace(`Instantiating package: ${definition.name} (v${definition.version}) with config`, JSON.stringify(config));

    try {
      const loadedPackage = await import(definition.path);
      const device = new loadedPackage.default() as Device;
      const provider = new PackageProvider(this.hub, config, definition, device);

      const process: Process = {
        uuid,
        identifier: config.identifier,
        name: config.name,
        provider,
        status: ProcessStatus.LOADED,
      };

      this.processes[uuid] = process;

      const result = await device.init(provider);

      if (!result) {
        this.logger.error('Failed to initialize package:', definition.name);
        return false;
      }

      process.status = ProcessStatus.INITIALIZED;

      this.hub.server.sendProcessUpdate(process);

      return await this.startProcess(uuid);
    } catch (error) {
      this.logger.error('Error starting package:', definition.name, error);
      return false;
    }
  };

  startProcess = async (uuid: string): Promise<boolean> => {
    const process = this.processes[uuid];

    if (!process) {
      this.logger.error('Process not found:', uuid);
      return false;
    }

    if (process.status === ProcessStatus.STARTING || process.status === ProcessStatus.RUNNING) {
      return true;
    }

    process.status = ProcessStatus.STARTING;
    this.hub.server.sendProcessUpdate(process);

    await process.provider.device.start();

    process.status = ProcessStatus.RUNNING;
    process.startTime = new Date();

    this.hub.server.sendProcessUpdate(process);

    return true;
  };

  startAll = async (): Promise<void> => {
    if (!this.hub.config.packages) {
      this.logger.error('No packages found in config');
      return;
    }

    const configurations = this.hub.config.packages.configuration;

    for (const config of configurations) {
      const definition = this._definitions.find((elm) => elm.name === config.package);
      if (!definition) {
        this.logger.error('Package not found:', config.package);
        continue;
      }

      await this.initializeProcess(definition, config);
    }
  };

  stopAll = async (): Promise<void> => {
    this.logger.trace('Stopping all processes', Object.keys(this.processes));

    for (const uuid in this.processes) {
      this.logger.trace('Stopping process:', uuid);
      await this.stopProcess(uuid);
    }
  };

  stopProcess = async (uuid: string): Promise<void> => {
    const process = this.processes[uuid];
    if (!process) {
      this.logger.error('Process not found:', uuid);
      return;
    }

    if (process.status === ProcessStatus.STOPPING || process.status === ProcessStatus.STOPPED) {
      return;
    }

    process.status = ProcessStatus.STOPPING;
    this.hub.server.sendProcessUpdate(process);

    this.logger.trace('Stopping:', process.provider.config.identifier);
    try {
      await process.provider.device.stop();
    } catch (error) {
      this.logger.error('Error stopping package:', process.provider.definition.name, error);
    }

    process.status = ProcessStatus.STOPPED;
    this.hub.server.sendProcessUpdate(process);
  };

  data = () => {
    const result: any = {};
    result.data = [];

    for (const uuid in this.processes) {
      const process = this.processes[uuid];
      result.data.push(processToDto(process));
    }

    return result;
  };

  getProcess = (identifier: string): Process | undefined => {
    const process = Object.values(this.processes).find((elm) => elm.provider.config.identifier === identifier);
    return process;
  };
}
