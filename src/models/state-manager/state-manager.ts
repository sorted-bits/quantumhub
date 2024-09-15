import { Logger as ILogger } from 'quantumhub-sdk';
import { Hub } from '../hub';
import { DeviceClass } from '../package-loader/enums/device-class';
import { DeviceType } from '../package-loader/enums/device-type';
import { Attribute, DeviceAutomationAttribute, NumberAttribute, SwitchAttribute } from '../package-loader/interfaces/attribute';
import { PackageProvider } from '../package-loader/models/package-provider';

export class StateManager {
  private logger: ILogger;
  private states: { [id: string]: { [attribute: string]: any } } = {};
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

  getAttributes = (provider: PackageProvider): { [attribute: string]: any } => {
    return this.states[provider.config.identifier];
  };

  setAvailability = async (provider: PackageProvider, availability: boolean): Promise<void> => {
    this.logger.trace('Setting availability:', provider.config.identifier, availability);

    this.deviceAvailability[provider.config.identifier] = availability;

    await this.publishDeviceStatus(provider, availability);
  };

  setAttributeValue = async (provider: PackageProvider, attribute: string, value: any, force: boolean = false): Promise<void> => {
    const attributeDefinition = provider.definition.attributes.find((a) => a.key === attribute);

    if (!attributeDefinition) {
      this.logger.error('Attribute not found:', attribute);
      return;
    }

    const key = provider.config.identifier; //device.config.identifier;

    if (!this.states[key]) {
      this.logger.trace('Creating state for:', key);
      this.states[key] = {};
    }

    const previousValue = this.states[key][attribute];

    if (previousValue === value && !force) {
      return;
    }

    this.states[key][attribute] = value;

    this.publishDeviceDescription(provider, attribute);
    this.publishDeviceStates(provider);
  };

  publishDeviceStates = async (provider: PackageProvider): Promise<void> => {
    const state = this.states[provider.config.identifier];
    if (!state) {
      this.logger.error('State not found for:', provider.config.identifier);
      return;
    }

    const topic = `${this.hub.config.mqtt.base_topic}/${provider.config.name}`;
    await this.hub.mqtt.publish(topic, JSON.stringify(state));

    if (this.hub.config.homeassistant.availability) {
      const availabilityTopic = `${topic}/availability`;

      await this.hub.mqtt.publish(availabilityTopic, JSON.stringify({ state: 'online' }));
    }
  };

  publishDeviceStatus = async (provider: PackageProvider, online: boolean): Promise<void> => {
    const topic = `${this.hub.config.mqtt.base_topic}/${provider.config.name}/availability`;
    const payload = online ? 'online' : 'offline';
    const json = JSON.stringify({ state: payload });

    this.logger.trace('Publishing device status:', json);
    await this.hub.mqtt.publish(topic, json);
    this.logger.trace('Device status published');
  };

  publishBridgeStatus = async (online: boolean): Promise<void> => {
    const topic = `${this.hub.config.mqtt.base_topic}/bridge/state`;
    const payload = online ? 'online' : 'offline';
    const json = JSON.stringify({ state: payload });

    this.logger.trace('Publishing bridge status:', json);
    await this.hub.mqtt.publish(topic, json);
    this.logger.trace('Bridge status published');
  };

  onMessage = async (provider: PackageProvider, attribute: Attribute, payload: string): Promise<void> => {
    switch (attribute.type) {
      case DeviceType.switch: {
        const switchAttribute = attribute as SwitchAttribute;
        if (payload === switchAttribute.on || payload === switchAttribute.off) {
          provider.device.valueChanged(attribute.key, payload);

          if (switchAttribute.optimistic) {
            this.setAttributeValue(provider, attribute.key, payload);
          }
        } else {
          this.logger.error('Invalid payload:', payload);
          return;
        }

        break;
      }
      case DeviceType.number: {
        provider.device.valueChanged(attribute.key, parseFloat(payload));

        break;
      }
      case DeviceType.device_automation: {
        this.logger.info('Device automation not implemented', payload);
        break;
      }
    }
  };

