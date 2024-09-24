import expressWs from 'express-ws';
import { Logger as ILogger } from 'quantumhub-sdk';
import { WebSocket } from 'ws';
import { Hub } from '../../hub';
import { getLevelIndex, LogData } from '../../logger/logger';
import { ApiSocketConnection } from '../api-socket-connection';
import { Webserver } from '../webserver';

interface LoggingWebsocket {
  websocket: WebSocket;
  identifier: string;
  level: string;
}

export class ApiProcessLogWebsocket implements ApiSocketConnection {
  private logger: ILogger;
  private logWebsockets: LoggingWebsocket[] = [];

  server: Webserver;
  hub: Hub;

  constructor(hub: Hub, server: Webserver) {
    this.server = server;
    this.hub = hub;
    this.logger = this.hub.createLogger('ApiProcessLogWebsocket');
  }

  initialize = async (ws: expressWs.Instance): Promise<void> => {
    this.logger.info('Initializing');

    ws.app.ws('/api/process/:identifier/log/:level', (ws, req) => {
      const logWs = {
        websocket: ws,
        identifier: req.params.identifier,
        level: req.params.level,
      };

      this.logger.info('Logging socket connected', req.params.identifier, req.params.level);
      this.logWebsockets.push(logWs);

      ws.on('close', () => {
        this.logWebsockets = this.logWebsockets.filter((socket) => socket !== logWs);
        this.logger.info('Logging socket disconnected', req.params.identifier);
      });
    });
  };

  send = async (logData: LogData): Promise<void> => {
    if (this.logWebsockets.length === 0) {
      return;
    }

    const sockets = this.logWebsockets.filter((logWebsocket) => logWebsocket.identifier === logData.identifier);
    sockets.forEach((logWebsocket) => {
      const logLevelIndex = getLevelIndex(logData.level);
      const logWebsocketLevelIndex = getLevelIndex(logWebsocket.level);
      if (logLevelIndex >= logWebsocketLevelIndex) {
        logWebsocket.websocket.send(JSON.stringify(logData));
      }
    });
  };
}
