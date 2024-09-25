import expressWs from 'express-ws';
import { Logger as ILogger } from 'quantumhub-sdk';
import { WebSocket } from 'ws';
import { Hub } from '../../hub';
import { Process, processToDto } from '../../package-loader/interfaces/process';
import { ApiSocketConnection } from '../api-socket-connection';
import { Webserver } from '../webserver';

export class ApiProcessStatusWebsocket implements ApiSocketConnection {
  private logger: ILogger;
  private sockets: { [identifier: string]: WebSocket[] } = {};

  server: Webserver;
  hub: Hub;

  constructor(hub: Hub, server: Webserver) {
    this.server = server;
    this.hub = hub;
    this.logger = this.hub.createLogger('ApiProcessStatusWebsocket');
  }

  initialize = async (ws: expressWs.Instance): Promise<void> => {
    this.logger.info('Initializing');

    ws.app.ws('/api/process/:identifier/status', (ws, req) => {
      const identifier = req.params.identifier;

      const process = this.hub.packages.getProcess(identifier);

      this.logger.info('Websocket connected', identifier);

      if (!process) {
        this.logger.error('Process not found', identifier);
        return;
      }

      if (!this.sockets[identifier]) {
        this.sockets[identifier] = [];
      }

      this.sockets[identifier].push(ws);

      ws.on('close', () => {
        this.sockets[identifier] = this.sockets[identifier].filter((socket) => socket !== ws);
        this.logger.info('Websocket disconnected', identifier);
      });
    });
  };

  sendCurrentState = async (ws: WebSocket, process: Process): Promise<void> => {
    const data = processToDto(this.hub, process);
    this.logger.info('Sending', data);
    ws.send(processToDto(this.hub, process));
  };

  send = async (data: any): Promise<void> => {
    const process = data as Process;

    this.logger.info('Sending', process.identifier);
    if (!this.sockets[process.identifier]) {
      return;
    }

    this.sockets[process.identifier].forEach((socket) => socket.send(JSON.stringify(data)));
  };
}