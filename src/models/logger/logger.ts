import { Logger as ILogger } from 'quantumhub-sdk';
import { LogConfig } from '../managers/configuration-manager/config/log-config';

export class Logger implements ILogger {
  private name: string;
  private config: LogConfig;
  private configLevel: number;

  levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

  constructor(name: string, config: LogConfig) {
    this.name = name;
    this.config = config;

    this.configLevel = this.levels.indexOf(this.config.level.toUpperCase());
  }

  private write(color: number, level: string, message?: any, ...messages: any[]) {
    const levelIndex = this.levels.indexOf(level);

    let shouldLog = this.config.included_modules.length === 0 || (this.config.included_modules.length > 0 && this.config.included_modules.includes(this.name));

    if (shouldLog && this.config.excluded_modules.includes(this.name)) {
      shouldLog = false;
    }

    if (shouldLog && levelIndex < this.configLevel) {
      shouldLog = false;
    }

    if (shouldLog) {
      console.log(`\x1b[${color}m[${level}]\x1b[0m`, `[${this.name}]`, ...[message, ...messages]);
    }
  }

  trace(message?: any, ...messages: any[]): void {
    this.write(37, 'TRACE', message, ...messages);
  }

  debug(message?: any, ...messages: any[]): void {
    this.write(37, 'DEBUG', message, ...messages);
  }

  info(message?: any, ...messages: any[]): void {
    this.write(32, 'INFO', message, ...messages);
  }

  warn(message?: any, ...messages: any[]): void {
    this.write(33, 'WARN', message, ...messages);
  }

  error(message?: any, ...messages: any[]): void {
    this.write(31, 'ERROR', message, messages);
  }

  fatal(message?: any, ...messages: any[]): void {
    this.write(91, 'FATAL', message, ...messages);
  }
}
