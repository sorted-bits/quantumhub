import { HomeAssistantConfig } from './home-assistant-config';
import { LogConfig } from './log-config';
import { ModuleConfig } from './module-config';
import { MqttConfig } from './mqtt-config';
import { WebConfig } from './web-config';

export interface BaseConfig {
  modules_path: string;

  web: WebConfig;
  log: LogConfig;
  mqtt: MqttConfig;
  modules: ModuleConfig[];
  homeassistant: HomeAssistantConfig;
}
