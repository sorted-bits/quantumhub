import { HomeAssistantConfig } from './home-assistant';
import { ModuleConfig } from './module-config';
import { MqttConfig } from './mqtt-config';

interface WebConfig {
  port: number;
}

export interface Config {
  web: WebConfig;
  mqtt: MqttConfig;
  paths: string[];
  modules: ModuleConfig[];
  homeassistant: HomeAssistantConfig;
}
