import fs from 'fs';
import path from 'path';
import { v4 } from 'uuid';
import YAML from 'yaml';

import { Logger as ILogger } from 'quantumhub-sdk';

import { Hub } from '../hub';
import { Attribute } from './interfaces/attribute';
import { Definition } from './interfaces/definition';
import { Process } from './interfaces/process';

import { Device } from 'quantumhub-sdk';
import { ProcessStatus } from './enums/status';
import { ModuleProvider } from './models/module-provider';

export class ModuleLoader {
  private definitions: Definition[] = [];
  private logger: ILogger;
  private processes: { [id: string]: Process } = {};
  private hub: Hub;

  constructor(hub: Hub) {
    this.hub = hub;
    this.logger = this.hub.createLogger('ModuleLoader');
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

      const definition = this.readModuleConfig(directoryName, `${directoryName}/config.yaml`);

      this.logger.trace('Loaded module definition:', definition.name);
      this.definitions.push(definition);
    }

    return true;
  };

  readPackage = async (filename: string): Promise<any> => {
    const content = fs.readFileSync(filename, 'utf8');
    const output = JSON.parse(content);

    return output;
  };

  readModuleConfig = (directoryName: string, filename: string): Definition => {
    const content = fs.readFileSync(filename, 'utf8');
    const output = YAML.parse(content, {});

    const { name, entry, version, description, author } = output.module;
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

  startProcess = async (definition: Definition, config: any): Promise<boolean> => {
    const uuid = v4();
    this.logger.trace(`Instantiating module: ${definition.name} (v${definition.version}) with config`, JSON.stringify(config));

    try {
      const loadedModule = await import(definition.path);
      const device = new loadedModule.default() as Device;
      const provider = new ModuleProvider(this.hub, config, definition, device);
      const logger = this.hub.createLogger(provider.config.identifier); // this.createLoggerForModule(definition);

      const process = {
        uuid,
        provider,
        status: ProcessStatus.LOADED,
      };

      this.processes[uuid] = process;

      const result = await device.init(provider, logger);

      if (!result) {
        this.logger.error('Failed to initialize module:', definition.name);
        return false;
      }

      process.status = ProcessStatus.INITIALIZED;

      await device.start();

      process.status = ProcessStatus.RUNNING;

      return true;
    } catch (error) {
      this.logger.error('Error starting module:', definition.name, error);
      return false;
    }
  };

  startAll = async (): Promise<void> => {
    if (!this.hub.config.modules) {
      this.logger.error('No modules found in config');
      return;
    }

    const modules = this.hub.config.modules;

    for (const config of modules) {
      const module = this.definitions.find((elm) => elm.name === config.package);
      if (!module) {
        this.logger.error('Module not found:', config.package);
        continue;
      }

      await this.startProcess(module, config);
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

    this.logger.trace('Stopping:', process.provider.config.identifier);
    try {
      await process.provider.device.stop();
    } catch (error) {
      this.logger.error('Error stopping module:', process.provider.definition.name, error);
    }
    process.status = ProcessStatus.STOPPED;
  };

  data = () => {
    const result: any = {};
    result.data = [];

    for (const uuid in this.processes) {
      const process = this.processes[uuid];
      result.data.push({
        uuid: process.uuid,
        status: process.status,
        config: process.provider.config,
        definition: process.provider.definition,
      });
    }

    return result;
  };

  process = (identifier: string): Process | undefined => {
    const process = Object.values(this.processes).find((elm) => elm.provider.config.identifier === identifier);
    return process;
  };
}
