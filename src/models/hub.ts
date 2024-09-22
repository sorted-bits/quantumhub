import { Logger as ILogger } from 'quantumhub-sdk';
import { ConfigLoader } from './config/config-loader';
import { BaseConfig } from './config/interfaces/base-config';
import { LogConfig } from './config/interfaces/log-config';
import { Logger } from './logger/logger';
import { MQTT } from './mqtt/mqtt';
import { PackageLoader } from './package-loader/package-loader';
import { StateManager } from './state-manager/state-manager';
import { Webserver } from './webserver/webserver';

interface ConfigOptions {
  uiPath: string;
}

export class Hub {
  mqtt: MQTT;
  state: StateManager;
  packages: PackageLoader;
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

    this._config = configLoader.loadConfig(configurationFile, new Logger('ConfigLoader', this, configLoader.defaults.log));

    this.logger = this.createLogger('Hub');
    this.state = new StateManager(this);
    this.mqtt = new MQTT(this);
    this.packages = new PackageLoader(this);
    this.server = new Webserver(this);
  }

  createLogger = (name: string, config: LogConfig = this.config.log): ILogger => {
    return new Logger(name, this, config);
  };

  initialize = async (): Promise<boolean> => {
    const result = await this.server.start();
    if (!result) {
      this.logger.error('Failed to start webserver');
      return false;
    }

    this.logger.info(
      'Starting packages',
      this.config.packages.configuration.map((p) => p.name)
    );
    const scanResult = await this.packages.scanFolder(this.config.packages.root);
    if (scanResult) {
      this.logger.trace('Scanned folder:', this.config.packages);
    } else {
      return false;
    }

    this.config.packages.configuration.forEach((packageConfig) => {
      this.packages.loadPackageFromConfig(packageConfig);
    });

    await this.state.initialize();

    const mqttResult = await this.mqtt.connect(this.config.mqtt);

    if (!mqttResult) {
      return false;
    }

    await this.packages.startAll();

    return true;
  };

  stop = async (): Promise<void> => {
    await this.packages.stopAll();
    await this.state.publishBridgeAvailability(false);
    await this.server.stop();
  };
}
