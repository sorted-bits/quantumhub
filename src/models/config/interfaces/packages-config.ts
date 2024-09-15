export interface PackagesConfig {
  root: string;
  configuration: PackageConfig[];
}

export interface PackageConfig {
  package: string;
  name: string;
  identifier: string;
}
