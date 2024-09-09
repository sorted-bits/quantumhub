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
      const entryPath = `${folder}/${main}`;

      const definition = new Definition(
        entryPath,
        name,
        main,
        description,
        author
      );

      definition.attributes = attributes;

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

    const loadedModule = await import(definition.path);
    const device = new loadedModule.default() as Device;
    const logger = this.createLoggerForModule(definition);
    const provider = new ModuleProvider(this.home, config, definition, device);

    const result = await device.init(provider, logger);

    if (!result) {
      this.logger.error('Failed to initialize module:', definition.name);
      return false;
    }

    const process = new Process(uuid, device, config);
    this.processes[uuid] = process;

    await device.start();

    return true;
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

  private createLoggerForModule(module: Definition): ILogger {
    return new Logger().setName(module.name);
  }
}
