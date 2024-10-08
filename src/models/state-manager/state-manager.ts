import { DateTime } from 'luxon';
import { Attribute, ButtonAttribute, ClimateAttribute, DeviceAutomationAttribute, DeviceClass, DeviceTrackerAttribute, DeviceType, Logger, NumberAttribute, SceneAttribute, SelectAttribute, SwitchAttribute } from 'quantumhub-sdk';
import { Hub } from '../hub';
import { PackageProvider } from '../package-provider/package-provider';
import { BaseAttributeDescription } from './attribute-descriptions/base-attribute-description';
import { ClimateAttributeDescription } from './attribute-descriptions/climate-description';
import { DeviceTrackerDescription } from './attribute-descriptions/device-tracker-description';
import { SceneDescription } from './attribute-descriptions/scene-description';
import { SelectDescription } from './attribute-descriptions/select-description';
import { NumberDescription } from './attribute-descriptions/number-description';
import { SensorDescription } from './attribute-descriptions/sensor-description';
import { ButtonDescription } from './attribute-descriptions/button-description';
import { SwitchDescription } from './attribute-descriptions/switch-description';

export class StateManager {
  private logger: Logger;
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

  getAvailability = (provider: PackageProvider): boolean => {
    return this.deviceAvailability[provider.config.identifier];
  };

  setAvailability = async (provider: PackageProvider, availability: boolean): Promise<void> => {
    this.logger.trace('Setting availability:', provider.config.identifier, availability);

    this.deviceAvailability[provider.config.identifier] = availability;

    if (!availability) {
      for (const attribute of provider.definition.attributes) {
        if (attribute.unavailability_value !== undefined && !attribute.availability) {
          this.setAttributeValue(provider, attribute.key, attribute.unavailability_value);
        }
      }
    }

    await this.publishDeviceAvailability(provider, availability);
    const process = this.hub.processes.getProcess(provider.config.identifier);
    if (process) {
      this.hub.server.sendProcessUpdate(process);
    }
  };

  setAttributeValue = async (provider: PackageProvider, attribute: string, value: any, force: boolean = false): Promise<void> => {
    const key = provider.config.identifier;

    if (!this.states[key]) {
      this.logger.trace('Creating state for:', key);
      this.states[key] = {};
    }

    const previousValue = this.states[key][attribute];

    this.states[key][attribute] = value;

    const definition = provider.definition.attributes.find((a) => a.key === attribute);

    if (definition) {
      this.publishAttributeDescription(provider, definition);
    }
    this.publishDeviceStates(provider);

    const data = {
      time: DateTime.now().toFormat('HH:mm:ss.SSS'),
      identifier: provider.config.identifier,
      attribute: attribute,
      value: value,
    };

    this.hub.server.sendStateUpdate(data);
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

    this.logger.info('Received message:', topic, payload);

    const deviceDescription = this.getDeviceDescription(provider, attribute);

    if (!deviceDescription) {
      this.logger.warn('No device description found for:', topic);
      return;
    }

    const result = await deviceDescription.onMessage(mqttData);

    this.logger.info('Device description processed message:', result);

    switch (attribute.type) {
      case DeviceType.climate: {
        this.logger.info('Received climate action:', topic);
        const climateAttribute = attribute as ClimateAttribute;
        const stateTopic = `${this.hub.config.mqtt.base_topic}/${provider.config.name}`;
        const actionPath = topic.replace(`${stateTopic}/`, '');

        this.logger.info('Received action:', actionPath);

        switch (actionPath) {
          case 'temperature/set': {
            const value = parseFloat(payload);

            if (provider.device.onTargetTemperatureChanged) {
              provider.device.onTargetTemperatureChanged(climateAttribute, value);
            } else {
              provider.logger.warn('No onTargetTemperatureChanged handler found on device', provider.config.identifier);
            }

            break;
          }
          case 'fan_mode/set': {
            const value = payload;
            if (provider.device.onClimateFanModeChanged) {
              provider.device.onClimateFanModeChanged(climateAttribute, value);
            } else {
              provider.logger.warn('No onClimateFanModeChanged handler found on device', provider.config.identifier);
            }
            break;
          }
          case 'swing_mode/set': {
            const value = payload;
            if (provider.device.onClimateSwingModeChanged) {
              provider.device.onClimateSwingModeChanged(climateAttribute, value);
            } else {
              provider.logger.warn('No onClimateSwingModeChanged handler found on device', provider.config.identifier);
            }
            break;
          }
          case 'target_humidity/set': {
            const value = parseInt(payload);
            if (provider.device.onTargetHumidityChanged) {
              provider.device.onTargetHumidityChanged(climateAttribute, value);
            } else {
              provider.logger.warn('No onTargetHumidityChanged handler found on device', provider.config.identifier);
            }
            break;
          }
          case 'preset_mode/set': {
            const value = payload;
            if (provider.device.onClimatePresetModeChanged) {
              provider.device.onClimatePresetModeChanged(climateAttribute, value);
            } else {
              provider.logger.warn('No onClimatePresetModeChanged handler found on device', provider.config.identifier);
            }
            break;
          }
          default: {
            this.logger.warn('Unknown climate action:', actionPath);
            break;
          }
        }
        break;
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
        if (payload === 'ON' || payload === 'OFF') {
          const value = payload === 'ON';

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

  publishAttributeDescription = async (provider: PackageProvider, attribute: Attribute): Promise<void> => {
    const descriptor = this.getDeviceDescription(provider, attribute);

    if (!descriptor) {
      return;
    }

    if (this.deviceDescriptionsPublished.includes(descriptor.topic)) {
      this.logger.trace('Device description already published:', descriptor.topic);
      return;
    }

    this.logger.info('Publishing device description:', provider.config.name, descriptor.topic);

    if (descriptor.topic === 'homeassistant/sensor/qt_new_york_clock/random_temperature/config') {
      this.logger.info('Publishing device description:', descriptor.topic, descriptor.toJson());
    }

    await this.hub.mqtt.publish(descriptor.topic, descriptor.toJson(), false);
    this.deviceDescriptionsPublished.push(descriptor.topic);

    descriptor.registerTopics();
  };

  getDeviceDescription = (provider: PackageProvider, attribute: Attribute): BaseAttributeDescription | undefined => {
    switch (attribute.type) {
      case DeviceType.sensor: {
        return new SensorDescription(this.hub, provider, attribute);
      }
      case DeviceType.climate: {
        return new ClimateAttributeDescription(this.hub, provider, attribute as ClimateAttribute);
      }
      case DeviceType.device_tracker: {
        return new DeviceTrackerDescription(this.hub, provider, attribute as DeviceTrackerAttribute);
      }
      case DeviceType.button: {
        return new ButtonDescription(this.hub, provider, attribute as ButtonAttribute);
      }
      case DeviceType.scene: {
        return new SceneDescription(this.hub, provider, attribute as SceneAttribute);
      }
      case DeviceType.select: {
        return new SelectDescription(this.hub, provider, attribute as SelectAttribute);
      }
      case DeviceType.number: {
        return new NumberDescription(this.hub, provider, attribute as NumberAttribute);
      }
      case DeviceType.switch: {
        return new SwitchDescription(this.hub, provider, attribute as SwitchAttribute);
      }
      default: {
        this.logger.warn('Unknown attribute type:', attribute.type);
        return;
      }
    }
  }
}
