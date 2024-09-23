import { Attribute, ButtonAttribute, ClimateAttribute, DeviceAutomationAttribute, DeviceClass, DeviceType, Logger as ILogger, NumberAttribute, SceneAttribute, SelectAttribute, SwitchAttribute } from 'quantumhub-sdk';
import { Hub } from '../hub';
import { PackageProvider } from '../provider/package-provider';

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

    await this.publishDeviceAvailability(provider, availability);
  };

  setAttributeValue = async (provider: PackageProvider, attribute: string, value: any, force: boolean = false): Promise<void> => {
    const key = provider.config.identifier;

    if (!this.states[key]) {
      this.logger.trace('Creating state for:', key);
      this.states[key] = {};
    }

    const previousValue = this.states[key][attribute];

    if (previousValue === value && !force) {
      return;
    }

    this.states[key][attribute] = value;

    const definition = provider.definition.attributes.find((a) => a.key === attribute);

    if (definition) {
      this.publishDeviceDescription(provider, definition);
    }
    this.publishDeviceStates(provider);

    this.hub.server.sendStateUpdate(provider.config.identifier, attribute);
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

  publishDeviceAvailability = async (provider: PackageProvider, online: boolean): Promise<void> => {
    const topic = `${this.hub.config.mqtt.base_topic}/${provider.config.name}/availability`;
    const payload = online ? 'online' : 'offline';
    const json = JSON.stringify({ state: payload });

    this.logger.trace('Publishing device status:', json);
    await this.hub.mqtt.publish(topic, json);
    this.logger.trace('Device status published');
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
    const { payload, topic } = mqttData;
    switch (attribute.type) {
      case DeviceType.climate: {
        const stateTopic = `${this.hub.config.mqtt.base_topic}/${provider.config.name}`;
        const actionPath = topic.replace(`${stateTopic}/`, '');

        switch (actionPath) {
          case 'temperature/set': {
            const value = parseFloat(payload);
            this.setAttributeValue(provider, attribute.key, value);
            break;
          }
        }
      }
      case DeviceType.button: {
        if (provider.device.onButtonPressed) {
          provider.device.onButtonPressed(attribute as ButtonAttribute);
        } else {
          this.logger.warn('No onButtonPressed handler found on device', provider.config.identifier);
        }
        break;
      }
      case DeviceType.scene: {
        if (provider.device.onSceneTriggered) {
          provider.device.onSceneTriggered(attribute as SceneAttribute);
        } else {
          this.logger.warn('No onSceneTriggered handler found on device', provider.config.identifier);
        }
        break;
      }
      case DeviceType.switch: {
        const switchAttribute = attribute as SwitchAttribute;
        if (payload === switchAttribute.payload_on || payload === switchAttribute.payload_off) {
          const value = payload === switchAttribute.payload_on;

          if (provider.device.onSwitchChanged) {
            provider.device.onSwitchChanged(switchAttribute, value);
          } else {
            this.logger.warn('No onSwitchChanged handler found on device', provider.config.identifier);
          }

          if (switchAttribute.optimistic) {
            this.setAttributeValue(provider, attribute.key, payload);
          }
        } else {
          this.logger.error('Invalid payload:', payload);
          return;
        }

        break;
      }
      case DeviceType.select: {
        const selectAttribute = attribute as SelectAttribute;

        if (provider.device.onSelectChanged) {
          provider.device.onSelectChanged(selectAttribute, payload);
        } else {
          this.logger.warn('No onSelectChanged handler found on device', provider.config.identifier);
        }

        if (selectAttribute.optimistic) {
          this.logger.info('Setting attribute value:', attribute.key, payload);
          this.setAttributeValue(provider, attribute.key, payload);
        }
        break;
      }
      case DeviceType.number: {
        if (provider.device.onNumberChanged) {
          provider.device.onNumberChanged(attribute as NumberAttribute, parseFloat(payload));
        } else {
          this.logger.warn('No onNumberChanged handler found on device', provider.config.identifier);
        }

        break;
      }
      case DeviceType.device_automation: {
        break;
      }
    }
  };

  publishDeviceDescription = async (provider: PackageProvider, attribute: Attribute): Promise<void> => {
    const attributeIdentifier = attribute.key;
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
      case DeviceType.climate: {
        const climateAttribute = attribute as ClimateAttribute;

        delete config.state_topic;
        delete config.value_template;

        config.current_temperature_topic = `${stateTopic}`;
        config.current_temperature_template = `{{ value_json.current_temperature }}`;

        config.temperature_command_topic = `${stateTopic}/temperature/set`;
        config.temperature_state_topic = `${stateTopic}`;
        config.temperature_state_template = `{{ value_json.target_temperature }}`;

        if (climateAttribute.has_fanmode) {
          config.fan_mode_command_topic = `${stateTopic}/fan_mode/set`;
          config.fan_mode_state_topic = `${stateTopic}`;
          config.fan_mode_state_template = `{{ value_json.fan_mode }}`;
        }

        if (climateAttribute.has_swingmode) {
          config.swing_mode_command_topic = `${stateTopic}/swing_mode/set`;
          config.swing_mode_state_topic = `${stateTopic}`;
          config.swing_mode_state_template = `{{ value_json.swing_mode }}`;
        }

        if (climateAttribute.has_presetmode) {
          config.preset_mode_command_topic = `${stateTopic}/preset_mode/set`;
          config.preset_mode_state_topic = `${stateTopic}`;
          config.preset_mode_value_template = `{{ value_json.preset_mode }}`;
        }

        if (climateAttribute.has_humidity_control) {
          config.current_humidity_topic = `${stateTopic}`;
          config.current_humidity_template = `{{ value_json.current_humidity }}`;
          config.target_humidity_command_topic = `${stateTopic}/target_humidity/set`;
        }
        /*
        config.mode_command_topic = `${stateTopic}/mode/set`;
        config.power_command_topic = `${stateTopic}/power/set`;
        config.temperature_high_command_topic = `${stateTopic}/temperature_high/set`;
        config.temperature_low_command_topic = `${stateTopic}/temperature_low/set`;

        config.mode_state_topic = `${stateTopic}`;
        config.mode_state_template = `{{ value_json.mode }}`;
*/

        config.min_temp = 1;
        config.max_temp = 32;
        config.temp_step = 0.5;

        this.logger.info('Current humidity template:', config.current_humidity_template);
        break;
      }
      case DeviceType.device_tracker: {
        /* We don't need these for device_tracker */
        delete config.state_topic;
        delete config.value_template;

        config.json_attributes_template = `{{ value_json.${attributeIdentifier} | tojson }}`;
        config.json_attributes_topic = `${stateTopic}`;
        break;
      }
      case DeviceType.scene: {
        const sceneAttribute = attribute as SceneAttribute;
        config.command_topic = `${stateTopic}/${attribute.key}/set`;
        config.payload_on = sceneAttribute.payload_on;

        this.hub.mqtt.subscribeToAttribute(provider, attribute, config.command_topic);
        break;
      }
      case DeviceType.button: {
        const buttonAttribute = attribute as ButtonAttribute;
        config.command_topic = `${stateTopic}/${attribute.key}/set`;
        config.payload_press = buttonAttribute.payload_press;

        this.hub.mqtt.subscribeToAttribute(provider, attribute, config.command_topic);
        break;
      }
      case DeviceType.select: {
        const deviceAttribute = attribute as SelectAttribute;

        const commandTopic = `${stateTopic}/${attribute.key}/set`;
        config.command_topic = commandTopic;
        config.options = deviceAttribute.options;

        this.hub.mqtt.subscribeToAttribute(provider, attribute, commandTopic);
        break;
      }
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

        config.payload_on = switchAttribute.payload_on;
        config.payload_off = switchAttribute.payload_off;

        config.state_on = switchAttribute.payload_on;
        config.state_off = switchAttribute.payload_off;

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
