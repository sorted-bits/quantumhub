import { Logger as ILogger } from 'quantumhub-sdk';
import { ConfigLoader } from './config/config-loader';
import { defaultValues } from './config/defaults';
import { BaseConfig } from './config/interfaces/base-config';
import { LogConfig } from './config/interfaces/log-config';
import { Logger } from './logger/logger';
import { MQTT } from './mqtt/mqtt';
import { StateManager } from './state-manager/state-manager';
import { Webserver } from './webserver/webserver';
import { QuantumData } from './database/data';
import { ProcessManager } from './process-manager/process-manager';
import { DependencyManager } from './dependency-manager/dependency-manager';

interface ConfigOptions {
  uiPath: string;
}

export class Hub {
  mqtt: MQTT;
  state: StateManager;
  logger: ILogger;
  server: Webserver;
  data: QuantumData;
  options: ConfigOptions;
  processes: ProcessManager;
  dependencyManager: DependencyManager;
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
    this.server = new Webserver(this);

    this.dependencyManager = new DependencyManager(this);

    this.processes = new ProcessManager(this);

    this.data = new QuantumData(this, this._config.storage);
  }

  createLogger = (name: string, config: LogConfig = this.config.log): ILogger => {
    return new Logger(name, this, config);
  };

  initialize = async (): Promise<boolean> => {
    await this.data.initialize();

    const result = await this.server.start();
    if (!result) {
      this.logger.fatal('Failed to start webserver');
      return false;
    }

    const mqttResult = await this.mqtt.connect(this.config.mqtt);
    if (!mqttResult) {
      this.logger.fatal('Failed to connect to MQTT');
      return false;
    }

    await this.state.initialize();
    const dependencyResult = await this.dependencyManager.initialize();
    if (!dependencyResult) {
      this.logger.fatal('Failed to initialize dependencies');
      return false;
    }

    await this.processes.startAll();

    return true;
  };

  stop = async (): Promise<void> => {
    await this.processes.stopAll();
    await this.state.publishBridgeAvailability(false);
    await this.mqtt.disconnect();
    await this.server.stop();
  };
}
