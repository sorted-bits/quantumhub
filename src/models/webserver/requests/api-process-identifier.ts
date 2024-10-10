import { Request, Response } from 'express';
import { Hub } from '../../hub';

export const apiProcessIdentifierRequest = (hub: Hub, req: Request, response: Response) => {
  const identifier = req.params.identifier;
  const process = hub.processes.getProcess(identifier);

  if (!process) {
    return response.status(404).send('Process not found');
  }

  response.send(process);
};
