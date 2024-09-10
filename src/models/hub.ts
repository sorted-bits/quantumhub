import { Logger as ILogger } from 'quantumhub-sdk';
import { ConfigLoader } from './config/config-loader';
import { BaseConfig } from './config/interfaces/base-config';
import { LogConfig } from './config/interfaces/log-config';
import { Logger } from './logger/logger';
import { ModuleLoader } from './module-loader/module-loader';
import { MQTT } from './mqtt/mqtt';
import { StateManager } from './state-manager/state-manager';

export class Hub {
  mqtt: MQTT;
  state: StateManager;
  modules: ModuleLoader;
  logger: ILogger;

  private _config: BaseConfig;

  get config(): BaseConfig {
    return this._config;
  }

  constructor(configurationFile: string) {
    const configLoader = new ConfigLoader();

    this._config = configLoader.loadConfig(configurationFile, new Logger('ConfigLoader', configLoader.defaults.log));

    this.logger = this.createLogger('Home');
    this.state = new StateManager(this);
    this.mqtt = new MQTT(this);
    this.modules = new ModuleLoader(this);
  }

  createLogger = (name: string, config: LogConfig = this.config.log): ILogger => {
    return new Logger(name, config);
  };

  initialize = async (): Promise<boolean> => {
    await this.state.initialize();

    const mqttResult = await this.mqtt.connect(this.config.mqtt);

    if (!mqttResult) {
      return false;
    }

    return true;
  };
}
