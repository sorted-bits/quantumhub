import { BaseConfig } from './interfaces/base-config';

export const defaultValues: BaseConfig = {
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
  packages: {
    root: 'packages',
    configuration: [],
  },
  instance_name: 'quantumhub',
  web: {
    port: 3000,
  },
  log: {
    level: 'INFO',
    excluded_packages: [],
    included_packages: [],
  },
};
