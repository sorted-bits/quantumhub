import fs from 'fs';
import path from 'path';
import { Logger, PackageDefinition } from 'quantumhub-sdk';

import { Dependency } from "../config/interfaces/dependencies";
import { Hub } from "../hub";
import { cloneRepository, isGitInstalled, isGitRepository, npmInstall, pullRepository } from './install-helpers';
import { OnlineRepository } from './online-repository/online-repository';
import { ProcessStatus } from '../process-manager/status';
import { readPackageConfig } from './definition-helpers';

export class DependencyManager {
    private gitIsInstalled: boolean = false;
    private dependencies: Dependency[];
    private logger: Logger;

    onlineRepository: OnlineRepository;

    constructor(private readonly hub: Hub) {
        this.logger = this.hub.createLogger('DependencyManager');
        this.dependencies = hub.config.dependencies;

        this.onlineRepository = new OnlineRepository(hub, this);
    }

    initialize = async (): Promise<boolean> => {
        await this.onlineRepository.initialize();

        for (const dependency of this.dependencies) {
            if (!this.isInstalled(dependency)) {
                await this.install(dependency);
            }

            await this.reloadDefinition(dependency);
        }

        return true;
    }

    install = async (dependency: Dependency): Promise<boolean> => {
        this.gitIsInstalled = await isGitInstalled();

        if (!this.gitIsInstalled) {
            this.logger.error('Git is not installed, unable to install dependencies');
            return false;
        }

        const installPath = this.path(dependency);
        const isInstalled = this.isInstalled(dependency);

        if (isInstalled && isGitRepository(installPath)) {
            this.logger.info('Git repository already cloned, we should be pulling', installPath);

            const result = await pullRepository(this.logger, installPath);
            if (!result) {
                this.logger.error('Failed to pull repository', installPath);
                return false;
            }

            this.logger.info('Repository updated:', installPath);

            const npmResult = await npmInstall(this.logger, installPath);
            if (!npmResult) {
                this.logger.error('Failed to perform npm install', installPath);
                return false;
            }

            this.logger.info('NPM packages installed:', installPath);
        } else if (!isInstalled) {
            this.logger.info('Cloning git repository:', installPath);
            const result = await cloneRepository(this.logger, dependency.repository, installPath);
            if (!result) {
                this.logger.error('Failed to clone repository', installPath);
                return false;
            }

            this.logger.info('Repository cloned:', installPath);

            const npmResult = await npmInstall(this.logger, installPath);
            if (!npmResult) {
                this.logger.error('Failed to perform npm install', installPath);
                return false;
            }
        } else {
            this.logger.info('Package already installed, but it is not a git repository, skipping');
            return false;
        }

        return true;
    }

    update = async (dependency: Dependency): Promise<boolean> => {
        this.gitIsInstalled = await isGitInstalled();

        if (!this.gitIsInstalled) {
            this.logger.error('Git is not installed, unable to install dependencies');
            return false;
        }

        // Which dependencies are using the same repository?
        const dependencies = this.dependencies.filter((dep) => dep.repository === dependency.repository);

        // Get the status of all processes that are using this dependency or any other dependency that uses the same repository
        // This so we know which processes need to be restarted once the update has been completed
        const processStates: { identifier: string, processStatus: ProcessStatus }[] = [];
        for (const dep of dependencies) {
            const processes = this.hub.processes.processesUsingDependency(dep);
            for (const process of processes) {
                processStates.push({ identifier: process.name, processStatus: process.status });

                // Stop and destroy the process
                await this.hub.processes.stopProcess(process.uuid);
                await this.hub.processes.destroyProcess(process.uuid);
            }
        }

        const installerResult = await this.install(dependency);
        if (!installerResult) {
            this.logger.error('Failed to install dependency', dependency.repository);
            return false;
        }

        for (const dep of dependencies) {
            await this.reloadDefinition(dep);
        }

        for (const processState of processStates) {
            const config = this.hub.config.packages.find((elm) => elm.identifier === processState.identifier);

            if (!config) {
                this.logger.error('PackageConfig not found:', processState.identifier);
                continue;
            }

            const definition = this.getDefinition(config.package);
            if (!definition) {
                this.logger.error('PackageDefinition not found:', config.package);
                continue;
            }

            await this.hub.processes.initializeProcess(config, processState.processStatus === ProcessStatus.RUNNING);
        }

        // Then we need to start any previously running processes
        return true;
    }

    updateRepository = async (repository: string): Promise<boolean> => {
        const dependencies = this.dependencies.filter((dep) => dep.repository === repository);

        if (dependencies.length === 0) {
            this.logger.error('No dependencies found for repository:', repository);
            return false;
        }

        return await this.update(dependencies[0]);
    }

    isInstalled = (dependency: Dependency): boolean => {
        const folder = this.path(dependency);
        const fullPath = path.join(folder, dependency.file);

        return fs.existsSync(folder) && fs.existsSync(fullPath);
    }

    path = (dependency: Dependency): string => {
        const packageRoot = this.hub.config.storage.dependencies;
        const directoryName = path.basename(dependency.repository);
        return path.resolve(`${packageRoot}/${directoryName}`);
    }

    get = (dependencyName: string): Dependency | undefined => {
        return this.dependencies.find(dep => dep.definition.name === dependencyName);
    }

    all = (): Dependency[] => {
        return this.dependencies;
    }

    getDefinition = (dependencyName: string): PackageDefinition | undefined => {
        return this.dependencies.find(dep => dep.definition.name === dependencyName)?.definition;
    }

    reloadDefinition = async (dependency: Dependency): Promise<boolean> => {
        const definitionFile = path.join(this.path(dependency), dependency.file);
        const newDefinition = readPackageConfig(this.logger, definitionFile);

        if (!newDefinition) {
            this.logger.error('Failed to reload dependency', dependency.repository);
            return false;
        }

        dependency.definition = newDefinition;
        return true;
    }
}


