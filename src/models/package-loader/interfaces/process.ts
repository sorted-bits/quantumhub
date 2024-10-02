import { DateTime } from 'luxon';
import { Hub } from '../../hub';
import { PackageProvider } from '../../package-provider/package-provider';
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

export interface ProcessDto {
  uuid: string;
  name: string;
  identifier: string;
  status: ProcessStatus;
  startTime?: string;
  stopTime?: string;
  availability: boolean;
  version?: string;
  packageName: string;
}

export const processToDto = (hub: Hub, process: Process): ProcessDto => {
  return {
    uuid: process.uuid,
    name: process.name,
    identifier: process.identifier,
    status: process.status,
    startTime: process.startTime?.toFormat('HH:mm:ss'),
    stopTime: process.stopTime?.toFormat('HH:mm:ss'),
    availability: hub.state.getAvailability(process.provider),
    version: process.provider.definition.version,
    packageName: process.provider.definition.name,
  };
};
