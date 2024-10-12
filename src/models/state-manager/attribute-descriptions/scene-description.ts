import { SceneAttribute, SceneDevice } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "./base-attribute-description";

export class SceneDescription extends BaseAttributeDescription {
    command_topic: string;
    payload_on: string;

    constructor(hub: Hub, provider: PackageProvider, attribute: SceneAttribute) {
        super(hub, provider, attribute);

        this.command_topic = `${this.stateTopic}/set`;

        this.payload_on = 'ON';
    }

    registerTopics = (): void => {
        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.command_topic);
    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        this.hub.logger.info('Scene triggered:', mqttData);

        const device = this.provider.device as SceneDevice;
        device.onSceneTriggered(this.attribute as SceneAttribute);
    }
}