import { DateTime } from 'luxon';
import { Hub } from '../hub';
import { PackageProvider } from '../package-provider/package-provider';
import { ProcessStatus } from './status';

export interface Process {
  uuid: string;
  name: string;
  provider: PackageProvider;
  status: ProcessStatus;
  startTime?: DateTime;
  stopTime?: DateTime;
}

export interface ProcessDto {
  uuid: string;
  name: string;
  status: ProcessStatus;
  startTime?: string;
  stopTime?: string;
  availability: boolean;
  version?: string;
  packageName: string;
  packageIdentifier: string;
}

export const processToDto = (hub: Hub, process: Process): ProcessDto => {
  return {
    uuid: process.uuid,
    name: process.name,
    status: process.status,
    startTime: process.startTime?.toFormat('HH:mm:ss'),
    stopTime: process.stopTime?.toFormat('HH:mm:ss'),
    availability: hub.state.getAvailability(process.provider),
    version: process.provider.definition.version,
    packageIdentifier: process.provider.definition.name,
    packageName: process.provider.definition.name,
  };
};
