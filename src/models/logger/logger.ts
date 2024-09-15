import { DateTime } from 'luxon';
import { Logger as ILogger } from 'quantumhub-sdk';
import { LogConfig } from '../config/interfaces/log-config';
import { Hub } from '../hub';
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LogData {
  time: string;
  identifier: string;
  level: string;
  name: string;
  message: string;
  messages: any[];
}

export const getLevelIndex = (level: string): number => {
  return ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].indexOf(level.toLocaleUpperCase());
};

export class Logger implements ILogger {
  private name: string;
  private config: LogConfig;
  private configLevel: number;
  private hub: Hub;
  levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

  constructor(name: string, hub: Hub, config: LogConfig) {
    this.name = name;
    this.config = config;
    this.hub = hub;

    this.configLevel = getLevelIndex(this.config.level);
  }

  private write = (color: RGB, level: string, message?: any, ...messages: any[]) => {
    const currentTime = DateTime.now().toFormat('HH:mm:ss.SSS');

    const logData: LogData = {
      time: currentTime,
      identifier: this.name,
      level: level,
      name: this.name,
      message: message,
      messages: messages,
    };

    if (this.hub.server) {
      this.hub.server.sendLog(logData);
    } else {
      console.log('ERROR: Server not defined');
    }

    const levelIndex = getLevelIndex(level);

    let shouldLog = this.config.included_packages.length === 0 || (this.config.included_packages.length > 0 && this.config.included_packages.includes(this.name));

    if (shouldLog && this.config.excluded_packages.includes(this.name)) {
      shouldLog = false;
    }

    if (shouldLog && levelIndex < this.configLevel) {
      shouldLog = false;
    }

    if (shouldLog) {
      //      console.log(`\x1b[${color}m[${level}]\x1b[0m`, `[${this.name}]`, ...[message, ...messages]);
      console.log(`${currentTime}: \u001b[38;2;${color.r};${color.g};${color.b}m[${level}]`, `[${this.name}]`, ...[message, ...messages], `\u001b[0m`);
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
