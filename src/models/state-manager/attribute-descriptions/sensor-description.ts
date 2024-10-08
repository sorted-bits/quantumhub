import { Attribute } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";
import { BaseAttributeDescription } from "./base-attribute-description";

export class SensorDescription extends BaseAttributeDescription {
    state_topic: string;
    value_template: string;

    constructor(hub: Hub, provider: PackageProvider, attribute: Attribute) {
        super(hub, provider, attribute);

        this.state_topic = this.stateTopic;
        this.value_template = `{{ value_json.${attribute.key} }}`;
    }
}