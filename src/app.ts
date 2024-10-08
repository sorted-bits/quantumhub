import { Hub } from './models/hub';
import { parseArguments } from './models/helpers/parse-arguments';

import path from 'path';

const configFile = parseArguments(process.argv);

if (!configFile) {
  throw new Error('No configuration file provided');
}

const hub = new Hub(configFile, {
  uiPath: path.join(__dirname, 'ui'),
});

hub.logger.info('Starting QuantumHub');

const exitHandler = () => {
  hub.logger.info('Exiting QuantumHub');
};

/**
 * Route all other exit cases to 'exit' to handle
 *
 * @param {object} options
 * @param {number|string} exitCode
 */
const exitRouter = (error: any, options: any) => {
  if (error && hub.logger) {
    hub.logger.error('Error:', error);
  } else if (error && !hub.logger) {
    console.log('Error:', error);
  }

  if (options.exit) {
    hub.logger.info('Closing down services');
    hub.stop().finally(() => {
      process.exit();
    });
  }
};

// Catching all other exit codes and route to process.exit() ('exit' code)
// Then handler exit code to do cleanup
[`SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
  process.on(eventType, (error) => {
    hub.logger.error('Error:', error, eventType);
    exitRouter(error, { exit: true, eventType: eventType });
  });
});

process.on('exit', exitHandler);

hub
  .initialize()
  .then(() => {
    hub.logger.info('QuantumHub initialized');
  })
  .catch((err) => {
    hub.logger.error('Error starting QuantumHub', err);
  });
