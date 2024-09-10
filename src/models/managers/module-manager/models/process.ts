import { ModuleProvider } from './module-provider';
import { Status } from './status';

export class Process {
  uuid: string;
  provider: ModuleProvider;
  status: Status = Status.LOADED;
  startTime?: Date;
  stopTime?: Date;

  constructor(uuid: string, provider: ModuleProvider) {
    this.uuid = uuid;
    this.provider = provider;
  }
}
