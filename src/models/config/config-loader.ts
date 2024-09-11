import fs from 'fs';
import { Logger as ILogger } from 'quantumhub-sdk';
import YAML from 'yaml';

import { BaseConfig } from './interfaces/base-config';

export class ConfigLoader {
  loadConfig = (file: string, logger: ILogger): BaseConfig => {
    try {
      const defaults = this.defaults;

      if (!fs.existsSync(file)) {
        logger.error('Config file does not exist, loading defaults:', file);
        return defaults;
      }

      const content = fs.readFileSync(file, 'utf8');
      const output = YAML.parse(content, {});

      const result = {
        mqtt: {
          ...defaults.mqtt,
          ...output.mqtt,
        },
        homeassistant: {
          ...defaults.homeassistant,
          ...output.homeassistant,
        },
        instance_name: output.instance_name || defaults.instance_name,
        modules: [...defaults.modules, ...output.modules],
        modules_path: output.modules_path || defaults.modules_path,
        web: {
          ...defaults.web,
          ...output.web,
        },
        log: {
          ...defaults.log,
          ...output.log,
        },
      };

      logger.trace('Read config file:', result);
      return result;
    } catch (err) {
      logger.error('Error reading config file:', err);
      throw new Error('Error reading config file');
    }
  };

  get defaults(): BaseConfig {
    const defaultValues: BaseConfig = {
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
      modules_path: 'modules',
      instance_name: 'quantumhub',
      web: {
        port: 3000,
      },
      log: {
        level: 'INFO',
        excluded_modules: [],
        included_modules: [],
      },
    };

    return defaultValues;
  }
}
