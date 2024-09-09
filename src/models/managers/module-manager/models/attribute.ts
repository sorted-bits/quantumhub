import { DeviceClass } from './device-class';
import { DeviceType } from './device-type';

export interface Attribute {
  identifier: string;
  name: string;
  type: DeviceType;
  device_class: DeviceClass;
  unit?: string;
  state_class?: string;

  optimistic?: boolean;
  on?: string;
  off?: string;
}
