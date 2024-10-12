import { FanAttribute, FanDevice, FanState } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "./base-attribute-description";

export class FanDescription extends BaseAttributeDescription {
    command_topic: string;
    state_value_template: string;

    state_topic: string;

    speed_range_max?: number;
    speed_range_min?: number;

    preset_modes?: string[];

    preset_mode_command_topic?: string;

    preset_mode_state_topic?: string;
    preset_mode_value_template?: string;


    oscillation_command_topic?: string;
    oscillation_state_topic?: string;
    oscillation_value_template?: string;

    direction_command_topic?: string;
    direction_state_topic?: string;
    direction_value_template?: string;

    percentage_command_template?: string;
    percentage_state_template?: string;
    percentage_value_template?: string;

    constructor(hub: Hub, provider: PackageProvider, attribute: FanAttribute) {
        super(hub, provider, attribute);

        this.command_topic = `${this.stateTopic}/set`;
        this.state_topic = `${this.stateTopic}`;

        this.speed_range_max = attribute.speed_range_max ?? 10;
        this.speed_range_min = attribute.speed_range_min ?? 0;

        this.state_value_template = `{{ value_json.state }}`;

        if (attribute.has_speed_control) {
            this.percentage_command_template = `${this.stateTopic}/speed/set`;
            this.percentage_state_template = this.stateTopic;
            this.percentage_value_template = `{{ value_json.percentage }}`;
        }

        if (attribute.preset_modes) {
            this.preset_modes = attribute.preset_modes;
            this.preset_mode_command_topic = `${this.stateTopic}/preset_mode/set`;
            this.preset_mode_state_topic = this.stateTopic;
            this.preset_mode_value_template = `{{ value_json.preset_mode}}`;
        }

        if (attribute.has_oscillation) {
            this.oscillation_command_topic = `${this.stateTopic}/oscillation/set`;
            this.oscillation_state_topic = this.stateTopic;
            this.oscillation_value_template = `{{ value_json.oscillation }}`;
        }

        if (attribute.has_direction) {
            this.direction_command_topic = `${this.stateTopic}/direction/set`;
            this.direction_state_topic = this.stateTopic;
            this.direction_value_template = `{{ value_json.direction }}`;
        }

    }

    registerTopics = (): void => {
        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.command_topic);
        if (this.preset_mode_command_topic) {
            this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.preset_mode_command_topic);
        }

        if (this.oscillation_command_topic) {
            this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.oscillation_command_topic);
        }

        if (this.direction_command_topic) {
            this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.direction_command_topic);
        }

        if (this.percentage_command_template) {
            this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.percentage_command_template);
        }

    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        const device = this.provider.device as FanDevice;

        if (mqttData.topic === this.command_topic) {
            device.onFanPowerChanged(this.attribute as FanAttribute, mqttData.payload === 'ON');
        }
    }

    getPublishState = (state: FanState): any => {
        return {
            ...state,
            state: state.state ? 'ON' : 'OFF'
        }
    }
}