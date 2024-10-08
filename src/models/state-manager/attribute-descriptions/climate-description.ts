import { ClimateAttribute } from "quantumhub-sdk";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "./base-attribute-description";
import { Hub } from "../../hub";

export class ClimateAttributeDescription extends BaseAttributeDescription {

    action_topic: string;
    action_template: string;

    current_temperature_topic: string;
    current_temperature_template: string;

    temperature_command_topic: string;
    temperature_state_topic: string;
    temperature_state_template: string;

    modes?: string[];
    mode_command_topic?: string;
    mode_state_topic?: string;
    mode_state_template?: string;

    power_command_topic?: string;
    power_command_template?: string;

    fan_modes?: string[];
    fan_mode_command_topic?: string;
    fan_mode_state_topic?: string;
    fan_mode_state_template?: string;

    swing_modes?: string[];
    swing_mode_command_topic?: string;
    swing_mode_state_topic?: string;
    swing_mode_state_template?: string;

    preset_modes?: string[];
    preset_mode_command_topic?: string;
    preset_mode_state_topic?: string;
    preset_mode_state_template?: string;

    target_humidity_command_topic?: string;
    target_humidity_state_topic?: string;
    target_humidity_state_template?: string;

    current_humidity_topic?: string;
    current_humidity_template?: string;

    constructor(hub: Hub, provider: PackageProvider, attribute: ClimateAttribute) {
        super(hub, provider, attribute);

        this.action_topic = `${this.stateTopic}/action/set`;
        this.action_template = `{{ value_json.action }}`;

        this.current_temperature_topic = this.stateTopic;
        this.current_temperature_template = `{{ value_json.current_temperature }}`;

        this.temperature_command_topic = `${this.stateTopic}/temperature/set`;
        this.temperature_state_topic = this.stateTopic;
        this.temperature_state_template = `{{ value_json.target_temperature }}`;

        if (attribute.has_mode_control) {
            this.modes = attribute.modes;
            this.mode_command_topic = `${this.stateTopic}/mode/set`;
            this.mode_state_topic = this.stateTopic;
            this.mode_state_template = `{{ value_json.mode }}`;
        }

        if (attribute.has_power_control) {
            this.power_command_topic = `${this.stateTopic}/power/set`;
            this.power_command_template = `{{ value_json.power }}`;
        }

        if (attribute.has_fanmode) {
            this.fan_modes = attribute.fan_modes;
            this.fan_mode_command_topic = `${this.stateTopic}/fan_mode/set`;
            this.fan_mode_state_topic = this.stateTopic;
            this.fan_mode_state_template = `{{ value_json.fan_mode }}`;
        }

        if (attribute.has_swingmode) {
            this.swing_modes = attribute.swing_modes;
            this.swing_mode_command_topic = `${this.stateTopic}/swing_mode/set`;
            this.swing_mode_state_topic = this.stateTopic;
            this.swing_mode_state_template = `{{ value_json.swing_mode }}`;
        }

        if (attribute.has_presetmode) {
            this.preset_modes = attribute.preset_modes;
            this.preset_mode_command_topic = `${this.stateTopic}/preset_mode/set`;
            this.preset_mode_state_topic = this.stateTopic;
            this.preset_mode_state_template = `{{ value_json.preset_mode }}`;
        }

        this.current_humidity_topic = this.stateTopic;
        this.current_humidity_template = `{{ value_json.current_humidity }}`;

        if (attribute.has_humidity_control) {
            this.target_humidity_command_topic = `${this.stateTopic}/target_humidity/set`;
            this.target_humidity_state_topic = this.stateTopic;
            this.target_humidity_state_template = `{{ value_json.target_humidity }}`;
        }

    }

    get climateAttribute(): ClimateAttribute {
        return this.attribute as ClimateAttribute;
    }

    registerTopics(): void {
        super.registerTopics();

        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.action_topic);
        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.temperature_command_topic);

        if (this.climateAttribute.has_mode_control && this.mode_command_topic) {
            this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.mode_command_topic);
        }

        if (this.climateAttribute.has_power_control && this.power_command_topic) {
            this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.power_command_topic);
        }

        if (this.climateAttribute.has_fanmode && this.fan_mode_command_topic) {
            this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.fan_mode_command_topic);
        }

        if (this.climateAttribute.has_swingmode && this.swing_mode_command_topic) {
            this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.swing_mode_command_topic);
        }

        if (this.climateAttribute.has_presetmode && this.preset_mode_command_topic) {
            this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.preset_mode_command_topic);
        }

        if (this.climateAttribute.has_humidity_control && this.target_humidity_command_topic) {
            this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.target_humidity_command_topic);
        }
    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        const { payload, topic } = mqttData;

        switch (topic) {
            case this.temperature_command_topic: {
                const value = parseFloat(payload);
                if (this.provider.device.onTargetTemperatureChanged) {
                    this.provider.device.onTargetTemperatureChanged(this.attribute as ClimateAttribute, value);
                } else {
                    this.provider.logger.
                        warn('No onTargetTemperatureChanged handler found on device', this.provider.config.identifier);
                }
                break;
            }
            case this.mode_command_topic: {
                const value = payload;
                this.provider.logger.info('Received mode command:', value);

                if (this.provider.device.onModeChanged) {
                    this.provider.device.onModeChanged(this.attribute as ClimateAttribute, value);
                } else {
                    this.provider.logger.warn('No onModeChanged handler found on device', this.provider.config.identifier);
                }

                break;
            }
            case this.power_command_topic: {
                const value = payload;
                this.provider.logger.info('Received power command:', value);
                break;
            }
            case this.fan_mode_command_topic: {
                const value = payload;
                this.provider.logger.info('Received fan mode command:', value);
                if (this.provider.device.onClimateFanModeChanged) {
                    this.provider.device.onClimateFanModeChanged(this.attribute as ClimateAttribute, value);
                } else {
                    this.provider.logger.warn('No onClimateFanModeChanged handler found on device', this.provider.config.identifier);
                }
                break;
            }
            case this.swing_mode_command_topic: {
                const value = payload;
                this.provider.logger.info('Received swing mode command:', value);
                if (this.provider.device.onClimateSwingModeChanged) {
                    this.provider.device.onClimateSwingModeChanged(this.attribute as ClimateAttribute, value);
                } else {
                    this.provider.logger.warn('No onClimateSwingModeChanged handler found on device', this.provider.config.identifier);
                }
                break;
            }
            case this.preset_mode_command_topic: {
                const value = payload;
                this.provider.logger.info('Received preset mode command:', value);
                if (this.provider.device.onClimatePresetModeChanged) {
                    this.provider.device.onClimatePresetModeChanged(this.attribute as ClimateAttribute, value);
                } else {
                    this.provider.logger.warn('No onClimatePresetModeChanged handler found on device', this.provider.config.identifier);
                }
            }
            case this.target_humidity_command_topic: {
                const value = parseFloat(payload);
                this.provider.logger.info('Received target humidity command:', value);
                if (this.provider.device.onTargetHumidityChanged) {
                    this.provider.device.onTargetHumidityChanged(this.attribute as ClimateAttribute, value);
                } else {
                    this.provider.logger.warn('No onTargetHumidityChanged handler found on device', this.provider.config.identifier);
                }
            }
        }
    }
}