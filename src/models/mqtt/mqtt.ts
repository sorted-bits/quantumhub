import { connect, MqttClient } from 'mqtt';
import { Attribute, Logger } from 'quantumhub-sdk';
import { MqttConfig } from '../config/interfaces/mqtt-config';
import { Hub } from '../hub';
import { PackageProvider } from '../package-provider/package-provider';
import { ProviderAttribute } from './interfaces/provider-attribute';

export class MQTT {
  private config?: MqttConfig;

  private logger: Logger;
  private client: MqttClient | undefined = undefined;
  private hub: Hub;

  private _attributeSubscriptions: { [topic: string]: ProviderAttribute[] } = {};
  private _topicSubscriptions: { [topic: string]: PackageProvider[] } = {};
  private disconnecting: boolean = false;

  get isConnected(): boolean {
    return this.client ? this.client.connected : false;
  }

  get attributeSubscriptions(): string[] {
    return Object.keys(this._attributeSubscriptions);
  }

  get topicSubscriptions(): string[] {
    return Object.keys(this._topicSubscriptions);
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
      this.disconnecting = true;
      this.logger.trace('Already connected, first disconnecting');
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
        this.disconnecting = false;

        this.sendMqttUpdate();

        this.logger.info('Connected to broker:', brokerUrl);

        this.hub.state.publishBridgeAvailability(true).then(() => {
          this.logger.trace('Bridge status published');

          resolve(true);
        });
      });

      this.client.on('error', (error) => {
        this.logger.error('Error from MQTT broker: ', JSON.stringify(error));
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

  subscribeToTopic = async (topic: string, provider: PackageProvider): Promise<void> => {
    if (!this._topicSubscriptions[topic]) {
      this._topicSubscriptions[topic] = [];
      await this.subscribe(topic);
    }

    this._topicSubscriptions[topic].push(provider);
  };

  subscribeToAttribute = async (provider: PackageProvider, attribute: Attribute, topic: string): Promise<void> => {
    if (!this._attributeSubscriptions[topic]) {
      this._attributeSubscriptions[topic] = [];
      await this.subscribe(topic);
    }

    const subscriptions = this._attributeSubscriptions[topic];
    if (subscriptions.find((s) => s.provider === provider && s.attribute === attribute)) {
      return;
    }

    this._attributeSubscriptions[topic].push({ provider, attribute: attribute });
  };

  subscribe = async (topic: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!this.client) {
        this.logger.error('Not connected to broker');
        return;
      }

      this.client.subscribe(topic, (err) => {
        this.logger.trace('Subscribing to:', topic, err);
        resolve();
      });
    });
  };

  onDisconnect = (): void => {

    this.logger.error('onDisconnect');
    this.sendMqttUpdate();

    if (!this.disconnecting) {
      this.logger.error('Disconnected from broker');

      this.reconnect()
        .then(() => {
          this.logger.info('Reconnected to broker');
        })
        .catch((error) => {
          this.logger.error('Failed to reconnect to broker:', JSON.stringify(error));
        });
    }
  };

  reconnect = async (): Promise<void> => {
    this.logger.warn('Reconnecting to broker');
    const isConnected = await this.connect(this.config!);

    if (isConnected) {
      this.sendMqttUpdate();

      for (const topic in this._attributeSubscriptions) {
        this.logger.trace('Resubscribing to:', topic);
        await this.subscribe(topic);
      }
    }
  };

  disconnect = async (): Promise<void> => {
    if (this.client) {
      this.disconnecting = true;
      this.logger.info('Disconnecting from broker');
      this.client.end(() => {
        this.sendMqttUpdate();
      });

    }
  };

  private onMessage = async (topic: string, message: Buffer): Promise<void> => {
    await this.onMessageAttributeSubscriptions(topic, message);
    await this.onMessageTopicSubscriptions(topic, message);
  };

  private onMessageTopicSubscriptions = async (topic: string, message: Buffer): Promise<void> => {
    if (!this._topicSubscriptions[topic]) {
      return;
    }

    const providers = this._topicSubscriptions[topic];

    for (const provider of providers) {
      provider.device.onMessage?.(topic, message);
    }
  };

  private onMessageAttributeSubscriptions = async (topic: string, message: Buffer): Promise<void> => {
    const payload = message.toString();
    if (!this._attributeSubscriptions[topic]) {
      return;
    }

    const subscriptions = this._attributeSubscriptions[topic];

    for (const subscription of subscriptions) {
      const { provider, attribute } = subscription;
      try {
        await this.hub.state.onMessage(provider, attribute, { payload, topic });
      } catch (error) {
        this.logger.error('Error processing message on attribute subscription:', topic, payload, error);
      }
    }
  }

  private sendMqttUpdate = (): void => {
    this.hub.server.sendMqttUpdate({
      connected: this.isConnected
    });
  };
}
