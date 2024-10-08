import { NumberAttribute } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "./base-attribute-description";

export class NumberDescription extends BaseAttributeDescription {
    command_topic: string;
    step: number;
    min: number;
    max: number;
    state_topic: string;
    value_template: string;

    constructor(hub: Hub, provider: PackageProvider, attribute: NumberAttribute) {
        super(hub, provider, attribute);

        this.command_topic = `${this.stateTopic}/${attribute.key}/set`;
        this.step = attribute.step;
        this.min = attribute.min;
        this.max = attribute.max;

        this.state_topic = this.stateTopic;
        this.value_template = `{{ value_json.${attribute.key} }}`;
    }

    registerTopics(): void {
        super.registerTopics();

        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.command_topic);
    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        const { payload, topic } = mqttData;
        const numberAttribute = this.attribute as NumberAttribute;

        this.hub.logger.info('Received message:', topic, payload);

        if (this.provider.device.onNumberChanged) {
            this.provider.device.onNumberChanged(numberAttribute, parseFloat(payload));
        } else {
            this.hub.logger.warn('No onNumberChanged handler found on device', this.provider.config.identifier);
        }
    }
}