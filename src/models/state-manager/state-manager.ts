import { Attribute, BaseAttributeWithState, Logger } from 'quantumhub-sdk';
import { Hub } from '../hub';
import { PackageProvider } from '../package-provider/package-provider';
import { getDeviceDescriptionForAttribute } from './utils/device-description-for-attribute';
import { State } from '../database/state';

export class StateManager {
  private logger: Logger;
  //  private states: { [id: string]: { [attribute: string]: any } } = {};
  private deviceAvailability: { [id: string]: boolean } = {};
  private deviceDescriptionsPublished: string[] = [];
  private hub: Hub;

  constructor(hub: Hub) {
    this.hub = hub;
    this.logger = this.hub.createLogger('StateManager');
  }

  initialize = async (): Promise<void> => {
    this.logger.info('Initializing state manager');
  };

  getAttributes = async (provider: PackageProvider): Promise<State[]> => {
    const result = await this.hub.data.state.getAll(provider);
    this.logger.info('Attributes:', result);
    return result;
  };

  getAvailability = (provider: PackageProvider): boolean => {
    return this.deviceAvailability[provider.config.identifier];
  };

  setAvailability = async (provider: PackageProvider, availability: boolean): Promise<void> => {
    this.logger.trace('Setting availability:', provider.config.identifier, availability);

    this.deviceAvailability[provider.config.identifier] = availability;

    /* TODO: Unavailability handling needs to be fixed
    if (!availability) {
      for (const attribute of provider.definition.attributes) {
        if (attribute.unavailability_value !== undefined && !attribute.availability) {
          this.setAttributeState(provider, attribute, attribute.unavailability_value);
        }
      }
    }
    */

    await this.publishDeviceAvailability(provider, availability);
    const process = this.hub.processes.getProcess(provider.config.identifier);
    if (process) {
      this.hub.server.sendProcessUpdate(process);
    }
  };

  setAttributeState = async <T extends BaseAttributeWithState>(provider: PackageProvider, attribute: T, state: T['stateDefinition']): Promise<void> => {
    const quantumState = await this.hub.data.state.set(provider, attribute.key, state);

    this.publishAttributeDescription(provider, attribute);
    this.publishAttributeState(provider, attribute, state);

    this.hub.server.sendStateUpdate(quantumState);
  };

  publishBridgeAvailability = async (online: boolean): Promise<void> => {
    const topic = `${this.hub.config.mqtt.base_topic}/bridge/state`;
    const payload = online ? 'online' : 'offline';
    const json = JSON.stringify({ state: payload });

    this.logger.trace('Publishing bridge status:', json);
    await this.hub.mqtt.publish(topic, json);
    this.logger.trace('Bridge status published');
  };

  onMessage = async (provider: PackageProvider, attribute: Attribute, mqttData: { payload: string; topic: string }): Promise<void> => {
    const deviceDescription = getDeviceDescriptionForAttribute(this.hub, provider, attribute);

    if (!deviceDescription) {
      this.logger.warn('No device description found for:', attribute.key);
      return;
    }

    this.logger.info('Received message:', mqttData);

    deviceDescription.onMessage(mqttData).catch((error) => {
      this.logger.error('Error processing message:', error);
    });
  };

  publishAttributeDescription = async (provider: PackageProvider, attribute: Attribute): Promise<void> => {
    const descriptor = getDeviceDescriptionForAttribute(this.hub, provider, attribute);

    if (!descriptor) {
      return;
    }

    if (this.deviceDescriptionsPublished.includes(descriptor.topic)) {
      return;
    }

    this.logger.info('Publishing device description:', provider.config.name, descriptor.topic);

    if (descriptor.topic === 'homeassistant/sensor/qt_new_york_clock/random_temperature/config') {
      this.logger.info('Publishing device description:', descriptor.topic, descriptor.toJson());
    }

    await this.hub.mqtt.publish(descriptor.topic, descriptor.toJson(), true);
    this.deviceDescriptionsPublished.push(descriptor.topic);

    descriptor.registerTopics();
  };

  private publishAttributeState = async (provider: PackageProvider, attribute: BaseAttributeWithState, value: any): Promise<void> => {
    const topic = `${this.hub.config.mqtt.base_topic}/${provider.config.name}`;
    const attributeTopic = `${topic}/${attribute.key}`;

    const publishState = getDeviceDescriptionForAttribute(this.hub, provider, attribute)?.getPublishState(value);

    await this.hub.mqtt.publish(attributeTopic, JSON.stringify(publishState));

    if (this.hub.config.homeassistant.availability) {
      const availabilityTopic = `${topic}/availability`;

      await this.hub.mqtt.publish(availabilityTopic, JSON.stringify({ state: 'online' }));
    }
  };

  private publishDeviceAvailability = async (provider: PackageProvider, online: boolean): Promise<void> => {
    const topic = `${this.hub.config.mqtt.base_topic}/${provider.config.name}/availability`;
    const payload = online ? 'online' : 'offline';
    const json = JSON.stringify({ state: payload });

    this.logger.trace('Publishing device status:', json);
    await this.hub.mqtt.publish(topic, json);
    this.logger.trace('Device status published');
  };

}
