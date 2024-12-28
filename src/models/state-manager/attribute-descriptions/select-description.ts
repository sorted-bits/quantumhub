import { SelectAttribute, SelectDevice } from "quantumhub-sdk";
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

        this.command_topic = `${this.stateTopic}/set`;

        this.state_topic = this.stateTopic;
        this.value_template = `{{ value_json.state }}`;
        this.options = attribute.options;
    }

    registerTopics = (): void => {
        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.command_topic);
    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        const { payload, topic } = mqttData;

        const device = this.provider.device as SelectDevice;
        const selectAttribute = this.attribute as SelectAttribute;

        this.hub.logger.info('Received message:', topic, payload);

        device.onSelectChanged(selectAttribute, payload);

        if (selectAttribute.optimistic) {
            this.hub.logger.info('Setting attribute value:', this.attribute.key, payload);
            this.hub.state.setAttributeState(this.provider, selectAttribute, { state: payload });
        }
    }
}