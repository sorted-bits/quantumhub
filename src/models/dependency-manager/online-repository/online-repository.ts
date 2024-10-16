import path from 'path';
import { compareVersions } from 'compare-versions';
import { DependencyManager } from '../dependency-manager';
import { Hub } from '../../hub';
import { isInstalled } from '../install-helpers';
import { Logger } from 'quantumhub-sdk';
import { RepositoryDependency } from './repository-dependency';

export class OnlineRepository {
    private logger: Logger;
    private hasLoaded: boolean = false;
    private repositoryDependencies: RepositoryDependency[] = [];

    constructor(private readonly hub: Hub, private readonly dependencyManager: DependencyManager) {
        this.logger = this.hub.createLogger('OnlineRepository');
    }

    get loaded(): boolean {
        return this.hasLoaded;
    }

    get dependencies(): RepositoryDependency[] {
        for (const pack of this.repositoryDependencies) {
            this.updateRepositoryDepencyMetadata(pack);
        }

        return this.repositoryDependencies;
    }

    get = (name: string): RepositoryDependency | undefined => {
        return this.repositoryDependencies.find(pack => pack.name === name);
    }

    initialize = async (): Promise<boolean> => {
        this.logger.info('Initializing online repository');

        await this.downloadDefinitions();

        return true;
    }

    refresh = async (): Promise<boolean> => {
        this.logger.info('Refreshing online repository');
        return await this.downloadDefinitions();
    }

    private downloadDefinitions = async (): Promise<boolean> => {
        const repository = this.hub.config.packages_repository;

        this.logger.info('Downloading definitions from online repository', repository);

        try {
            const response = await fetch(repository);
            const data = await response.json();

            const packages: RepositoryDependency[] = data.packages;

            this.logger.info('Downloaded', packages.length, 'packages');

            this.hasLoaded = true;
            this.repositoryDependencies = packages;
        } catch (error) {
            this.logger.error('Error loading packages from repository:', error);
        }

        return true;
    }

    private isInstalled = (repositoryDependency: RepositoryDependency): boolean => {
        if (!repositoryDependency.repository || !repositoryDependency.file) {
            this.logger.error('Repository or config file not set for package:', repositoryDependency);
            return false;
        }

        return isInstalled(this.getInstalledPath(repositoryDependency), repositoryDependency.file);
    }

    private getInstalledPath = (repositoryDependency: RepositoryDependency): string => {
        return path.join(this.hub.config.storage.dependencies, path.basename(repositoryDependency.repository));
    }

    private updateRepositoryDepencyMetadata = (repositoryDependency: RepositoryDependency): void => {
        const definition = this.dependencyManager.getDefinition(repositoryDependency.name);

        repositoryDependency.isInstalled = this.isInstalled(repositoryDependency);

        if (repositoryDependency.isInstalled && definition) {
            const compared = compareVersions(repositoryDependency.version, definition?.version ?? '0.0.0');
            repositoryDependency.isNewer = compared === 1;
        } else {
            repositoryDependency.isNewer = false;
        }
    }
}