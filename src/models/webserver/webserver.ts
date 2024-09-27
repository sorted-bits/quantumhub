import express from 'express';
import { create } from 'express-handlebars';
import expressWs from 'express-ws';
import http from 'http';
import { Logger } from 'quantumhub-sdk';
import YAML from 'yaml';

import { WebConfig } from '../config/interfaces/web-config';
import { Hub } from '../hub';
import { LogData } from '../logger/logger';
import { Process, processToDto } from '../package-loader/interfaces/process';
import { debugEventsForDeviceType } from './debugging';
import { apiProcessDebugRequest } from './requests/api-process-debug';
import { ApiProcessAttributesWebsocket } from './websockets/api-process-attributes';
import { ApiProcessLogWebsocket } from './websockets/api-process-log';
import { ApiProcessStatusWebsocket } from './websockets/api-process-status';
import { ApiProcessesStatusWebsocket } from './websockets/api-processes-status';

export class Webserver {
  private express: express.Express;
  private config: WebConfig;
  private logger: Logger;
  private hub: Hub;
  private server?: http.Server;

  private apiProcessesStatusWebsocket: ApiProcessesStatusWebsocket;
  private apiProcessStatusWebsocket: ApiProcessStatusWebsocket;
  private apiProcessLogWebsocket: ApiProcessLogWebsocket;
  private apiProcessAttributesWebsocket: ApiProcessAttributesWebsocket;

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

    this.apiProcessesStatusWebsocket = new ApiProcessesStatusWebsocket(this.hub, this);
    this.apiProcessStatusWebsocket = new ApiProcessStatusWebsocket(this.hub, this);
    this.apiProcessLogWebsocket = new ApiProcessLogWebsocket(this.hub, this);
    this.apiProcessAttributesWebsocket = new ApiProcessAttributesWebsocket(this.hub, this);
    this.logger.info('Webserver initialized');
  }

  sendProcessUpdate = (process: Process): void => {
    const data = processToDto(this.hub, process);

    this.apiProcessStatusWebsocket.send(data);
    this.apiProcessesStatusWebsocket.send(data);
  };

  sendStateUpdate = (data: any): void => {
    this.apiProcessAttributesWebsocket.send(data);
  };

  sendLog = (logData: LogData): void => {
    this.apiProcessLogWebsocket.send(logData);
  };

  start = async (): Promise<boolean> => {
    const ws = expressWs(this.express);

    this.express.use('/scripts', express.static(this.hub.options.uiPath + '/scripts'));
    this.express.use('/css', express.static(this.hub.options.uiPath + '/css'));

    this.apiProcessesStatusWebsocket.initialize(ws);
    this.apiProcessStatusWebsocket.initialize(ws);
    this.apiProcessLogWebsocket.initialize(ws);
    this.apiProcessAttributesWebsocket.initialize(ws);

    this.express.post('/api/process/:identifier/debug', (req, res) => apiProcessDebugRequest(this.hub, req, res));

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
      res.render('home', { processes: this.hub.packages.data() });
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

      const states = this.hub.state.getAttributes(process.provider) ?? {};

      res.render('details', {
        process: processToDto(this.hub, process),
        config: YAML.stringify(process.provider.config),
        definition: process.provider.definition,
        attributes: process.provider.getAttributes(),
        debugEvents: debugEventsForDeviceType(),
        states: Object.keys(states).sort().map((key) => {
          return {
            key,
            value: typeof states[key] === 'object' ? JSON.stringify(states[key]) : states[key],
          };
        }),
      });
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
