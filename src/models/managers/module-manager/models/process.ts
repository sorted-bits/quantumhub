import { Status } from './status';

export class Process {
  uuid: string;
  module: any;
  config: any;
  status: Status = Status.LOADED;
  startTime?: Date;
  stopTime?: Date;

  constructor(uuid: string, module: any, config: any) {
    this.uuid = uuid;
    this.module = module;
    this.config = config;
  }
}