  publishDeviceDescription = async (provider: PackageProvider, attributeIdentifier: string): Promise<void> => {
    const attribute = provider.definition.attributes.find((a) => a.key === attributeIdentifier);

    if (!attribute) {
      this.logger.error('Definition not found for:', attribute);
      return;
    }

    const topic = `${this.hub.config.homeassistant.base_topic}/${attribute.type}/${provider.config.identifier}/${attributeIdentifier}/config`;

    if (this.deviceDescriptionsPublished.includes(topic)) {
      return;
    }

    this.logger.trace('Publishing device description:', topic);

    const stateTopic = `${this.hub.config.mqtt.base_topic}/${provider.config.name}`;

    const config = {
      ...this.availabilityAttributes(provider),
      ...this.deviceDetailsAttribute(provider),

      enabled_by_default: true,
      name: attribute.name,
      object_id: `${provider.config.identifier}_${attributeIdentifier}`,

      ...this.originAttribute(),

      state_topic: stateTopic,
      unique_id: `${provider.config.identifier}_${attributeIdentifier}`,
      value_template: `{{ value_json.${attributeIdentifier} }}`,
    };

    switch (attribute.type) {
      case DeviceType.number: {
        const numberAttribute = attribute as NumberAttribute;

        const commandTopic = `${stateTopic}/${attribute.key}/set`;
        config.command_topic = commandTopic;
        config.step = numberAttribute.step;
        config.min = numberAttribute.min;
        config.max = numberAttribute.max;

        this.hub.mqtt.subscribeToAttribute(provider, attribute, commandTopic);
        break;
      }
      case DeviceType.device_automation: {
        const deviceAutomationAttribute = attribute as DeviceAutomationAttribute;
        const commandTopic = `${stateTopic}/action`;
        config.type = 'action';
        config.sub_type = 'device_automation';
        config.payload = deviceAutomationAttribute.payload;
        config.topic = commandTopic;

        this.hub.mqtt.subscribeToAttribute(provider, attribute, commandTopic);
        break;
      }
      case DeviceType.switch: {
        const switchAttribute = attribute as SwitchAttribute;
        const commandTopic = `${stateTopic}/${attribute.key}/set`;
        config.command_topic = commandTopic;

        config.payload_on = switchAttribute.on;
        config.payload_off = switchAttribute.off;

        config.state_on = switchAttribute.on;
        config.state_off = switchAttribute.off;

        this.hub.mqtt.subscribeToAttribute(provider, attribute, commandTopic);
        break;
      }
    }

    if (attribute.device_class && attribute.device_class !== DeviceClass.none) {
      config.device_class = attribute.device_class;
    }

    if (attribute.unit_of_measurement) {
      config.unit_of_measurement = attribute.unit_of_measurement;
    }

    if (attribute.state_class) {
      config.state_class = attribute.state_class;
    }

    this.logger.trace('Publishing device description:', topic);

    await this.hub.mqtt.publish(topic, JSON.stringify(config));

    this.deviceDescriptionsPublished.push(topic);
  };

  private deviceDetailsAttribute = (provider: PackageProvider): any => {
    return {
      device: {
        identifiers: [provider.config.identifier],
        manufacturer: provider.definition.author ?? 'QuantumHub',
        name: provider.config.name,
      },
    };
  };

  private availabilityAttributes = (provider: PackageProvider): any => {
    const deviceAvailabilityTopic = `${this.hub.config.mqtt.base_topic}/${provider.config.name}/availability`;
    return {
      availability: [
        {
          topic: `${this.hub.config.mqtt.base_topic}/bridge/state`,
          value_template: '{{ value_json.state }}',
        },
        {
          topic: deviceAvailabilityTopic,
          value_template: '{{ value_json.state }}',
        },
      ],
    };
  };

  private originAttribute = (): any => {
    return {
      origin: {
        name: 'QuantumHub',
        sw: '1.0.0',
        url: 'https://quantumhub.app',
      },
    };
  };
}
