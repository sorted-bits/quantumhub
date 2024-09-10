import fs from 'fs';
import path from 'path';
import { v4 } from 'uuid';
import YAML from 'yaml';

import { Logger as ILogger } from 'quantumhub-sdk';

import { Home } from '../../home';
import { Attribute } from './models/attribute';
import { Definition } from './models/definition';
import { Process } from './models/process';

import { Device } from 'quantumhub-sdk';
import { Logger } from '../../logger/logger';
import { ModuleProvider } from './models/module-provider';
import { Status } from './models/status';

export class ModuleManager {
  private folders: string[] = [];
  private definitions: Definition[] = [];
  private logger: ILogger;
  private processes: { [id: string]: Process } = {};
  private home: Home;

  constructor(home: Home) {
    this.home = home;
    this.logger = new Logger().setName('ModuleManager');
  }

  async scanFolder(inputFolder: string): Promise<boolean> {
    const folder = path.resolve(inputFolder);

    if (!fs.existsSync(folder)) {
      this.logger.error('Folder does not exist:', folder);
      return false;
    }

    if (!this.folders.includes(folder)) {
      this.logger.info('Adding folder:', folder);
      this.folders.push(folder);
    }

    const files = fs
      .readdirSync(folder)
      .filter((elm) => elm.match(/package\.json$/gi));

    for (const file of files) {
      const packageJson = `${folder}/${file}`;

      const output = await this.readPackage(packageJson);
      const { name, main, description, author } = output;

      const attributes = this.readAttributes(`${folder}/attributes.yaml`);
      const path = `${folder}/${main}`;

      const definition: Definition = {
        path,
        name,
        main,
        description,
        author,
        attributes,
      };

      this.logger.info('Loaded module definition:', definition.name);
      this.definitions.push(definition);
    }

    return true;
  }

  async readPackage(filename: string): Promise<any> {
    const content = fs.readFileSync(filename, 'utf8');
    const output = JSON.parse(content);

    return output;
  }

  readAttributes(filename: string): Attribute[] {
    const result: Attribute[] = [];

    const content = fs.readFileSync(filename, 'utf8');
    const output = YAML.parse(content, {});

    for (const key in output) {
      const data = output[key];
      const {
        name,
        type,
        device_class,
        unit_of_measurement,
        state_class,
        optimistic,
        on,
        off,
      } = data;

      const attribute: Attribute = {
        identifier: key,
        name,
        type,
        device_class: device_class,
        unit: unit_of_measurement,
        optimistic,
        on,
        off,
      };

      if (state_class) {
        attribute.state_class = state_class;
      }

      this.logger.info('Loaded attribute:', attribute);

      result.push(attribute);
    }
    return result;
  }

  async startProcess(definition: Definition, config: any): Promise<boolean> {
    const uuid = v4();
    this.logger.info(
      'Instantiating module:',
      definition.name,
      'with config',
      JSON.stringify(config)
    );

    try {
      const loadedModule = await import(definition.path);
      const device = new loadedModule.default() as Device;
      const logger = this.createLoggerForModule(definition);
      const provider = new ModuleProvider(
        this.home,
        config,
        definition,
        device
      );

      const process = new Process(uuid, provider);
      this.processes[uuid] = process;
      process.status = Status.LOADED;

      const result = await device.init(provider, logger);

      if (!result) {
        this.logger.error('Failed to initialize module:', definition.name);
        return false;
      }

      process.status = Status.INITIALIZED;

      await device.start();

      process.status = Status.RUNNING;

      return true;
    } catch (error) {
      this.logger.error('Error starting module:', definition.name, error);
      return false;
    }
  }

  async startAll(): Promise<void> {
    if (!this.home.config.modules) {
      this.logger.error('No modules found in config');
      return;
    }

    const modules = this.home.config.modules;

    for (const config of modules) {
      const module = this.definitions.find(
        (elm) => elm.name === config.package
      );
      if (!module) {
        this.logger.error('Module not found:', config.package);
        continue;
      }

      await this.startProcess(module, config);
    }
  }

  async stopAll(): Promise<void> {
    this.logger.info('Stopping all processes', Object.keys(this.processes));

    for (const uuid in this.processes) {
      this.logger.info('Stopping process:', uuid);
      await this.stopProcess(uuid);
    }
  }

  async stopProcess(uuid: string): Promise<void> {
    const process = this.processes[uuid];
    if (!process) {
      this.logger.error('Process not found:', uuid);
      return;
    }

    this.logger.info('Stopping:', process.provider.definition.name);
    try {
      await process.provider.device.stop();
    } catch (error) {
      this.logger.error(
        'Error stopping module:',
        process.provider.definition.name,
        error
      );
    }
    process.status = Status.STOPPED;
  }

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

  process(identifier: string): Process | undefined {
    const process = Object.values(this.processes).find(
      (elm) => elm.provider.config.identifier === identifier
    );
    return process;
  }

  private createLoggerForModule(module: Definition): ILogger {
    return new Logger().setName(module.name);
  }
}
