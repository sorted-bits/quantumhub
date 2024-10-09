import path from 'path';
import {
    cloneRepository,
    isGitInstalled,
    isGitRepository,
    isLocalFolder,
    npmInstall,
    pullRepository
} from './install-helpers';
import { Dependency } from '../config/interfaces/dependency';
import { Hub } from '../hub';
import { Logger, PackageDefinition } from 'quantumhub-sdk';
import { OnlineRepository } from './online-repository/online-repository';
import { ProcessStatus } from '../process-manager/status';
import { readPackageConfig } from './definition-helpers';
import fs from 'fs';


interface ProcessState {
    uuid: string;
    identifier: string;
    processStatus: ProcessStatus;
}

export class DependencyManager {
    private gitIsInstalled: boolean = false;
    private dependencies: Dependency[] = [];
    private logger: Logger;

    onlineRepository: OnlineRepository;

    constructor(private readonly hub: Hub) {
        this.logger = this.hub.createLogger('DependencyManager');
        this.onlineRepository = new OnlineRepository(hub, this);
    }

    initialize = async (): Promise<boolean> => {
        await this.onlineRepository.initialize();

        this.dependencies = await this.resolveDependencies();

        for (const dependency of this.dependencies) {
            if (!this.isInstalled(dependency)) {
                this.logger.info('Installing dependency', dependency.repository);
                const installResult = await this.install(dependency);
                if (!installResult) {
                    this.logger.error('Failed to install dependency', dependency.repository);
                    return false;
                }
            }

            if (this.isInstalled(dependency)) {
                await this.reloadDefinition(dependency);
            }
        }

        this.dependencies = this.dependencies.filter((dep) => dep.definition !== undefined);

        return true;
    }

    private resolveDependencies = async (): Promise<Dependency[]> => {
        const resolvedDependencies: Dependency[] = [];

        for (const dependency of this.hub.config.dependencies) {
            if (typeof dependency === 'string') {
                const repositoryDependency = this.onlineRepository.get(dependency);

                this.logger.info(`Resolved dependency: ${dependency} to ${repositoryDependency?.repository}`);

                if (repositoryDependency) {
                    resolvedDependencies.push({
                        repository: repositoryDependency.repository,
                        file: repositoryDependency.config_file,
                    } as any);
                } else {
                    this.logger.error('Dependency not found in online repository:', dependency);
                }
            } else {
                resolvedDependencies.push(dependency);
            }
        }

        return resolvedDependencies;
    }

    private install = async (dependency: Dependency): Promise<boolean> => {
        this.gitIsInstalled = await isGitInstalled();

        if (!this.gitIsInstalled) {
            this.logger.error('Git is not installed, unable to install dependencies');
            return false;
        }

        const installPath = this.path(dependency);
        const isInstalled = this.isInstalled(dependency);

        if (isInstalled && isGitRepository(installPath) && !isLocalFolder(dependency.repository)) {
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
        } else if (!isInstalled && !isLocalFolder(dependency.repository)) {
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
            else if (isInstalled && isLocalFolder(dependency.repository)) {
                this.logger.info('Local package, skipping install');
                return true;
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

        return await this.restartProcessesForDependency(dependency, false);
    }

    private getProcessStatuses = (dependency: Dependency): ProcessState[] => {
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

    private update = async (dependency: Dependency): Promise<boolean> => {
        return await this.restartProcessesForDependency(dependency, true);
    }


    private startFromProcessState = async (processState: ProcessState): Promise<boolean> => {
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

    private restartProcessesForDependency = async (dependency: Dependency, performUpdate: boolean = false): Promise<boolean> => {
        const dependencies = this.dependencies.filter((dep) => dep.repository === dependency.repository);

        // Get the status of all processes that are using this dependency or any other dependency that uses the same repository
        // This so we know which processes need to be restarted once the update has been completed

        const processStates = dependencies.flatMap(dep => this.getProcessStatuses(dep));
        this.logger.info('Restarting processes:', processStates);

        processStates.forEach((processState) => {
            this.hub.processes.stopProcess(processState.uuid);
            this.hub.processes.destroyProcess(processState.uuid);
        });

        if (performUpdate) {
            const installerResult = await this.install(dependency);
            if (!installerResult) {
                this.logger.error('Failed to install dependency', dependency.repository);
                return false;
            }
        }

        for (const dependency of dependencies) {
            await this.reloadDefinition(dependency);
        }

        for (const processState of processStates) {
            await this.startFromProcessState(processState);
        }

        // Then we need to start any previously running processes
        return true;
    }

    isInstalled = (dependency: Dependency): boolean => {
        const folder = this.path(dependency);
        const fullPath = path.join(folder, dependency.file);

        return fs.existsSync(folder) && fs.existsSync(fullPath);
    }

    path = (dependency: Dependency): string => {
        if (dependency.repository.startsWith('http')) {
            const packageRoot = this.hub.config.storage.dependencies;
            const directoryName = path.basename(dependency.repository);
            return path.resolve(`${packageRoot}/${directoryName}`);
        } else {
            if (dependency.repository.startsWith('/')) {
                return dependency.repository;
            } else {
                return path.resolve(dependency.repository);
            }
        }
    }

    get = (dependencyName: string): Dependency | undefined => {
        return this.dependencies.find(dep => dep.definition?.name === dependencyName);
    }

    all = (): Dependency[] => {
        return this.dependencies;
    }

    getDefinition = (dependencyName: string): PackageDefinition | undefined => {
        return this.dependencies.find(dep => dep.definition?.name === dependencyName)?.definition;
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


