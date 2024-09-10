import fs from 'fs';
import YAML from 'yaml';

import { Logger as ILogger } from 'quantumhub-sdk';

import { Home } from '../../home';
import { Config } from './config/config';

export class ConfigurationManager {
  private configPath: string;
  private config?: Config;
  private logger: ILogger;
  private home: Home;

  constructor(home: Home, configPath: string) {
    this.home = home;
    this.logger = this.home.createLogger('ConfigurationManager', this.defaults().log);
    this.configPath = configPath;
  }

  get configuration(): Config {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config;
  }

  initialize(): boolean {
    try {
      const content = fs.readFileSync(this.configPath, 'utf8');
      const output = YAML.parse(content, {});

      const defaults = this.defaults();

      this.config = {
        mqtt: {
          ...defaults.mqtt,
          ...output.mqtt,
        },
        homeassistant: {
          ...defaults.homeassistant,
          ...output.homeassistant,
        },
        modules: [...defaults.modules, ...output.modules],
        paths: [...defaults.paths, ...output.paths],
        web: {
          ...defaults.web,
          ...output.web,
        },
        log: {
          ...defaults.log,
          ...output.log,
        },
      };

      this.logger.trace('Read config file:', this.config);

      return true;
    } catch (err) {
      this.logger.error('Error reading config file:', err);
      return false;
    }
  }

  private defaults(): Config {
    const defaultValues: Config = {
      mqtt: {
        host: 'localhost',
        port: 1883,
        base_topic: 'quantumhub',
        username: undefined,
        password: undefined,
        protocol: 'mqtt',
        validate_certificate: true,
      },
      homeassistant: {
        availability: true,
        base_topic: 'homeassistant',
      },
      modules: [],
      paths: [],
      web: {
        port: 3000,
      },
      log: {
        level: 'INFO',
        excluded_modules: [],
      },
    };

    return defaultValues;
  }
}
