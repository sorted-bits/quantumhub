import { ProcessStatus } from '../enums/status';
import { ModuleProvider } from '../models/module-provider';

export interface Process {
  uuid: string;
  name: string;
  identifier: string;
  provider: ModuleProvider;
  status: ProcessStatus;
  startTime?: Date;
  stopTime?: Date;
}

export const processToDto = (process: Process): any => {
  return {
    ...process,
    provider: undefined,
  };
};
