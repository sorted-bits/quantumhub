export interface RepositoryDependency {
    name: string;
    repository: string;
    config: string;
    description: string;
    author: string;
    version: string;

    isInstalled: boolean;
    isNewer: boolean;
}