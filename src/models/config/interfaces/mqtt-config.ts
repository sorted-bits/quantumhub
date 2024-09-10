export interface MqttConfig {
  host: string;
  port: number;
  base_topic: string;
  username?: string;
  password?: string;
  protocol: string;
  validate_certificate: boolean;
}
