import { connect, MqttClient } from 'mqtt';
import { Logger as ILogger } from 'quantumhub-sdk';
import { Home } from '../../home';
import { Logger } from '../../logger/logger';
import { MqttConfig } from '../configuration-manager/config/mqtt-config';

export class MQTT {
  private config?: MqttConfig;

  private logger: ILogger;
  private client: MqttClient | undefined = undefined;
  private home: Home;

  get isConnected(): boolean {
    return this.client ? this.client.connected : false;
  }

  constructor(home: Home) {
    this.home = home;
    this.logger = new Logger().setName('MqttManager');
  }

  async connect(configuration: MqttConfig): Promise<boolean> {
    this.config = configuration;

    const {
      host,
      port,
      username,
      password,
      protocol,
      validate_certificate: validateCertificate,
    } = this.config;

    if (this.client && this.client.connected) {
      this.logger.info('Already connected, reconnecting');
      this.client.end();
    }

    const brokerUrl = `${protocol ?? 'mqtt'}://${host}:${port ?? 1883}`;
    this.logger.info('Connecting to broker:', brokerUrl);

    return new Promise((resolve, reject) => {
      this.client = connect(`${protocol ?? 'mqtt'}://${host}`, {
        username,
        password,
        port: port,
        rejectUnauthorized: validateCertificate ?? true,
      });

      this.client.on('connect', () => {
        this.logger.info('Connected to broker:', brokerUrl);

        this.home.state.publishBridgeStatus(true).then(() => {
          this.logger.info('Bridge status published');

          resolve(true);
        });
      });

      this.client.on('error', (error) => {
        this.logger.error('Error:', error);
        reject(error);
      });

      this.client.on('disconnect', () => {
        this.logger.info('Disconnected from broker:', brokerUrl);
      });

      this.client.on('message', (topic, message) => {
        this.logger.info('Received message:', topic, message.toString());
        this.onMessage(topic, message);
      });
    });
  }

  async publish(
    topic: string,
    message: string,
    retain: boolean = true
  ): Promise<void> {
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
  }

  async subscribe(topic: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client) {
        this.logger.error('Not connected to broker');
        return;
      }

      this.client.subscribe(topic, () => {
        this.logger.info('Subscribing to:', topic);
        resolve();
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.logger.info('Disconnecting from broker');
      this.client.end();
    }
  }

  private async onMessage(topic: string, message: Buffer): Promise<void> {
    await this.home.state.onMessage(topic, message);
  }
}
