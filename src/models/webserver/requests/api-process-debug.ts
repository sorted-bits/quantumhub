import { Logger as ILogger } from 'quantumhub-sdk';
import { Hub } from '../../hub';
import { Process } from '../../package-loader/interfaces/process';
import { debugEventsForDeviceType } from '../debugging';

export const apiProcessDebugRequest = (hub: Hub, request: any, response: any) => {
  const identifier = request.params.identifier;
  const process = hub.packages.getProcess(identifier);
  const logger = hub.createLogger('apiProcessDebugRequest');

  if (!process) {
    logger.error('Process not found', identifier);
    return response.status(404).send('Process not found');
  }

  logger.info('Sending debug event', request.body);

  if (!request.body.event) {
    return response.status(400).send('Event not found');
  }

  const event = request.body.event;
  if (typeof (process.provider.device as any)[event] !== 'function') {
    logger.error('Event not found', event);
    return response.status(400).send('Event not found');
  }

  const parameters = request.body;
  delete parameters.event;

  callDeviceMethod(logger, hub, process, event, parameters)
    .then((result) => {
      response.status(result.code).send(result.message);
    })
    .catch((error) => {
      logger.error('Error calling debug event', error);
      response.status(500).send('Error calling debug event');
    });
};

const callDeviceMethod = async (logger: ILogger, hub: Hub, process: Process, event: string, parameters: any): Promise<{ code: number; message: string }> => {
  const allItems = debugEventsForDeviceType().flatMap((eventBlock) => eventBlock.items);
  const item = allItems.find((item) => item.name === event);

  if (!item) {
    logger.error('Event not found', event);
    return { code: 400, message: 'Event not found' };
  }

  if (event === 'stop') {
    hub.packages.stopProcess(process.uuid);
    return { code: 200, message: 'OK' };
  }

  if (event === 'start') {
    hub.packages.startProcess(process.uuid);
    return { code: 200, message: 'OK' };
  }

  const methodParameters: any[] = [];

  if (Object.keys(parameters).length > 0) {
    Object.keys(parameters).forEach((key) => {
      const value = parameters[key];
      logger.info('Parameter', key, value);

      if (value === undefined) {
        logger.error('Parameter not found', key);
        return { code: 400, message: `Parameter '${key}' not found` };
      }

      if (key.toLocaleLowerCase() === 'attribute') {
        const attribute = process.provider.getAttribute(value);
        if (!attribute) {
          logger.error('Attribute not found', value);
          return { code: 400, message: `Attribute '${key}' not found` };
        }
        methodParameters.push(attribute);
      } else {
        methodParameters.push(value);
      }
    });
  }

  logger.trace('Calling debug event', event, methodParameters);
  (process.provider.device as any)
    [event](...methodParameters)
    .then((result: any) => {
      logger.info('Method result', result);
    })
    .catch((error: any) => {
      logger.warn('Error calling method', error);
      return { code: 500, message: `Error calling method: ${error}` };
    });

  return { code: 200, message: 'OK' };
};
