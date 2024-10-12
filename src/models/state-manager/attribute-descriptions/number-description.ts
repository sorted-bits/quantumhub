import { NumberAttribute, NumberDevice } from "quantumhub-sdk";
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

        this.command_topic = `${this.stateTopic}/set`;
        this.step = attribute.step;
        this.min = attribute.min;
        this.max = attribute.max;

        this.state_topic = this.stateTopic;
        this.value_template = `{{ value_json }}`;
    }

    registerTopics = (): void => {
        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.command_topic);
    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        const { payload } = mqttData;
        const device = this.provider.device as NumberDevice;
        const numberAttribute = this.attribute as NumberAttribute;

        device.onNumberChanged(numberAttribute, parseFloat(payload));
    }
}