import { SelectAttribute } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "./base-attribute-description";

export class SelectDescription extends BaseAttributeDescription {
    command_topic: string;
    state_topic: string;
    value_template: string;
    options: string[];

    constructor(hub: Hub, provider: PackageProvider, attribute: SelectAttribute) {
        super(hub, provider, attribute);

        this.command_topic = `${this.stateTopic}/${attribute.key}/set`;

        this.state_topic = this.stateTopic;
        this.value_template = `{{ value_json.${attribute.key} }}`;
        this.options = attribute.options;
    }

    registerTopics(): void {
        super.registerTopics();

        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.command_topic);
    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        const { payload, topic } = mqttData;
        const selectAttribute = this.attribute as SelectAttribute;

        this.hub.logger.info('Received message:', topic, payload);

        if (this.provider.device.onSelectChanged) {
            this.provider.device.onSelectChanged(selectAttribute, payload);
        } else {
            this.hub.logger.warn('No onSelectChanged handler found on device', this.provider.config.identifier);
        }

        if (selectAttribute.optimistic) {
            this.hub.logger.info('Setting attribute value:', this.attribute.key, payload);
            this.hub.state.setAttributeValue(this.provider, this.attribute.key, payload);
        }
    }
}