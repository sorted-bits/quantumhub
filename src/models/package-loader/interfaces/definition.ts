import { Attribute } from 'quantumhub-sdk';

export interface Definition {
  path: string;

  name: string;
  entry: string;
  author?: string;
  description?: string;
  version?: string;

  attributes: Attribute[];
}
