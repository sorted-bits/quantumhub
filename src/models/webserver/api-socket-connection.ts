import expressWs from 'express-ws';
import { Hub } from '../hub';
import { Webserver } from './webserver';

export interface ApiSocketConnection {
  hub: Hub;
  server: Webserver;

  initialize(ws: expressWs.Instance): Promise<void>;
  send(data: any): Promise<void>;
}
