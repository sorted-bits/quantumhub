import { Attribute } from './attribute';

export interface Definition {
  path: string;

  name: string;
  main: string;
  author?: string;
  description?: string;

  attributes: Attribute[];
}
