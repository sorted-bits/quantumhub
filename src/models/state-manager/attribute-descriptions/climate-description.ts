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

    mode_command_topic?: string;
    mode_state_topic?: string;
    mode_state_template?: string;

    power_command_topic?: string;
    power_command_template?: string;

    fan_mode_command_topic?: string;
    fan_mode_state_topic?: string;
    fan_mode_state_template?: string;

    swing_mode_command_topic?: string;
    swing_mode_state_topic?: string;
    swing_mode_state_template?: string;

    preset_mode_command_topic?: string;
    preset_mode_state_topic?: string;
    preset_mode_state_template?: string;

    target_humidity_command_topic?: string;
    target_humidity_state_topic?: string;
    target_humidity_state_template?: string;

    current_humidity_topic: string;
    current_humidity_template: string;

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
            this.mode_command_topic = `${this.stateTopic}/mode/set`;
            this.mode_state_topic = this.stateTopic;
            this.mode_state_template = `{{ value_json.mode }}`;
        }

        if (attribute.has_power_control) {
            this.power_command_topic = `${this.stateTopic}/power/set`;
            this.power_command_template = `{{ value_json.power }}`;
        }

        if (attribute.has_fanmode) {
            this.fan_mode_command_topic = `${this.stateTopic}/fan_mode/set`;
            this.fan_mode_state_topic = this.stateTopic;
            this.fan_mode_state_template = `{{ value_json.fan_mode }}`;
        }

        if (attribute.has_swingmode) {
            this.swing_mode_command_topic = `${this.stateTopic}/swing_mode/set`;
            this.swing_mode_state_topic = this.stateTopic;
            this.swing_mode_state_template = `{{ value_json.swing_mode }}`;
        }

        if (attribute.has_presetmode) {
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

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<boolean> => {
        const { payload, topic } = mqttData;

        this.provider.logger.info('Received message:', topic, payload);


        switch (topic) {
            case this.temperature_command_topic: {
                const value = parseFloat(payload);
                if (this.provider.device.onTargetTemperatureChanged) {
                    this.provider.device.onTargetTemperatureChanged(this.attribute as ClimateAttribute, value);
                } else {
                    this.provider.logger.warn('No onTargetTemperatureChanged handler found on device', this.provider.config.identifier);
                }
                break;
            }
        }

        return true;
    }
}