import { Logger as ILogger } from 'quantumhub-sdk';
import { Home } from '../../home';
import { Attribute } from '../module-manager/models/attribute';
import { DeviceClass } from '../module-manager/models/device-class';
import { DeviceType } from '../module-manager/models/device-type';
import { ModuleProvider } from '../module-manager/models/module-provider';

export interface ProviderAttribute {
  provider: ModuleProvider;
  attribute: Attribute;
}

export class StateManager {
  private logger: ILogger;
  private states: { [id: string]: { [attribute: string]: any } } = {};
  private deviceAvailability: { [id: string]: boolean } = {};
  private deviceDescriptionsPublished: string[] = [];
  private home: Home;

  private subscriptions: { [topic: string]: ProviderAttribute[] } = {};

  constructor(home: Home) {
    this.home = home;
    this.logger = this.home.createLogger('StateManager');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing state manager');
  }

  getAttributes(provider: ModuleProvider): { [attribute: string]: any } {
    return this.states[provider.config.identifier];
  }

  async setAvailability(provider: ModuleProvider, availability: boolean): Promise<void> {
    this.deviceAvailability[provider.config.identifier] = availability;

    //    this.publishDeviceStates(provider);
  }

  async setAttributeValue(
    provider: ModuleProvider,
    attribute: string,
    value: any,
    force: boolean = false
  ): Promise<void> {
    const attributeDefinition = provider.definition.attributes.find((a) => a.identifier === attribute);

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
  }

  async publishDeviceStates(provider: ModuleProvider): Promise<void> {
    const state = this.states[provider.config.identifier];
    if (!state) {
      this.logger.error('State not found for:', provider.config.identifier);
      return;
    }

    const topic = `${this.home.config.mqtt.base_topic}/${provider.config.name}`;
    await this.home.mqtt.publish(topic, JSON.stringify(state));

    if (this.home.config.homeassistant.availability) {
      const availabilityTopic = `${topic}/availability`;

      await this.home.mqtt.publish(availabilityTopic, JSON.stringify({ state: 'online' }));
    }
  }

  async publishBridgeStatus(online: boolean): Promise<void> {
    const topic = `${this.home.config.mqtt.base_topic}/bridge/state`;
    const payload = online ? 'online' : 'offline';
    const json = JSON.stringify({ state: payload });

    this.logger.trace('Publishing bridge status:', json);
    await this.home.mqtt.publish(topic, json);
    this.logger.trace('Bridge status published');
  }

  async subscribeToAttribute(provider: ModuleProvider, attribute: Attribute, topic: string): Promise<void> {
    if (!this.subscriptions[topic]) {
      this.subscriptions[topic] = [];
      this.home.mqtt.subscribe(topic);
    }

    this.subscriptions[topic].push({ provider, attribute: attribute });
  }

  async onMessage(topic: string, message: Buffer): Promise<void> {
    const payload = message.toString();

    if (topic === `${this.home.config.mqtt.base_topic}/bridge/state`) {
      return;
    }

    if (!this.subscriptions[topic]) {
      this.logger.error('No subscriptions for topic:', topic);
      return;
    }

    this.subscriptions[topic].forEach((subscription) => {
      const { provider, attribute } = subscription;

      switch (attribute.type) {
        case DeviceType.switch: {
          if (payload === attribute.on || payload === attribute.off) {
            provider.device.valueChanged(attribute.identifier, payload);

            if (attribute.optimistic) {
              this.setAttributeValue(provider, attribute.identifier, payload);
            }
          } else {
            this.logger.error('Invalid payload:', payload);
            return;
          }

          break;
        }
      }
    });
  }

  async publishDeviceDescription(provider: ModuleProvider, attributeIdentifier: string): Promise<void> {
    const attribute = provider.definition.attributes.find((a) => a.identifier === attributeIdentifier);

    if (!attribute) {
      this.logger.error('Definition not found for:', attribute);
      return;
    }

    const topic = `${this.home.config.homeassistant.base_topic}/${attribute.type}/${provider.config.identifier}/${attributeIdentifier}/config`;

    if (this.deviceDescriptionsPublished.includes(topic)) {
      return;
    }

    const stateTopic = `${this.home.config.mqtt.base_topic}/${provider.config.name}`;

    const config = {
      ...this.bridgeAvailabilityAttribute(),
      ...this.deviceDetailsAttribute(provider),

      enabled_by_default: true,
      name: attribute.name,
      object_id: `${provider.config.identifier}_${attributeIdentifier}`,

      ...this.originAttribute(),

      state_topic: stateTopic,
      unique_id: `${provider.config.identifier}_${attributeIdentifier}`,
      value_template: `{{ value_json.${attributeIdentifier} }}`,
    };

    if (attribute.type === DeviceType.switch) {
      const commandTopic = `${stateTopic}/set`;
      config.command_topic = commandTopic;

      config.payload_on = attribute.on;
      config.payload_off = attribute.off;

      config.state_on = attribute.on;
      config.state_off = attribute.off;

      this.subscribeToAttribute(provider, attribute, commandTopic);

      this.home.mqtt.subscribe(commandTopic);
    }

    if (attribute.device_class && attribute.device_class !== DeviceClass.none) {
      config.device_class = attribute.device_class;
    }

    if (attribute.unit) {
      config.unit_of_measurement = attribute.unit;
    }

    if (attribute.state_class) {
      config.state_class = attribute.state_class;
    }

    this.logger.trace('Publishing device description:', topic);

    await this.home.mqtt.publish(topic, JSON.stringify(config));

    this.deviceDescriptionsPublished.push(topic);
  }

  private deviceDetailsAttribute(provider: ModuleProvider): any {
    return {
      device: {
        identifiers: [provider.config.identifier],
        manufacturer: provider.definition.author ?? 'QuantumHub',
        name: provider.config.name,
      },
    };
  }

  private bridgeAvailabilityAttribute(): any {
    return {
      availability: [
        {
          topic: `${this.home.config.mqtt.base_topic}/bridge/state`,
          value_template: '{{ value_json.state }}',
        },
      ],
    };
  }

  private originAttribute(): any {
    return {
      origin: {
        name: 'QuantumHub',
        sw: '1.0.0',
        url: 'https://quantumhub.app',
      },
    };
  }
}
