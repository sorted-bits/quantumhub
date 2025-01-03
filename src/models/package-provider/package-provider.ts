import { Attribute, Device, DeviceType, Logger, PackageConfig, Provider, PackageDefinition, BaseAttributeWithState, BaseAttribute } from 'quantumhub-sdk';
import { Hub } from '../hub';
import { ProviderMQTT } from './provider-mqtt';
import { ProviderTimeout } from './provider-timeout';
import { ProviderCache } from './provider-cache';
import { Dependency } from '../config/interfaces/dependency';

export class PackageProvider implements Provider {
  config: PackageConfig;
  hub: Hub;
  dependency: Dependency;
  device: Device;
  deviceLogger: Logger;

  providerMqtt: ProviderMQTT;
  providerTimeout: ProviderTimeout;
  providerCache: ProviderCache;

  processUUID: string;

  constructor(hub: Hub, config: PackageConfig, dependency: Dependency, device: Device, processUUID: string) {
    this.config = config;
    this.hub = hub;
    this.dependency = dependency;
    this.device = device;

    this.processUUID = processUUID;

    this.deviceLogger = this.hub.createLogger(this.config.identifier);

    this.providerMqtt = new ProviderMQTT(this, this.hub);
    this.providerTimeout = new ProviderTimeout(this);
    this.providerCache = new ProviderCache(this.hub, this);

    this.registerAttributes();

    this.providerCache.all().then((result) => {
      this.deviceLogger.info('Cache during init:', result);
    });
  }

  get cache(): ProviderCache {
    return this.providerCache;
  }

  get timeout(): ProviderTimeout {
    return this.providerTimeout;
  }

  get mqtt(): ProviderMQTT {
    return this.providerMqtt;
  }

  get logger(): Logger {
    return this.deviceLogger;
  }

  get definition(): PackageDefinition {
    return this.dependency.definition;
  }

  get mqttTopic(): string {
    return `${this.hub.config.instance_name}_${this.config.identifier}`;
  }

  getAttributes = (): Attribute[] => {
    const result = this.dependency.definition.attributes.sort((a, b) => a.key.localeCompare(b.key));

    return result;
  };

  setAttributeState = async <T extends BaseAttributeWithState>(attribute: T, state: T['stateDefinition']): Promise<void> => {
    await this.hub.state.setAttributeState(this, attribute, state);
  }

  /**
   * Sets the availability of the device and publishes the changes to MQTT
   *
   * @param {boolean} availability The availability of the device
   * @memberof PackageProvider
   */
  setAvailability = async (availability: boolean): Promise<void> => {
    return this.hub.state.setAvailability(this, availability);
  };

  /**
   * Returns the configuration of the device as defined in the configuration file
   *
   * @returns {*} The configuration of the device
   * @memberof PackageProvider
   */
  getConfig = (): any => {
    return this.config as any;
  };

  getAttribute = <T extends BaseAttribute>(name: string): T | undefined => {
    return this.dependency.definition.attributes.find((attr) => attr.key === name) as T | undefined;
  };

  restart = async (): Promise<void> => {
    this.hub.processes.restartProcess(this.processUUID);
  }

  private registerAttributes = async (): Promise<void> => {
    const attributes = this.dependency.definition.attributes;

    for (const attribute of attributes) {
      if (attribute.type !== DeviceType.sensor) {
        await this.hub.state.publishAttributeDescription(this, attribute);
      }
    }
  };
}
