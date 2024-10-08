import { DeviceTrackerAttribute } from "quantumhub-sdk";
import { Hub } from "../../hub";
import { PackageProvider } from "../../package-provider/package-provider";

import { BaseAttributeDescription } from "./base-attribute-description";

export class DeviceTrackerDescription extends BaseAttributeDescription {

    json_attributes_template: string;
    json_attributes_topic: string;

    constructor(hub: Hub, provider: PackageProvider, attribute: DeviceTrackerAttribute) {
        super(hub, provider, attribute);
        const attributeIdentifier = attribute.key;

        this.json_attributes_template = `{{ value_json.${attributeIdentifier} | tojson }}`;
        this.json_attributes_topic = `${this.stateTopic}`;
    }
}