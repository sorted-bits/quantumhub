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

  setAttributeValue = (attribute: string, value: any): Promise<void> => {
    return this.hub.state.setAttributeValue(this, attribute, value);
  };

  setAvailability = async (availability: boolean): Promise<void> => {
    return this.hub.state.setAvailability(this, availability);
  };

  getConfig = (): any => {
    return this.config as any;
  };

  registerAttributes = async (): Promise<void> => {
    const attributes = this.definition.attributes;

    for (const attribute of attributes) {
      if (attribute.type === DeviceType.device_automation || attribute.type === DeviceType.number) {
        await this.hub.state.publishDeviceDescription(this, attribute.key);
      }
    }
  };
}
