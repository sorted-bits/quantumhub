import { ProcessStatus } from '../enums/status';
import { ModuleProvider } from '../models/module-provider';

export interface Process {
  uuid: string;
  provider: ModuleProvider;
  status: ProcessStatus;
  startTime?: Date;
  stopTime?: Date;
}
