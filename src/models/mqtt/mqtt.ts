import { connect, MqttClient } from 'mqtt';
import { Logger as ILogger } from 'quantumhub-sdk';
import { MqttConfig } from '../config/interfaces/mqtt-config';
import { Hub } from '../hub';
import { Attribute } from '../module-loader/interfaces/attribute';
import { ModuleProvider } from '../module-loader/models/module-provider';
import { ProviderAttribute } from './interfaces/provider-attribute';

export class MQTT {
  private config?: MqttConfig;

  private logger: ILogger;
  private client: MqttClient | undefined = undefined;
  private hub: Hub;

  private attributeSubscriptions: { [topic: string]: ProviderAttribute[] } = {};
  private topicSubscription: { [topic: string]: ModuleProvider[] } = {};
  private disconnecting: boolean = false;

  get isConnected(): boolean {
    return this.client ? this.client.connected : false;
  }

  constructor(hub: Hub) {
    this.hub = hub;
    this.logger = this.hub.createLogger('MQTT');
  }

  connect = async (configuration: MqttConfig): Promise<boolean> => {
    this.disconnecting = false;
    this.config = configuration;

    const { host, port, username, password, protocol, validate_certificate: validateCertificate } = this.config;

    if (this.client && this.client.connected) {
      this.logger.trace('Already connected, reconnecting');
      this.client.end();
    }

    const brokerUrl = `${protocol ?? 'mqtt'}://${host}:${port ?? 1883}`;
    this.logger.trace('Connecting to broker:', brokerUrl);

    return new Promise((resolve, reject) => {
      this.client = connect(`${protocol ?? 'mqtt'}://${host}`, {
        username,
        password,
        port: port,
        rejectUnauthorized: validateCertificate ?? true,
      });

      this.client.on('connect', () => {
        this.logger.info('Connected to broker:', brokerUrl);

        this.hub.state.publishBridgeStatus(true).then(() => {
          this.logger.trace('Bridge status published');

          resolve(true);
        });
      });

      this.client.on('error', (error) => {
        this.logger.error('Error:', error);
        reject(error);
      });

      this.client.on('disconnect', this.onDisconnect);

      this.client.on('message', (topic, message) => {
        this.logger.trace('Received message:', topic, message.toString());
        this.onMessage(topic, message);
      });
    });
  };

  publish = async (topic: string, message: string, retain: boolean = true): Promise<void> => {
    return new Promise((resolve) => {
      if (!this.client) {
        this.logger.error('Not connected to broker');
        return;
      }

      this.client.publish(
        topic,
        message,
        {
          retain: retain,
        },
        () => {
          resolve();
        }
      );
    });
  };

  subscribeToTopic = async (topic: string, provider: ModuleProvider): Promise<void> => {
    if (!this.topicSubscription[topic]) {
      this.topicSubscription[topic] = [];
      await this.subscribe(topic);
    }

    this.topicSubscription[topic].push(provider);
  };

  subscribeToAttribute = async (provider: ModuleProvider, attribute: Attribute, topic: string): Promise<void> => {
    if (!this.attributeSubscriptions[topic]) {
      this.attributeSubscriptions[topic] = [];
      await this.subscribe(topic);
    }

    this.attributeSubscriptions[topic].push({ provider, attribute: attribute });
  };

  subscribe = async (topic: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!this.client) {
        this.logger.error('Not connected to broker');
        return;
      }

      this.client.subscribe(topic, () => {
        this.logger.trace('Subscribing to:', topic);
        resolve();
      });
    });
  };

  onDisconnect = (): void => {
    if (!this.disconnecting) {
      this.logger.error('Disconnected from broker');

      this.reconnect()
        .then(() => {
          this.logger.info('Reconnected to broker');
        })
        .catch((error) => {
          this.logger.error('Failed to reconnect to broker:', error);
        });
    }
  };

  reconnect = async (): Promise<void> => {
    this.logger.warn('Reconnecting to broker');
    await this.connect(this.config!);

    for (const topic in this.attributeSubscriptions) {
      this.logger.trace('Resubscribing to:', topic);
      await this.subscribe(topic);
    }
  };

  disconnect = async (): Promise<void> => {
    if (this.client) {
      this.disconnecting = true;
      this.logger.info('Disconnecting from broker');
      this.client.end();
    }
  };

  private onMessage = async (topic: string, message: Buffer): Promise<void> => {
    await this.onMessageAttributeSubscriptions(topic, message);
    await this.onMessageTopicSubscriptions(topic, message);
  };

  private onMessageTopicSubscriptions = async (topic: string, message: Buffer): Promise<void> => {
    if (!this.topicSubscription[topic]) {
      this.logger.error('No subscriptions for topic:', topic);
      return;
    }

    const providers = this.topicSubscription[topic];

    for (const provider of providers) {
      provider.device.onMessage?.(topic, message);
    }
  };

  private onMessageAttributeSubscriptions = async (topic: string, message: Buffer): Promise<void> => {
    const payload = message.toString();
    if (!this.attributeSubscriptions[topic]) {
      this.logger.error('No subscriptions for topic:', topic);
      return;
    }

    const subscriptions = this.attributeSubscriptions[topic];

    for (const subscription of subscriptions) {
      const { provider, attribute } = subscription;
      this.hub.state.onMessage(provider, attribute, payload);
    }
  };
}
