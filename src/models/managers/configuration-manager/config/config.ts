import { HomeAssistantConfig } from './home-assistant';
import { LogConfig } from './log-config';
import { ModuleConfig } from './module-config';
import { MqttConfig } from './mqtt-config';

interface WebConfig {
  port: number;
}

export interface Config {
  modules_path: string;

  web: WebConfig;
  log: LogConfig;
  mqtt: MqttConfig;
  modules: ModuleConfig[];
  homeassistant: HomeAssistantConfig;
}
