import fs from 'fs';
import { Logger } from 'quantumhub-sdk';
import YAML from 'yaml';

import { defaultValues } from './defaults';
import { BaseConfig } from './interfaces/base-config';

export class ConfigLoader {
  loadConfig = (file: string, logger: Logger): BaseConfig => {
    try {
      const defaults = defaultValues;

      if (!fs.existsSync(file)) {
        logger.error('Config file does not exist, loading defaults:', file);
        return defaults;
      }

      const content = fs.readFileSync(file, 'utf8');
      const output = YAML.parse(content, {});

      const result: BaseConfig = {
        storage: {
          ...defaults.storage,
          ...output.storage,
        },
        mqtt: {
          ...defaults.mqtt,
          ...output.mqtt,
        },
        homeassistant: {
          ...defaults.homeassistant,
          ...output.homeassistant,
        },
        packages_repository: output.packages_repository || defaults.packages_repository,
        instance_name: output.instance_name || defaults.instance_name,
        dependencies: output.dependencies || defaults.dependencies,
        packages: output.packages || defaults.packages,
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
}
