import { Attribute, Device, DeviceType, Logger, PackageConfig, Provider, PackageDefinition } from 'quantumhub-sdk';
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

  constructor(hub: Hub, config: PackageConfig, dependency: Dependency, device: Device) {
    this.config = config;
    this.hub = hub;
    this.dependency = dependency;
    this.device = device;

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

  getAttribute = (attribute: string): Attribute | undefined => {
    return this.dependency.definition?.attributes.find((attr) => attr.key === attribute);
  };

  getAttributes = (): Attribute[] => {
    const result = this.dependency.definition.attributes.sort((a, b) => a.key.localeCompare(b.key));

    return result;
  };

  /**
   * Stores the value of the attribute in the state manager and publishes the changes to MQTT
   *
   * @param {string} attribute The name of the attribute
   * @param {*} value The value of the attribute
   * @memberof PackageProvider
   */
  setAttributeValue = (attribute: string, value: any): Promise<void> => {
    this.deviceLogger.trace('Setting attribute value', attribute, value);
    return this.hub.state.setAttributeValue(this, attribute, value);
  };

  /**
   * Sets the availability of the device and publishes the changes to MQTT
   *
   * @param {boolean} availability The availability of the device
   * @memberof PackageProvider
   */
  setAvailability = async (availability: boolean): Promise<void> => {
    this.deviceLogger.trace('Setting availability to', availability);
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

  private registerAttributes = async (): Promise<void> => {
    const attributes = this.dependency.definition.attributes;

    for (const attribute of attributes) {
      if (attribute.type !== DeviceType.sensor) {
        await this.hub.state.publishAttributeDescription(this, attribute);
      }
    }
  };
}
