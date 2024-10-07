import { PackageDefinition } from "quantumhub-sdk";

export interface Dependency {
    repository: string;
    file: string;

    definition: PackageDefinition;
}

