import { HomeAssistantConfig } from './home-assistant';
import { LogConfig } from './log-config';
import { ModuleConfig } from './module-config';
import { MqttConfig } from './mqtt-config';

interface WebConfig {
  port: number;
}

export interface Config {
  web: WebConfig;
  log: LogConfig;
  mqtt: MqttConfig;
  paths: string[];
  modules: ModuleConfig[];
  homeassistant: HomeAssistantConfig;
}
