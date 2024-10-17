import express from 'express';
import { create } from 'express-handlebars';
import expressWs from 'express-ws';
import http from 'http';
import { Logger } from 'quantumhub-sdk';
import YAML from 'yaml';

import cors from 'cors';

import { WebConfig } from '../config/interfaces/web-config';
import { Hub } from '../hub';
import { LogData } from '../logger/logger';
import { Process } from '../process-manager/process';
import { debugEventsForDeviceType } from './debugging';
import { apiProcessDebugRequest } from './requests/api-process-debug';
import { ApiProcessAttributesWebsocket } from './websockets/api-process-attributes';
import { ApiProcessLogWebsocket } from './websockets/api-process-log';
import { ApiProcessStatusWebsocket } from './websockets/api-process-status';
import { ApiProcessesStatusWebsocket } from './websockets/api-processes-status';
import { ApiProcessCacheWebsocket } from './websockets/api-process-cache';
import { Dependency } from '../config/interfaces/dependency';
import { toProcessDTO } from '../../ui/views/dtos/process-dto';
import { MqttStatusWebsocket } from './websockets/mqtt-status';

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
  private apiProcessCacheWebsocket: ApiProcessCacheWebsocket;
  private mqttStatusWebsocket: MqttStatusWebsocket;

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
    this.express.disable('view cache');
    this.express.engine('handlebars', hbe.engine);
    this.express.set('view engine', 'handlebars');
    this.express.set('views', this.hub.options.uiPath + '/views');
    this.express.use(express.json());
    this.express.use(express.urlencoded());
    this.express.use(cors());
    this.express.on('error', (err) => {
      this.logger.error('Webserver error:', err);
    });

    this.config = hub.config.web;
    this.logger = hub.createLogger('Webserver');

    this.apiProcessesStatusWebsocket = new ApiProcessesStatusWebsocket(this.hub, this);
    this.apiProcessStatusWebsocket = new ApiProcessStatusWebsocket(this.hub, this);
    this.apiProcessLogWebsocket = new ApiProcessLogWebsocket(this.hub, this);
    this.apiProcessAttributesWebsocket = new ApiProcessAttributesWebsocket(this.hub, this);
    this.apiProcessCacheWebsocket = new ApiProcessCacheWebsocket(this.hub, this);
    this.mqttStatusWebsocket = new MqttStatusWebsocket(this.hub, this);
    this.logger.info('Webserver initialized');
  }

  sendMqttUpdate = (data: any): void => {
    this.mqttStatusWebsocket.send(data);
  };

  sendProcessUpdate = (process: Process): void => {
    const data = toProcessDTO(this.hub, process);

    this.apiProcessStatusWebsocket.send(data);
    this.apiProcessesStatusWebsocket.send([data]);
  };

  sendStateUpdate = (data: any): void => {
    this.apiProcessAttributesWebsocket.send(data);
  };

  sendLog = (logData: LogData): void => {
    this.apiProcessLogWebsocket.send(logData);
  };

  start = async (): Promise<boolean> => {
    const ws = expressWs(this.express);

    this.apiProcessesStatusWebsocket.initialize(ws);
    this.apiProcessStatusWebsocket.initialize(ws);
    this.apiProcessLogWebsocket.initialize(ws);
    this.apiProcessAttributesWebsocket.initialize(ws);
    this.apiProcessCacheWebsocket.initialize(ws);
    this.mqttStatusWebsocket.initialize(ws);

    this.express.post('/api/process/:identifier/debug', (req, res) => apiProcessDebugRequest(this.hub, req, res));

    this.express.post('/api/processes/:identifier/states/:state', (req, res) => {
      const identifier = req.params.identifier;
      const state = req.params.state;
      const process = this.hub.processes.getProcess(identifier);

      if (!process) {
        return res.status(404).send('Process not found');
      }

      if (state === 'start') {
        this.hub.processes.startProcess(process.uuid);
      } else if (state === 'stop') {
        this.hub.processes.stopProcess(process.uuid);
      }

      res.send('OK');
    });

    this.express.post('/api/mqtt/status/:command', async (req, res) => {
      const command = req.params.command.toLocaleLowerCase();

      if (command === 'disconnect') {
        await this.hub.mqtt.disconnect();
      } else if (command === 'connect') {
        await this.hub.mqtt.connect(this.hub.config.mqtt);
      } else if (command === 'reconnect') {
        await this.hub.mqtt.reconnect();
      } else {
        res.status(400).send('Invalid command');
        return;
      }

      res.send('OK');
    });

    this.express.post('/api/package/:identifier/reload', (req, res) => {
      const identifier = req.params.identifier;
      this.hub.dependencyManager.reload(identifier);
      res.send({ status: 'ok' });
    });

    this.express.post('/api/package/refresh', async (req, res) => {
      await this.hub.dependencyManager.onlineRepository.refresh();
      res.send('OK');
    });

    this.express.post('/api/package/install', (req, res) => {
      const { repository } = req.body;

      this.hub.dependencyManager.updateRepository(repository).then(() => {
        res.send({ status: 'ok' });
      }).catch((error) => {
        res.status(500).send({ status: 'error', error: error.message });
      });
    });

    this.express.get('/api/process/:identifier', async (req, res) => {
      const identifier = req.params.identifier;
      const process = this.hub.processes.getProcess(identifier);

      this.logger.info('Getting process details', identifier);

      if (!process) {
        this.logger.error('Process not found', identifier);
        return res.status(404).send('Process not found');
      }

      this.logger.info('Process found', identifier);
      const states = this.hub.state.getAttributes(process.provider) ?? {};

      return res.json({
        cache: false,
        process: toProcessDTO(this.hub, process),
        configYAML: YAML.stringify(process.provider.config),
        definition: process.provider.dependency.definition,
        attributes: process.provider.getAttributes(),
        debugEvents: debugEventsForDeviceType(),
        states: this.displayStates(states)
      });
    });

    this.express.get('/api/packages', (req, res) => {
      const dependencies: Dependency[] = this.hub.dependencyManager.all();

      for (const definition of dependencies) {
        const count = this.hub.processes.getProcesses().filter((process) => process.provider.definition.name === definition.definition.name).length;
        (definition as any)['processes'] = count;
      }

      res.json({
        packages: dependencies, repositoryPackages: this.hub.dependencyManager.onlineRepository.dependencies
      });
    });

    this.express.get('/api/mqtt', (req, res) => {
      res.json({
        connected: this.hub.mqtt.isConnected,
        topics: this.hub.mqtt.topicSubscriptions,
        attributes: this.hub.mqtt.attributeSubscriptions
      });
    });

    this.express.get('/api/configuration', (req, res) => {
      res.json({ config: YAML.stringify(this.hub.config), configuration: this.hub.config });
    });


    const server = this.express.listen(this.config.port, () => {
      this.logger.info('Webserver started on port:', this.config.port);
    });

    this.server = server;
    return true;
  };

  displayStates = (states: { [key: string]: any }): { [key: string]: any } => {
    const result: { [key: string]: any } = {};

    for (const key in states) {
      const state = states[key];

      const stateObject: { [key: string]: any } = {};

      for (const stateKey in state) {
        stateObject[stateKey] = JSON.stringify(state[stateKey]);
      }

      result[key] = stateObject;

    }

    return result;
  }

  stop = async (): Promise<void> => {
    if (!this.server) {
      return;
    }

    this.logger.trace('Stopping webserver');
  };
}
