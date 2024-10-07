import { Dependency } from './dependency';
import { HomeAssistantConfig } from './home-assistant-config';
import { LogConfig } from './log-config';
import { MqttConfig } from './mqtt-config';
import { PackageConfig } from './packages-config';
import { StorageConfig } from './storage-config';
import { WebConfig } from './web-config';

export interface BaseConfig {
  instance_name: string;
  packages_repository: string;

  dependencies: Dependency[];

  web: WebConfig;
  log: LogConfig;
  mqtt: MqttConfig;
  storage: StorageConfig;
  packages: PackageConfig[];
  homeassistant: HomeAssistantConfig;
}
