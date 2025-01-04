export interface LogConfig {
  level: string;
  folder?: string;
  excluded_packages: string[];
  included_packages: string[];
}
