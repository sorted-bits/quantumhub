import expressWs from 'express-ws';
import { Logger } from 'quantumhub-sdk';
import { WebSocket } from 'ws';
import { Hub } from '../../hub';
import { ApiSocketConnection } from '../api-socket-connection';
import { Webserver } from '../webserver';

interface ProcessAttributesData {
  identifier: string;
  attribute: string | undefined;
  time: string;
  value: any;
}

export class ApiProcessAttributesWebsocket implements ApiSocketConnection {
  private logger: Logger;
  private stateWebsocketsByIdentifier: { [identifier: string]: WebSocket[] } = {};

  server: Webserver;
  hub: Hub;

  constructor(hub: Hub, server: Webserver) {
    this.server = server;
    this.hub = hub;
    this.logger = this.hub.createLogger('ApiProcessAttributesWebsocket');
  }

  initialize = async (ws: expressWs.Instance): Promise<void> => {
    this.logger.trace('Initializing');

    ws.app.ws('/api/process/:identifier/attributes', (ws, req) => {
      const identifier = req.params.identifier;
      const process = this.hub.packages.processManager.getProcess(identifier);
      if (!process) {
        this.logger.error('Process not found', identifier);
        return;
      }

      if (!this.stateWebsocketsByIdentifier[identifier]) {
        this.stateWebsocketsByIdentifier[identifier] = [];
      }

      this.stateWebsocketsByIdentifier[identifier].push(ws);
      this.logger.trace('Process state websocket connected', identifier, this.stateWebsocketsByIdentifier[identifier].length);

      ws.on('close', () => {
        this.stateWebsocketsByIdentifier[identifier] = this.stateWebsocketsByIdentifier[identifier].filter((socket) => socket !== ws);
        this.logger.trace('Process state websocket disconnected', identifier);
      });
    });
  };

  send = async (data: ProcessAttributesData): Promise<void> => {
    if (this.stateWebsocketsByIdentifier[data.identifier]?.length === 0) {
      return;
    }

    this.stateWebsocketsByIdentifier[data.identifier]?.forEach((ws) => ws.send(JSON.stringify(data)));
  };
}
