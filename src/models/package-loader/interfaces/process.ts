import { DateTime } from 'luxon';
import { Hub } from '../../hub';
import { PackageProvider } from '../../provider/package-provider';
import { ProcessStatus } from '../enums/status';

export interface Process {
  uuid: string;
  name: string;
  identifier: string;
  provider: PackageProvider;
  status: ProcessStatus;
  startTime?: DateTime;
  stopTime?: DateTime;
}

export const processToDto = (hub: Hub, process: Process): any => {
  return {
    ...process,
    startTime: process.startTime?.toFormat('HH:mm:ss'),
    stopTime: process.stopTime?.toFormat('HH:mm:ss'),
    availability: hub.state.getAvailability(process.provider),
    provider: undefined,
  };
};
