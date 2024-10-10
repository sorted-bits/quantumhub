import { Attribute } from "quantumhub-sdk";
import { PackageProvider } from "../../package-provider/package-provider";
import { Hub } from "../../hub";

export interface Origin {
    name: string;
    sw: string;
    url: string;
}

export interface DeviceDetails {
    identifiers: string[];
    manufacturer: string;
    name: string;
}

export interface Availability {
    topic: string;
    value_template: string;
}

export class BaseAttributeDescription {
    name: string;
    object_id: string;
    unique_id: string;
    enabled_by_default: boolean;
    origin: Origin;
    device: DeviceDetails;
    availability?: Availability[];
    device_class?: string;
    unit_of_measurement?: string;
    state_class?: string;

    constructor(protected hub: Hub, protected provider: PackageProvider, protected attribute: Attribute) {
        this.name = attribute.name;
        this.object_id = `${hub.config.instance_name}_${provider.config.identifier}_${attribute.key}`;
        this.unique_id = `${hub.config.instance_name}_${provider.config.identifier}_${attribute.key}`;
        this.enabled_by_default = attribute.enabled_by_default ?? true;

        this.origin = this.originAttribute();
        this.device = this.deviceDetailsAttribute(provider);

        if (attribute.availability) {
            this.availability = this.availabilityAttribute(provider, this.hub.config.mqtt.base_topic);
        }

        if (attribute.device_class) {
            this.device_class = attribute.device_class;
        }

        if (attribute.unit_of_measurement) {
            this.unit_of_measurement = attribute.unit_of_measurement;
        }

        if (attribute.state_class) {
            this.state_class = attribute.state_class;
        }
    }

    get stateTopic(): string {
        return `${this.hub.config.mqtt.base_topic}/${this.provider.config.name}`;
    }

    get topic(): string {
        return `${this.hub.config.homeassistant.base_topic}/${this.attribute.type}/${this.provider.mqttTopic}/${this.attribute.key}/config`;
    }

    toJson(): string {
        return JSON.stringify(this, (key, value) => {
            if (key === 'hub' || key === 'provider' || key === 'attribute') {
                return undefined;
            }
            return value;
        });
    }

    private originAttribute = (): Origin => {
        return {
            name: 'QuantumHub',
            sw: '1.0.0',
            url: 'https://quantumhub.app',
        };
    }

    private deviceDetailsAttribute = (provider: PackageProvider): DeviceDetails => {
        return {
            identifiers: [provider.config.identifier],
            manufacturer: provider.definition.author ?? 'QuantumHub',
            name: provider.config.name,
        };
    };

    private availabilityAttribute = (provider: PackageProvider, baseTopic: string): Availability[] => {
        const deviceAvailabilityTopic = `${baseTopic}/${provider.config.name}/availability`;

        return [
            {
                topic: `${baseTopic}/bridge/state`,
                value_template: '{{ value_json.state }}',
            },
            {
                topic: deviceAvailabilityTopic,
                value_template: '{{ value_json.state }}',
            },
        ];
    };

    registerTopics = (): void => {
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    onMessage = async (dataData: { payload: string, topic: string }): Promise<void> => {
    }
};