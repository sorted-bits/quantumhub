import { Attribute, DeviceType, ClimateAttribute, DeviceTrackerAttribute, ButtonAttribute, SceneAttribute, SelectAttribute, NumberAttribute, SwitchAttribute, LightAttribute, FanAttribute } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "../attribute-descriptions/base-attribute-description";
import { ButtonDescription } from "../attribute-descriptions/button-description";
import { ClimateAttributeDescription } from "../attribute-descriptions/climate-description";
import { DeviceTrackerDescription } from "../attribute-descriptions/device-tracker-description";
import { NumberDescription } from "../attribute-descriptions/number-description";
import { SceneDescription } from "../attribute-descriptions/scene-description";
import { SelectDescription } from "../attribute-descriptions/select-description";
import { SensorDescription } from "../attribute-descriptions/sensor-description";
import { SwitchDescription } from "../attribute-descriptions/switch-description";
import { LightDescription } from "../attribute-descriptions/light-description";
import { FanDescription } from "../attribute-descriptions/fan-description";

export const getDeviceDescriptionForAttribute = (hub: Hub, provider: PackageProvider, attribute: Attribute): BaseAttributeDescription | undefined => {
    switch (attribute.type) {
        case DeviceType.sensor: {
            return new SensorDescription(hub, provider, attribute);
        }
        case DeviceType.climate: {
            return new ClimateAttributeDescription(hub, provider, attribute as ClimateAttribute);
        }
        case DeviceType.device_tracker: {
            return new DeviceTrackerDescription(hub, provider, attribute as DeviceTrackerAttribute);
        }
        case DeviceType.button: {
            return new ButtonDescription(hub, provider, attribute as ButtonAttribute);
        }
        case DeviceType.scene: {
            return new SceneDescription(hub, provider, attribute as SceneAttribute);
        }
        case DeviceType.select: {
            return new SelectDescription(hub, provider, attribute as SelectAttribute);
        }
        case DeviceType.number: {
            return new NumberDescription(hub, provider, attribute as NumberAttribute);
        }
        case DeviceType.switch: {
            return new SwitchDescription(hub, provider, attribute as SwitchAttribute);
        }
        case DeviceType.light: {
            return new LightDescription(hub, provider, attribute as LightAttribute);
        }
        case DeviceType.fan: {
            return new FanDescription(hub, provider, attribute as FanAttribute);
        }
        default: {
            provider.logger.warn('Unknown attribute type:', attribute);
            return;
        }
    }
}