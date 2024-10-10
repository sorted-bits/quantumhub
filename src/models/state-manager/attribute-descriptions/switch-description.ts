import { SwitchAttribute, SwitchDevice } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "./base-attribute-description";

export class SwitchDescription extends BaseAttributeDescription {
    command_topic: string;
    state_topic: string;
    value_template: string;

    constructor(hub: Hub, provider: PackageProvider, attribute: SwitchAttribute) {
        super(hub, provider, attribute);

        this.command_topic = `${this.stateTopic}/${attribute.key}/set`;

        this.state_topic = this.stateTopic;
        this.value_template = `{{ value_json.${attribute.key} }}`;
    }

    registerTopics = (): void => {
        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.command_topic);
    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        const { payload, topic } = mqttData;
        const switchAttribute = this.attribute as SwitchAttribute;
        const device = this.provider.device as SwitchDevice;

        this.hub.logger.info('Received message:', topic, payload);

        const value = payload === 'ON';
        device.onSwitchChanged(switchAttribute, value);


        if (switchAttribute.optimistic) {
            this.hub.logger.info('Setting attribute value:', this.attribute.key, value);
            this.hub.state.setAttributeValue(this.provider, this.attribute.key, value);
        }
    }
}