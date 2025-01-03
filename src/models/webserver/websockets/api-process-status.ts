import expressWs from 'express-ws';
import { Logger } from 'quantumhub-sdk';
import { WebSocket } from 'ws';
import { Hub } from '../../hub';
import { Process } from '../../process-manager/process';
import { ApiSocketConnection } from '../api-socket-connection';
import { Webserver } from '../webserver';
import { toProcessDTO } from '../../../ui/views/dtos/process-dto';

export class ApiProcessStatusWebsocket implements ApiSocketConnection {
  private logger: Logger;
  private sockets: { [identifier: string]: WebSocket[] } = {};

  server: Webserver;
  hub: Hub;

  constructor(hub: Hub, server: Webserver) {
    this.server = server;
    this.hub = hub;
    this.logger = this.hub.createLogger('ApiProcessStatusWebsocket');
  }

  initialize = async (ws: expressWs.Instance): Promise<void> => {
    this.logger.trace('Initializing');

    ws.app.ws('/api/process/:identifier/status', (ws, req) => {
      const identifier = req.params.identifier;
      const process = this.hub.processes.getProcess(identifier);

      if (!process) {
        this.logger.error('Process not found', identifier);
        return;
      }

      if (!this.sockets[identifier]) {
        this.sockets[identifier] = [];
      }

      this.logger.info('Websocket connected', identifier);
      this.sockets[identifier].push(ws);

      //this.send(toProcessDTO(this.hub, process));

      ws.on('close', () => {
        this.sockets[identifier] = this.sockets[identifier].filter((socket) => socket !== ws);
        this.logger.trace('Websocket disconnected', identifier);
      });
    });
  };

  sendCurrentState = async (ws: WebSocket, process: Process): Promise<void> => {
    const data = await toProcessDTO(this.hub, process) as any;
    ws.send(data);
  };

  send = async (data: any): Promise<void> => {
    const process = data as Process;

    if (!this.sockets[process.identifier]) {
      return;
    }

    this.sockets[process.identifier].forEach((socket) => socket.send(JSON.stringify(data)));
  };
}
