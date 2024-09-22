import express from 'express';
import { create } from 'express-handlebars';
import expressWs from 'express-ws';
import http from 'http';
import { Logger } from 'quantumhub-sdk';
import * as ws from 'ws';
import YAML from 'yaml';

import { WebConfig } from '../config/interfaces/web-config';
import { Hub } from '../hub';
import { getLevelIndex, LogData } from '../logger/logger';
import { Process, processToDto } from '../package-loader/interfaces/process';
import { debugEventsForDeviceType } from './debugging';

interface LoggingWebsocket {
  websocket: ws.WebSocket;
  identifier: string;
  level: string;
}

export class Webserver {
  private express: express.Express;
  private config: WebConfig;
  private logger: Logger;
  private hub: Hub;
  private server?: http.Server;

  private processStatusWebsockets: ws.WebSocket[] = [];
  private logWebsockets: LoggingWebsocket[] = [];

  constructor(hub: Hub) {
    this.hub = hub;

    const hbe = create({
      helpers: {
        json: (context: any) => JSON.parse(context),
        eq: (a: any, b: any) => a === b,
      },
      partialsDir: this.hub.options.uiPath + '/views/partials',
    });

    this.express = express();
    this.express.engine('handlebars', hbe.engine);
    this.express.set('view engine', 'handlebars');
    this.express.set('views', this.hub.options.uiPath + '/views');
    this.express.use(express.json());

    this.express.on('error', (err) => {
      this.logger.error('Webserver error:', err);
    });

    this.config = hub.config.web;
    this.logger = hub.createLogger('Webserver');

    this.logger.info('Webserver initialized');
  }

  sendProcessUpdate = (process: Process): void => {
    if (this.processStatusWebsockets.length === 0) {
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

    this.processStatusWebsockets.forEach((ws) => ws.send(JSON.stringify(processData)));
  };

  sendLog = (logData: LogData): void => {
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

  start = async (): Promise<boolean> => {
    console.log('Starting webserver');
    const ws = expressWs(this.express);

    this.express.use('/scripts', express.static(this.hub.options.uiPath + '/scripts'));
    this.express.use('/css', express.static(this.hub.options.uiPath + '/css'));

    ws.app.ws('/api/processes/status', (ws, req) => {
      this.processStatusWebsockets.push(ws);

      ws.on('message', (msg) => {
        this.logger.info('Received message:', msg);
        ws.send('Hello from server');
      });

      ws.on('close', () => {
        this.processStatusWebsockets = this.processStatusWebsockets.filter((socket) => socket !== ws);
        this.logger.info('Websocket disconnected');
      });
    });

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
        this.logger.info('Logging socket disconnected');
      });
    });

    this.express.get('/api/processes', (req, res) => {
      const data = this.hub.packages.data();
      res.send(data);
    });

    this.express.get('/api/process/:identifier', (req, res) => {
      const identifier = req.params.identifier;
      const process = this.hub.packages.getProcess(identifier);

      if (!process) {
        return res.status(404).send('Process not found');
      }

      res.send(processToDto(process));
    });

    this.express.get('/api/definitions', (req, res) => {
      const data = this.hub.packages.definitions;
      res.send(data);
    });

    this.express.post('/api/process/:identifier/debug', (req, res) => {
      const identifier = req.params.identifier;
      const process = this.hub.packages.getProcess(identifier);

      if (!process) {
        this.logger.error('Process not found', identifier);
        return res.status(404).send('Process not found');
      }

      this.logger.info('Sending debug event', req.body);

      if (!req.body.event) {
        return res.status(400).send('Event not found');
      }

      const event = req.body.event;
      if (typeof (process.provider.device as any)[event] !== 'function') {
        this.logger.error('Event not found', event);
        return res.status(400).send('Event not found');
      }

      const parameters = req.body;
      delete parameters.event;

      const allItems = debugEventsForDeviceType().flatMap((eventBlock) => eventBlock.items);
      const item = allItems.find((item) => item.name === event);

      if (!item) {
        this.logger.error('Event not found', event);
        return res.status(400).send('Event not found');
      }

      const methodParameters: any[] = [];
      if (Object.keys(parameters).length > 0) {
        Object.keys(parameters).forEach((key) => {
          const value = parameters[key];
          this.logger.info('Parameter', key, value);

          if (value === undefined) {
            this.logger.error('Parameter not found', key);
            return res.status(400).send(`Parameter ${key} not found`);
          }

          if (key.toLocaleLowerCase() === 'attribute') {
            const attribute = process.provider.getAttribute(value);
            if (!attribute) {
              this.logger.error('Attribute not found', value);
              return res.status(400).send(`Attribute ${value} not found`);
            }
            methodParameters.push(attribute);
          } else {
            methodParameters.push(value);
          }
        });
      }

      this.logger.trace('Calling debug event', event, methodParameters);
      (process.provider.device as any)[event](...methodParameters);

      res.send('OK');
    });

    this.express.post('/api/processes/:identifier/states/:state', (req, res) => {
      const identifier = req.params.identifier;
      const state = req.params.state;
      const process = this.hub.packages.getProcess(identifier);

      if (!process) {
        return res.status(404).send('Process not found');
      }

      if (state === 'start') {
        this.hub.packages.startProcess(process.uuid);
      } else if (state === 'stop') {
        this.hub.packages.stopProcess(process.uuid);
      }

      res.send('OK');
    });

    this.express.get('/', (req, res) => {
      res.render('home', { test: 'Hello World' });
    });

    this.express.get('/mqtt', (req, res) => {
      res.render('mqtt', { topics: this.hub.mqtt.topicSubscriptions, attributes: this.hub.mqtt.attributeSubscriptions });
    });

    this.express.get('/configuration', (req, res) => {
      res.render('configuration', { config: YAML.stringify(this.hub.config) });
    });

    this.express.get('/process/:identifier', (req, res) => {
      const identifier = req.params.identifier;
      this.logger.info('Getting process details', identifier);

      const process = this.hub.packages.getProcess(identifier);

      if (!process) {
        return res.status(404).send('Process not found');
      }

      res.render('details', {
        process: processToDto(process),
        config: YAML.stringify(process.provider.config),
        definition: process.provider.definition,
        debugEvents: debugEventsForDeviceType(),
      });
    });

    const server = this.express.listen(this.config.port, () => {
      this.logger.info('Webserver started on port:', this.config.port);
    });

    this.express.get('/api/processes/:identifier/states', (req, res) => {
      const identifier = req.params.identifier;
      const process = this.hub.packages.getProcess(identifier);

      if (!process) {
        return res.status(404).send('Process not found');
      }

      const states = this.hub.state.getAttributes(process.provider);
      res.send(states);
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
