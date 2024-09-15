import { Logger } from 'quantumhub-sdk';

import express from 'express';
import expressWs from 'express-ws';
import http from 'http';
import * as ws from 'ws';
import { WebConfig } from '../config/interfaces/web-config';
import { Hub } from '../hub';
import { Process } from '../module-loader/interfaces/process';

export class Webserver {
  private express: express.Express;
  private config: WebConfig;
  private logger: Logger;
  private hub: Hub;
  private server?: http.Server;

  private processStatusWebsocket?: ws.WebSocket;

  constructor(hub: Hub) {
    this.hub = hub;

    this.express = express();
    this.config = hub.config.web;
    this.logger = hub.createLogger('Webserver', hub.config.log);

    this.logger.info('Webserver initialized');
  }

  sendProcessUpdate = (process: Process): void => {
    if (!this.processStatusWebsocket) {
      this.logger.warn('No websocket connected');
      return;
    }

    const processData = {
      uuid: process.uuid,
      identifier: process.provider.config.identifier,
      name: process.name,
      status: process.status,
      config: process.provider.config,
      definition: process.provider.definition,
      startTime: process.startTime,
    };

    this.processStatusWebsocket.send(JSON.stringify(processData));
  };

  start = async (): Promise<boolean> => {
    const ws = expressWs(this.express);

    this.express.use('/', express.static(this.hub.options.publicPath));

    ws.app.ws('/api/processes/status', (ws, req) => {
      this.processStatusWebsocket = ws;

      ws.on('message', (msg) => {
        this.logger.info('Received message:', msg);
        ws.send('Hello from server');
      });
      this.logger.info('Websocket connected', req);
    });

    this.express.on('error', (err) => {
      this.logger.error('Webserver error:', err);
    });

    this.express.get('/api/processes', (req, res) => {
      const data = this.hub.modules.data();
      res.send(data);
    });

    this.express.get('/api/definitions', (req, res) => {
      const data = this.hub.modules.definitions;
      res.send(data);
    });

    this.express.get('/api/processes/:identifier/states', (req, res) => {
      const identifier = req.params.identifier;
      const process = this.hub.modules.process(identifier);

      if (!process) {
        return res.status(404).send('Process not found');
      }

      const states = this.hub.state.getAttributes(process.provider);
      res.send(states);
    });

    this.express.post('/api/processes/:identifier/states/:state', (req, res) => {
      const identifier = req.params.identifier;
      const state = req.params.state;
      const process = this.hub.modules.process(identifier);

      if (!process) {
        return res.status(404).send('Process not found');
      }

      if (state === 'start') {
        this.hub.modules.startProcess(process.uuid);
      } else if (state === 'stop') {
        this.hub.modules.stopProcess(process.uuid);
      }

      res.send('OK');
    });

    this.express.on('error', (err) => {
      this.logger.error('Webserver error:', err);
    });

    const server = this.express.listen(this.config.port, () => {
      this.logger.info('Webserver started on port:', this.config.port);
    });

    this.server = server;
    return true;
  };

  stop = async (): Promise<void> => {
    if (!this.server) {
      return;
    }

    this.logger.trace('Stopping webserver');
  };
}
