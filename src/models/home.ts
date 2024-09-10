import { Logger as ILogger } from 'quantumhub-sdk';
import { Logger } from './logger/logger';
import { Config } from './managers/configuration-manager/config/config';
import { LogConfig } from './managers/configuration-manager/config/log-config';
import { ConfigurationManager } from './managers/configuration-manager/configuration-manager';
import { ModuleManager } from './managers/module-manager/module-manager';
import { MQTT } from './managers/mqtt/mqtt';
import { StateManager } from './managers/state-manager/state-manager';

export class Home {
  configurationManager: ConfigurationManager;
  mqtt: MQTT;
  state: StateManager;
  modules: ModuleManager;
  logger: ILogger;

  get config(): Config {
    return this.configurationManager.configuration;
  }

  constructor(configurationFile: string) {
    this.configurationManager = new ConfigurationManager(this, configurationFile);
    const configResult = this.configurationManager.initialize();

    if (!configResult) {
      throw new Error('Failed to initialize configuration');
    }

    this.logger = this.createLogger('Home');
    this.state = new StateManager(this);
    this.mqtt = new MQTT(this);
    this.modules = new ModuleManager(this);
  }

  createLogger(name: string, config: LogConfig = this.config.log): ILogger {
    return new Logger(name, config);
  }

  async initialize(): Promise<boolean> {
    await this.state.initialize();

    const mqttResult = await this.mqtt.connect(this.config.mqtt);

    if (!mqttResult) {
      return false;
    }

    return true;
  }
}
