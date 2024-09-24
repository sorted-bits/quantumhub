import { Hub } from '../../hub';
import { PackageProvider } from '../../provider/package-provider';
import { ProcessStatus } from '../enums/status';

export interface Process {
  uuid: string;
  name: string;
  identifier: string;
  provider: PackageProvider;
  status: ProcessStatus;
  startTime?: Date;
  stopTime?: Date;
}

export const processToDto = (hub: Hub, process: Process): any => {
  return {
    ...process,
    availability: hub.state.getAvailability(process.provider),
    provider: undefined,
  };
};
