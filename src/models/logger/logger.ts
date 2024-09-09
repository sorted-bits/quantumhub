import { Logger as ILogger } from 'quantumhub-sdk';

export class Logger implements ILogger {
  private name?: string;

  setName(name: string): ILogger {
    this.name = name;
    return this;
  }

  info(message?: any, ...messages: any[]): void {
    console.log('[INFO]', `[${this.name}]`, ...[message, ...messages]);
  }

  error(message?: any, ...messages: any[]): void {
    console.error('[ERROR]', `[${this.name}]`, ...[message, ...messages]);
  }
}
