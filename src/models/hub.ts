import { Logger as ILogger } from 'quantumhub-sdk';
import { ConfigLoader } from './config/config-loader';
import { defaultValues } from './config/defaults';
import { BaseConfig } from './config/interfaces/base-config';
import { LogConfig } from './config/interfaces/log-config';
import { Logger } from './logger/logger';
import { MQTT } from './mqtt/mqtt';
import { PackageLoader } from './package-loader/package-loader';
import { StateManager } from './state-manager/state-manager';
import { Webserver } from './webserver/webserver';
import { QuantumData } from './database/data';

interface ConfigOptions {
  uiPath: string;
}

export class Hub {
  mqtt: MQTT;
  state: StateManager;
  packages: PackageLoader;
  logger: ILogger;
  server: Webserver;
  data: QuantumData;
  options: ConfigOptions;
  private _config: BaseConfig;

  get config(): BaseConfig {
    return this._config;
  }

  constructor(configurationFile: string, config: ConfigOptions) {
    const configLoader = new ConfigLoader();
    this.options = config;

    this._config = configLoader.loadConfig(configurationFile, new Logger('ConfigLoader', this, defaultValues.log));

    this.logger = this.createLogger('Hub');
    this.state = new StateManager(this);
    this.mqtt = new MQTT(this);
    this.packages = new PackageLoader(this);
    this.server = new Webserver(this);

    this.data = new QuantumData(this, this._config.storage);
  }

  createLogger = (name: string, config: LogConfig = this.config.log): ILogger => {
    return new Logger(name, this, config);
  };

  initialize = async (): Promise<boolean> => {
    await this.data.initialize();

    const result = await this.server.start();
    if (!result) {
      this.logger.error('Failed to start webserver');
      return false;
    }

    const mqttResult = await this.mqtt.connect(this.config.mqtt);

    if (!mqttResult) {
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

    try {
      await this.packages.startAll();
    } catch (error) {
      this.logger.error('Error starting packages', error);
      return false;
    }

    return true;
  };

  stop = async (): Promise<void> => {
    await this.packages.stopAll();
    await this.state.publishBridgeAvailability(false);
    await this.server.stop();
  };
}
