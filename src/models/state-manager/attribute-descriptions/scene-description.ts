import { SceneAttribute } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "./base-attribute-description";

export class SceneDescription extends BaseAttributeDescription {
    command_topic: string;
    state_topic: string;
    value_template: string;
    payload_on: string;

    constructor(hub: Hub, provider: PackageProvider, attribute: SceneAttribute) {
        super(hub, provider, attribute);

        this.command_topic = `${this.stateTopic}/${attribute.key}/set`;

        this.state_topic = this.stateTopic;
        this.value_template = `{{ value_json.${attribute.key} }}`;
        this.payload_on = 'ON';
    }

    registerTopics(): void {
        super.registerTopics();

        this.hub.mqtt.subscribeToAttribute(this.provider, this.attribute, this.command_topic);
    }

    onMessage = async (mqttData: { payload: string, topic: string }): Promise<void> => {
        this.hub.logger.info('Scene triggered:', mqttData);

        if (this.provider.device.onSceneTriggered) {
            this.provider.device.onSceneTriggered(this.attribute as SceneAttribute).catch((error) => {
                this.hub.logger.error('Error processing scene triggered:', error);
            });
        }
    }
}