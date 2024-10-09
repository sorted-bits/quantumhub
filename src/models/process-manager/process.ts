import { DateTime } from 'luxon';
import { PackageProvider } from '../package-provider/package-provider';
import { ProcessStatus } from './status';

export interface Process {
  uuid: string;
  identifier: string;
  name: string;
  provider: PackageProvider;
  status: ProcessStatus;
  startTime?: DateTime;
  stopTime?: DateTime;
}

