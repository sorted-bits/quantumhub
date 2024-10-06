import express from 'express';
import { create } from 'express-handlebars';
import expressWs from 'express-ws';
import http from 'http';
import { Logger } from 'quantumhub-sdk';
import YAML from 'yaml';

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
import { Dependency } from '../config/interfaces/dependencies';
import { toProcessDTO } from '../../ui/views/dtos/process-dto';

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
    this.logger.info('Webserver initialized');
  }

  sendProcessUpdate = (process: Process): void => {
    const data = toProcessDTO(this.hub, process);

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
    this.apiProcessCacheWebsocket.initialize(ws);

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

    this.express.get('/', (req, res) => {
      const processes = this.hub.processes.getProcesses().map((process) => toProcessDTO(this.hub, process));

      this.logger.info('Sending home', processes);
      res.render('home', { processes: processes });
    });

    this.express.get('/packages', (req, res) => {
      const dependencies: Dependency[] = this.hub.dependencyManager.all();

      for (const definition of dependencies) {
        const count = this.hub.processes.getProcesses().filter((process) => process.provider.definition.name === definition.definition.name).length;
        (definition as any)['processes'] = count;
      }
      res.render('packages', { packages: dependencies, repositoryPackages: this.hub.dependencyManager.onlineRepository.dependencies });
    });

    this.express.get('/mqtt', (req, res) => {
      res.render('mqtt', { topics: this.hub.mqtt.topicSubscriptions, attributes: this.hub.mqtt.attributeSubscriptions });
    });

    this.express.get('/configuration', (req, res) => {
      res.render('configuration', { config: YAML.stringify(this.hub.config) });
    });

    this.express.post('/package/:identifier/reload', (req, res) => {
      const identifier = req.params.identifier;
      this.hub.dependencyManager.reload(identifier);
      res.send('OK');
    });

    this.express.post('/package/install', (req, res) => {
      const { repository } = req.body;

      this.hub.dependencyManager.updateRepository(repository).then(() => {
        res.send('OK');
      }).catch((error) => {
        res.status(500).send('Error installing package: ' + error);
      });
    });

    this.express.get('/process/:identifier', async (req, res) => {
      const identifier = req.params.identifier;
      this.logger.info('Getting process details', identifier);

      const process = this.hub.processes.getProcess(identifier);

      if (!process) {
        return res.status(404).send('Process not found');
      }

      const states = this.hub.state.getAttributes(process.provider) ?? {};
      const cache = await this.hub.data.cache.all(process.provider);

      this.logger.info('Sending process details', process.provider.config);

      res.render('details', {
        process: toProcessDTO(this.hub, process),
        configYAML: YAML.stringify(process.provider.config),
        definition: process.provider.dependency.definition,
        attributes: process.provider.getAttributes(),
        debugEvents: debugEventsForDeviceType(),
        cache: Object.keys(cache).sort().map((key) => {
          return {
            key,
            value: cache[key],
          };
        }),
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
