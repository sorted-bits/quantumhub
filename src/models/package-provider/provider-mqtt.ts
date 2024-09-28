import { MQTT } from 'quantumhub-sdk';
import { Hub } from '../hub';
import { PackageProvider } from './package-provider';

export class ProviderMQTT implements MQTT {
  constructor(private readonly provider: PackageProvider, private readonly hub: Hub) {}

    /**
     * Subscribes directly to a MQTT topic
     *
     * @param {string} topic The topic to subscribe to
     * @returns {Promise<void>}
     * @memberof PackageProvider
     */
    subscribeToTopic = (topic: string): Promise<void> => {
        this.provider.logger.trace('Subscribing to topic', topic);
        return this.hub.mqtt.subscribeToTopic(topic, this.provider);
    };

    /**
     * Publishes a message to a MQTT topic
     *
     * @param {string} topic The topic to publish to
     * @param {string} message The message to publish
     * @param {boolean} retain Whether the message should be retained
     * @returns {Promise<void>}
     * @memberof PackageProvider
     */
    publishToTopic = (topic: string, message: string, retain: boolean): Promise<void> => {
        this.provider.logger.trace('Publishing to topic', topic, message);
        return this.hub.mqtt.publish(topic, message, retain);
    };

}
