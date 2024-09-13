import { Device, ModuleConfig, Provider } from 'quantumhub-sdk';
import { Hub } from '../../hub';
import { DeviceType } from '../enums/device-type';
import { Definition } from '../interfaces/definition';

export class ModuleProvider implements Provider {
  config: ModuleConfig;
  hub: Hub;
  definition: Definition;
  device: Device;

  constructor(hub: Hub, config: ModuleConfig, definition: Definition, device: Device) {
    this.config = config;
    this.hub = hub;
    this.definition = definition;
    this.device = device;

    this.registerAttributes();
  }

  /**
   * Stores the value of the attribute in the state manager and publishes the changes to MQTT
   *
   * @param {string} attribute The name of the attribute
   * @param {*} value The value of the attribute
   * @memberof ModuleProvider
   */
  setAttributeValue = (attribute: string, value: any): Promise<void> => {
    return this.hub.state.setAttributeValue(this, attribute, value);
  };

  /**
   * Sets the availability of the device and publishes the changes to MQTT
   *
   * @param {boolean} availability The availability of the device
   * @memberof ModuleProvider
   */
  setAvailability = async (availability: boolean): Promise<void> => {
    return this.hub.state.setAvailability(this, availability);
  };

  /**
   * Returns the configuration of the device as defined in the configuration file
   *
   * @returns {*} The configuration of the device
   * @memberof ModuleProvider
   */
  getConfig = (): any => {
    return this.config as any;
  };

  /**
   * Subscribes directly to a MQTT topic
   *
   * @param {string} topic The topic to subscribe to
   * @returns {Promise<void>}
   * @memberof ModuleProvider
   */
  subscribeToTopic = (topic: string): Promise<void> => {
    return this.hub.mqtt.subscribeToTopic(topic, this);
  };

  /**
   * Publishes a message to a MQTT topic
   *
   * @param {string} topic The topic to publish to
   * @param {string} message The message to publish
   * @param {boolean} retain Whether the message should be retained
   * @returns {Promise<void>}
   * @memberof ModuleProvider
   */
  publishToTopic = (topic: string, message: string, retain: boolean): Promise<void> => {
    return this.hub.mqtt.publish(topic, message, retain);
  };

  private registerAttributes = async (): Promise<void> => {
    const attributes = this.definition.attributes;

    for (const attribute of attributes) {
      if (attribute.type === DeviceType.device_automation || attribute.type === DeviceType.number) {
        await this.hub.state.publishDeviceDescription(this, attribute.key);
      }
    }
  };
}
