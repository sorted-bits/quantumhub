import express from 'express';

import { parseArguments } from './models/helpers/parse-arguments';
import { Hub } from './models/hub';
import { Logger } from './models/logger/logger';

const configFile = parseArguments(process.argv);

if (!configFile) {
  throw new Error('No configuration file provided');
}

const home = new Hub(configFile);

const logger = new Logger('App', home.config.log);

logger.info('Starting QuantumHub');

const exitHandler = () => {
  logger.info('Exiting QuantumHub');
};

/**
 * Route all other exit cases to 'exit' to handle
 *
 * @param {object} options
 * @param {number|string} exitCode
 */
const exitRouter = (error: any, options: any) => {
  if (error && home.logger) {
    home.logger.error('Error:', error);
  } else if (error && !home.logger) {
    console.log('Error:', error);
  }

  if (options.exit) {
    logger.info('Closing down services');

    home.modules.stopAll().finally(() => {
      home.state.publishBridgeStatus(false).finally(() => {
        process.exit();
      });
    });
  }
};

// Catching all other exit codes and route to process.exit() ('exit' code)
// Then handler exit code to do cleanup
[`SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
  process.on(eventType, (error, source) => {
    exitRouter(error, { exit: true, eventType: eventType });
  });
});

process.on('exit', exitHandler);

const initializeModules = async () => {
  const result = await home.initialize();

  if (!result) {
    throw new Error('Failed to initialize home');
  }

  const scanResult = await home.modules.scanFolder(home.config.modules_path);

  if (scanResult) {
    logger.trace('Scanned folder:', home.config.modules_path);
  }

  await home.modules.startAll();
};

initializeModules()
  .then(() => {
    logger.info('Modules loaded');

    const app = express();
    const port = home.config.web.port;
    app.on('error', (err) => {
      logger.error('Webserver error:', err);
    });

    app.get('/', (req, res) => {
      res.send(`QuantumHub`);
    });

    app.get('/processes', (req, res) => {
      const data = home.modules.data();
      res.send(data);
    });

    app.get('/processes/:identifier/states', (req, res) => {
      const identifier = req.params.identifier;
      const process = home.modules.process(identifier);

      if (!process) {
        return res.status(404).send('Process not found');
      }

      const states = home.state.getAttributes(process.provider);
      res.send(states);
    });

    const server = app.listen(port, () => {
      return logger.info(`Webserver is listening at http://localhost:${port}`);
    });

    home.logger.trace('Webserver started');
  })
  .catch((err) => {
    logger.error('Error loading modules:', err);
  });
