import { Logger as ILogger } from 'quantumhub-sdk';
import { ConfigLoader } from './config/config-loader';
import { BaseConfig } from './config/interfaces/base-config';
import { LogConfig } from './config/interfaces/log-config';
import { Logger } from './logger/logger';
import { ModuleLoader } from './module-loader/module-loader';
import { MQTT } from './mqtt/mqtt';
import { StateManager } from './state-manager/state-manager';
import { Webserver } from './webserver/webserver';

interface ConfigOptions {
  publicPath: string;
}

export class Hub {
  mqtt: MQTT;
  state: StateManager;
  modules: ModuleLoader;
  logger: ILogger;
  server: Webserver;

  options: ConfigOptions;
  private _config: BaseConfig;

  get config(): BaseConfig {
    return this._config;
  }

  constructor(configurationFile: string, config: ConfigOptions) {
    const configLoader = new ConfigLoader();
    this.options = config;

    this._config = configLoader.loadConfig(configurationFile, new Logger('ConfigLoader', configLoader.defaults.log));

    this.logger = this.createLogger('Hub');
    this.state = new StateManager(this);
    this.mqtt = new MQTT(this);
    this.modules = new ModuleLoader(this);
    this.server = new Webserver(this);
  }

  createLogger = (name: string, config: LogConfig = this.config.log): ILogger => {
    return new Logger(name, config);
  };

  initialize = async (): Promise<boolean> => {
    const result = await this.server.start();
    if (!result) {
      this.logger.error('Failed to start webserver');
      return false;
    }

    this.logger.info('Starting modules', this.config.modules_path);
    const scanResult = await this.modules.scanFolder(this.config.modules_path);
    if (scanResult) {
      this.logger.trace('Scanned folder:', this.config.modules_path);
    } else {
      return false;
    }

    await this.state.initialize();

    const mqttResult = await this.mqtt.connect(this.config.mqtt);

    if (!mqttResult) {
      return false;
    }

    await this.modules.startAll();

    return true;
  };

  stop = async (): Promise<void> => {
    await this.modules.stopAll();
    await this.state.publishBridgeStatus(false);
    await this.server.stop();
  };
}
