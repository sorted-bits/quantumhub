import { Attribute } from './attribute';

export class Definition {
  path: string;

  name: string;
  main: string;
  author?: string;
  description?: string;

  attributes: Attribute[] = [];

  constructor(
    path: string,
    name: string,
    main: string,
    description?: string,
    author?: string
  ) {
    this.path = path;
    this.name = name;
    this.author = author;
    this.main = main;
    this.description = description;
  }
}
