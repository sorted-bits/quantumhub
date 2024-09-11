import { Logger as ILogger } from 'quantumhub-sdk';
import { LogConfig } from '../config/interfaces/log-config';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export class Logger implements ILogger {
  private name: string;
  private config: LogConfig;
  private configLevel: number;

  levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

  constructor(name: string, config: LogConfig) {
    this.name = name;
    this.config = config;

    this.configLevel = this.levels.indexOf(this.config.level.toLocaleUpperCase());
  }

  private write = (color: RGB, level: string, message?: any, ...messages: any[]) => {
    const levelIndex = this.levels.indexOf(level);

    let shouldLog = this.config.included_modules.length === 0 || (this.config.included_modules.length > 0 && this.config.included_modules.includes(this.name));

    if (shouldLog && this.config.excluded_modules.includes(this.name)) {
      shouldLog = false;
    }

    if (shouldLog && levelIndex < this.configLevel) {
      shouldLog = false;
    }

    if (shouldLog) {
      //      console.log(`\x1b[${color}m[${level}]\x1b[0m`, `[${this.name}]`, ...[message, ...messages]);
      console.log(`\u001b[38;2;${color.r};${color.g};${color.b}m[${level}]`, `[${this.name}]`, ...[message, ...messages], `\u001b[0m`);
    }
  };

  trace = (message?: any, ...messages: any[]): void => {
    this.write({ r: 245, g: 245, b: 245 }, 'TRACE', message, ...messages);
  };

  debug = (message?: any, ...messages: any[]): void => {
    this.write({ r: 179, g: 179, b: 179 }, 'DEBUG', message, ...messages);
  };

  info = (message?: any, ...messages: any[]): void => {
    this.write({ r: 0, g: 145, b: 39 }, 'INFO', message, ...messages);
  };

  warn = (message?: any, ...messages: any[]): void => {
    this.write({ r: 235, g: 171, b: 12 }, 'WARN', message, ...messages);
  };

  error = (message?: any, ...messages: any[]): void => {
    this.write({ r: 252, g: 80, b: 80 }, 'ERROR', message, messages);
  };

  fatal = (message?: any, ...messages: any[]): void => {
    this.write({ r: 230, g: 0, b: 0 }, 'FATAL', message, ...messages);
  };
}
