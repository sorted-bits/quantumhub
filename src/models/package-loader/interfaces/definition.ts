import { Attribute } from './attribute';

export interface Definition {
  path: string;

  name: string;
  entry: string;
  author?: string;
  description?: string;
  version?: string;

  attributes: Attribute[];
}
