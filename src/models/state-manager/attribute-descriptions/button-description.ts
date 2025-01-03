import { ButtonAttribute, ButtonDevice } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "./base-attribute-description";

export class ButtonDescription extends BaseAttributeDescription {
    command_topic: string;
    state_topic: string;

    constructor(hub: Hub, provider: PackageProvider, attribute: ButtonAttribute) {
        super(hub, provider, attribute);

        this.command_topic = `${this.stateTopic}/set`;

        this.state_topic = this.stateTopic;
    }

    registerTopics = (): void => {
        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.command_topic);
    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        this.hub.logger.info('Button pressed:', mqttData);

        const device = this.provider.device as ButtonDevice;
        await device.onButtonPressed(this.attribute as ButtonAttribute)
    }
}