import { HomeAssistantConfig } from './home-assistant-config';
import { LogConfig } from './log-config';
import { MqttConfig } from './mqtt-config';
import { PackagesConfig } from './packages-config';
import { WebConfig } from './web-config';

export interface BaseConfig {
  instance_name: string;

  web: WebConfig;
  log: LogConfig;
  mqtt: MqttConfig;
  packages: PackagesConfig;
  homeassistant: HomeAssistantConfig;
}
