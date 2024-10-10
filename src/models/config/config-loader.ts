import fs from 'fs';
import { Logger } from 'quantumhub-sdk';
import YAML from 'yaml';

import { defaultValues } from './defaults';
import { BaseConfig } from './interfaces/base-config';

export class ConfigLoader {
  loadConfig = (file: string, logger: Logger): BaseConfig => {

    let yaml: any;
    const defaults = defaultValues;

    if (!fs.existsSync(file)) {
      logger.error('Config file does not exist, loading defaults:', file);
      return defaults;
    }

    try {
      const content = fs.readFileSync(file, 'utf8');
      yaml = YAML.parse(content, {});
    } catch (err) {
      logger.error('Error reading config file:', err);
      throw new Error('Error reading config file');
    }

    const result: BaseConfig = {
      storage: {
        ...defaults.storage,
        ...yaml.storage,
      },
      mqtt: {
        ...defaults.mqtt,
        ...yaml.mqtt,
      },
      homeassistant: {
        ...defaults.homeassistant,
        ...yaml.homeassistant,
      },
      packages_repository: yaml.packages_repository || defaults.packages_repository,
      instance_name: yaml.instance_name || defaults.instance_name,
      dependencies: yaml.dependencies || defaults.dependencies,
      packages: yaml.packages || defaults.packages,
      web: {
        ...defaults.web,
        ...yaml.web,
      },
      log: {
        ...defaults.log,
        ...yaml.log,
      },
    };

    logger.trace('Read config file:', result);
    return result;
  };
}
