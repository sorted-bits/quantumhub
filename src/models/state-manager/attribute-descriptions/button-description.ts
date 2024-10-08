import { ButtonAttribute } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "./base-attribute-description";

export class ButtonDescription extends BaseAttributeDescription {
    command_topic: string;
    state_topic: string;
    value_template: string;

    constructor(hub: Hub, provider: PackageProvider, attribute: ButtonAttribute) {
        super(hub, provider, attribute);

        this.command_topic = `${this.stateTopic}/${attribute.key}/set`;

        this.state_topic = this.stateTopic;
        this.value_template = `{{ value_json.${attribute.key} }}`;
    }

    registerTopics(): void {
        super.registerTopics();

        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.command_topic);
    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        this.hub.logger.info('Button pressed:', mqttData);

        if (this.provider.device.onButtonPressed) {
            await this.provider.device.onButtonPressed(this.attribute as ButtonAttribute)
        } else {
            this.hub.logger.warn('No onButtonPressed handler found on device', this.provider.config.identifier);
        }
    }
}