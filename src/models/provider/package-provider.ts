import { Attribute, Device, DeviceType, Logger as ILogger, PackageConfig, Provider } from 'quantumhub-sdk';
import { Hub } from '../hub';
import { Definition } from '../package-loader/interfaces/definition';

export class PackageProvider implements Provider {
  config: PackageConfig;
  hub: Hub;
  definition: Definition;
  device: Device;
  deviceLogger: ILogger;

  private timeouts: NodeJS.Timeout[] = [];

  constructor(hub: Hub, config: PackageConfig, definition: Definition, device: Device) {
    this.config = config;
    this.hub = hub;
    this.definition = definition;
    this.device = device;

    this.deviceLogger = this.hub.createLogger(this.config.identifier);

    this.registerAttributes();
  }

  get logger(): ILogger {
    return this.deviceLogger;
  }

  get mqttTopic(): string {
    return `${this.hub.config.instance_name}_${this.config.identifier}`;
  }

  getAttribute = (attribute: string): Attribute | undefined => {
    return this.definition.attributes.find((attr) => attr.key === attribute);
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

  /**
   * Subscribes directly to a MQTT topic
   *
   * @param {string} topic The topic to subscribe to
   * @returns {Promise<void>}
   * @memberof PackageProvider
   */
  subscribeToTopic = (topic: string): Promise<void> => {
    this.deviceLogger.trace('Subscribing to topic', topic);
    return this.hub.mqtt.subscribeToTopic(topic, this);
  };

  /**
   * Publishes a message to a MQTT topic
   *
   * @param {string} topic The topic to publish to
   * @param {string} message The message to publish
   * @param {boolean} retain Whether the message should be retained
   * @returns {Promise<void>}
   * @memberof PackageProvider
   */
  publishToTopic = (topic: string, message: string, retain: boolean): Promise<void> => {
    this.deviceLogger.trace('Publishing to topic', topic, message);
    return this.hub.mqtt.publish(topic, message, retain);
  };

  private registerAttributes = async (): Promise<void> => {
    const attributes = this.definition.attributes;

    for (const attribute of attributes) {
      if (attribute.type !== DeviceType.sensor) {
        await this.hub.state.publishDeviceDescription(this, attribute);
      }
    }
  };

  setTimeout = (callback: () => Promise<void>, timeout: number): NodeJS.Timeout => {
    const id = setTimeout(() => {
      callback()
        .catch((error) => {
          this.deviceLogger.warn('Device crashed during setTime', error);
        })
        .finally(() => {
          this.timeouts = this.timeouts.filter((id) => id !== id);
        });
    }, timeout);

    this.timeouts.push(id);
    return id;
  };

  clearTimeout = (timeout: NodeJS.Timeout): void => {
    clearTimeout(timeout);
    this.timeouts = this.timeouts.filter((id) => id !== timeout);
  };

  clearAllTimeouts = (): void => {
    for (const timeout of this.timeouts) {
      clearTimeout(timeout);
    }

    this.timeouts = [];
  };
}
