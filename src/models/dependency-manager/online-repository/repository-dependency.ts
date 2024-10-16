import { Dependency } from "../../config/interfaces/dependency";

export interface RepositoryDependency extends Dependency {
    name: string;
    description: string;
    author: string;
    version: string;

    isInstalled: boolean;
    isNewer: boolean;
}