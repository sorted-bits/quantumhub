import { LightAttribute, LightDevice } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "./base-attribute-description";

export class LightDescription extends BaseAttributeDescription {
    command_topic: string;

    brightness: boolean = false;
    brightness_scale: number = 255;

    effect: boolean = false;
    effect_list: string[] = [];

    flash_time_long: number = 10;
    flash_time_short: number = 2;

    max_mireds?: number;
    min_mireds?: number;

    supported_color_modes?: string[];
    white_scale: number = 255;

    schema: string = 'json';

    json_attributes_template: string;
    json_attributes_topic: string;

    constructor(hub: Hub, provider: PackageProvider, attribute: LightAttribute) {
        super(hub, provider, attribute);

        this.brightness = attribute.brightness ?? false;
        this.brightness_scale = attribute.brightness_scale ?? 255;

        this.effect = attribute.effect ?? false;
        this.effect_list = attribute.effect_list ?? [];

        this.flash_time_long = attribute.flash_time_long ?? 10;
        this.flash_time_short = attribute.flash_time_short ?? 2;

        this.max_mireds = attribute.max_mireds;
        this.min_mireds = attribute.min_mireds;

        this.supported_color_modes = attribute.supported_color_modes;
        this.white_scale = attribute.white_scale ?? 255;

        this.command_topic = `${this.stateTopic}/${attribute.key}/set`;

        this.json_attributes_template = `{{ value_json.${attribute.key} | tojson }}`;
        this.json_attributes_topic = this.stateTopic;
    }

    registerTopics = (): void => {
        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.command_topic);
    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        const payload = JSON.parse(mqttData.payload);
        const device = this.provider.device as LightDevice;

        this.provider.logger.info('Received message:', payload);

        if (payload.state) {
            await device.onLightPowerChanged(this.attribute as LightAttribute, payload.state === 'ON');
        }

        if (payload.brightness) {
            await device.onLightBrightnessChanged?.(this.attribute as LightAttribute, payload.brightness);
        }

        if (payload.color) {
            await device.onLightColorChanged?.(this.attribute as LightAttribute, payload.color);
        }

        if (payload.effect) {
            await device.onLightEffectChanged?.(this.attribute as LightAttribute, payload.effect);
        }
    }
}