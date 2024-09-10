import { DeviceClass } from '../enums/device-class';
import { DeviceType } from '../enums/device-type';

export interface BaseAttribute {
  key: string;
  type: DeviceType;
  name: string;
  device_class: DeviceClass;
  unit_of_measurement?: string;
  state_class?: string;
}

export interface DeviceAutomationAttribute extends BaseAttribute {
  payload: string;
}

export interface SwitchAttribute extends BaseAttribute {
  on: string;
  off: string;
  optimistic: boolean;
}

export interface NumberAttribute extends BaseAttribute {
  min: number;
  max: number;
  step: number;
}

export type Attribute = BaseAttribute | SwitchAttribute | DeviceAutomationAttribute | NumberAttribute;
