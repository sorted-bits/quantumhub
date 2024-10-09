import { BaseConfig } from './interfaces/base-config';

export const defaultValues: BaseConfig = {
  packages_repository: 'https://repository.quantumhub.app/packages.json',
  storage: {
    file: 'storage.sqlite',
    dependencies: 'dependencies',
  },
  mqtt: {
    host: 'localhost',
    port: 1883,
    base_topic: 'quantumhub',
    username: undefined,
    password: undefined,
    protocol: 'mqtt',
    validate_certificate: true,
  },
  dependencies: [],
  homeassistant: {
    availability: true,
    base_topic: 'homeassistant',
  },
  packages: [],
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
