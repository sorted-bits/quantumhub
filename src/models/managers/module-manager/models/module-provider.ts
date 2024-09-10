import { Device, ModuleConfig, Provider } from 'quantumhub-sdk';
import { Home } from '../../../home';
import { Definition } from './definition';

export class ModuleProvider implements Provider {
  config: ModuleConfig;
  home: Home;
  definition: Definition;
  device: Device;

  constructor(home: Home, config: ModuleConfig, definition: Definition, device: Device) {
    this.config = config;
    this.home = home;
    this.definition = definition;
    this.device = device;
  }

  setAttributeValue(attribute: string, value: any): Promise<void> {
    return this.home.state.setAttributeValue(this, attribute, value);
  }

  async setAvailability(availability: boolean): Promise<void> {
    return this.home.state.setAvailability(this, availability);
  }

  getConfig(): any {
    return this.config as any;
  }
}
