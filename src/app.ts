import express from 'express';

import { Home } from './models/home';
import { Logger } from './models/logger/logger';
import { parseArguments } from './models/parse-arguments';

const configFile = parseArguments(process.argv);

const home = new Home(configFile);

const logger = new Logger().setName('App');

logger.info('Starting QuantumHub');

function exitHandler() {
  logger.info('Exiting QuantumHub');
}

/**
 * Route all other exit cases to 'exit' to handle
 *
 * @param {object} options
 * @param {number|string} exitCode
 */
function exitRouter(options: any) {
  if (options.exit) {
    logger.info('Closing down services');

    home.modules.stopAll().finally(() => {
      home.state.publishBridgeStatus(false).finally(() => {
        process.exit();
      });
    });
  }
}

// Catching all other exit codes and route to process.exit() ('exit' code)
// Then handler exit code to do cleanup
[`SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach(
  (eventType) => {
    process.on(eventType, exitRouter.bind(null, { exit: true }));
  }
);

process.on('exit', exitHandler);

const initializeModules = async () => {
  const result = await home.initialize();

  if (!result) {
    throw new Error('Failed to initialize home');
  }

  for (const folder of home.config.paths) {
    const scanResult = await home.modules.scanFolder(folder);

    if (scanResult) {
      logger.info('Scanned folder:', folder);
    }
  }

  await home.modules.startAll();
};

initializeModules()
  .then(() => {
    logger.info('Modules loaded');

    const app = express();
    const port = home.config.web.port;

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

    app.listen(port, () => {
      return logger.info(`Express is listening at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    logger.error('Error loading modules:', err);
  });
