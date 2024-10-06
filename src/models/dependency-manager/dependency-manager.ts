import fs from 'fs';
import path from 'path';
import { Logger, PackageDefinition } from 'quantumhub-sdk';

import { Dependency } from "../config/interfaces/dependencies";
import { Hub } from "../hub";
import { cloneRepository, isGitInstalled, isGitRepository, npmInstall, pullRepository } from './install-helpers';
import { OnlineRepository } from './online-repository/online-repository';
import { ProcessStatus } from '../process-manager/status';
import { readPackageConfig } from './definition-helpers';

interface ProcessState {
    uuid: string;
    identifier: string;
    processStatus: ProcessStatus;
}

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
        for (const dependency of this.dependencies) {
            if (!this.isInstalled(dependency)) {
                await this.install(dependency);
            }

            await this.reloadDefinition(dependency);
        }

        await this.onlineRepository.initialize();

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

    reload = async (dependencyName: string): Promise<boolean> => {
        const dependency = this.get(dependencyName);
        if (!dependency) {
            this.logger.error('Dependency not found:', dependencyName);
            return false;
        }

        const dependencies = this.dependencies.filter((dep) => dep.repository === dependency.repository);

        const processStates = dependencies.flatMap(dep => this.getProcessStatuses(dep));

        processStates.forEach((processState) => {
            this.hub.processes.stopProcess(processState.uuid);
            this.hub.processes.destroyProcess(processState.uuid);
        });

        for (const dep of dependencies) {
            await this.reloadDefinition(dep);
        }

        for (const processState of processStates) {
            await this.startFromProcessState(processState);
        }

        return true;
    }

    getProcessStatuses = (dependency: Dependency): ProcessState[] => {
        const processes = this.hub.processes.processesUsingDependency(dependency);

        const result = processes.map((process): ProcessState => {
            return {
                uuid: process.uuid,
                identifier: process.identifier,
                processStatus: process.status
            };
        });

        return result;
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

        const processStates = dependencies.flatMap(dep => this.getProcessStatuses(dep));

        processStates.forEach((processState) => {
            this.hub.processes.stopProcess(processState.uuid);
            this.hub.processes.destroyProcess(processState.uuid);
        });

        const installerResult = await this.install(dependency);
        if (!installerResult) {
            this.logger.error('Failed to install dependency', dependency.repository);
            return false;
        }

        for (const dep of dependencies) {
            await this.reloadDefinition(dep);
        }

        for (const processState of processStates) {
            await this.startFromProcessState(processState);
        }

        // Then we need to start any previously running processes
        return true;
    }


    startFromProcessState = async (processState: ProcessState): Promise<boolean> => {
        const config = this.hub.config.packages.find((elm) => elm.identifier === processState.identifier);

        if (!config) {
            this.logger.error('PackageConfig not found:', processState.identifier);
            return false;
        }

        const definition = this.getDefinition(config.package);
        if (!definition) {
            this.logger.error('PackageDefinition not found:', config.package);
            return false;
        }

        return await this.hub.processes.initializeProcess(config, processState.processStatus === ProcessStatus.RUNNING);
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


