export interface RepositoryDependency {
    name: string;
    repository: string;
    config_file: string;
    description: string;
    author: string;
    version: string;

    isInstalled: boolean;
    isNewer: boolean;
}