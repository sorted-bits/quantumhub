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

export interface ButtonAttribute extends BaseAttribute {
  type: DeviceType.button;
  payload_press: string;
}

export interface SceneAttribute extends BaseAttribute {
  type: DeviceType.scene;
  payload_on: string;
}

export interface DeviceAutomationAttribute extends BaseAttribute {
  payload: string;
}

export interface SwitchAttribute extends BaseAttribute {
  payload_on: string;
  payload_off: string;
  optimistic: boolean;
}

export interface NumberAttribute extends BaseAttribute {
  min: number;
  max: number;
  step: number;
}

export interface SelectAttribute extends BaseAttribute {
  optimistic: boolean;
  options: string[];
}

export type Attribute = BaseAttribute | SwitchAttribute | DeviceAutomationAttribute | NumberAttribute | SelectAttribute | ButtonAttribute;
