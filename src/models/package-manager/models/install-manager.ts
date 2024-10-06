import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Attribute, Logger, Definition } from 'quantumhub-sdk';

import { Hub } from "../../hub";
import { PackageManager } from "../package-manager";
import { ProcessStatus } from '../enums/status';

interface PackageInstallResult {
    success: boolean;
    error?: string;
}

export class InstallManager {
    private _gitIsInstalled: boolean = false;
    private logger: Logger;

    constructor(private hub: Hub, private readonly packageManager: PackageManager) {
        this.logger = this.hub.createLogger('InstallManager');
    }

    initialize = async (): Promise<boolean> => {
        this._gitIsInstalled = await this.isGitInstalled();
        return true;
    }

    updatePackage = async (repository: string): Promise<PackageInstallResult> => {
        this._gitIsInstalled = await this.isGitInstalled();

        if (!this._gitIsInstalled) {
            return { success: false, error: 'Git is not installed, unable to install packages' };
        }

        const definitions = this.packageManager.getDefinitionsWithRepository(repository);
        const processStates: { identifier: string, processStatus: ProcessStatus }[] = [];

        for (const definition of definitions) {
            const processes = this.packageManager.processManager.getProcessesUsingPackage(definition);
            for (const process of processes) {
                processStates.push({ identifier: process.identifier, processStatus: process.status });
            }
        }

        this.logger.info('Process states:', processStates);

        for (const definition of definitions) {
            await this.packageManager.processManager.stopAllProcessesUsingPackage(definition);
        }

        await this.downloadPackage(repository);

        for (const definition of definitions) {
            await this.packageManager.reloadDefinition(definition);
        }

        for (const processState of processStates) {
            const config = this.hub.config.packages.configuration.find((elm) => elm.identifier === processState.identifier);

            if (!config) {
                this.logger.error('PackageConfig not found:', processState.identifier);
                continue;
            }

            const definition = this.packageManager.definitions.find((elm) => elm.identifier === config.package);
            if (!definition) {
                this.logger.error('PackageDefinition not found:', processState.identifier);
                continue;
            }


            await this.packageManager.processManager.initializeProcess(definition, config, processState.processStatus === ProcessStatus.RUNNING);
        }

        return { success: true };
    }

    downloadPackage = async (repository: string): Promise<PackageInstallResult> => {
        this._gitIsInstalled = await this.isGitInstalled();

        if (!this._gitIsInstalled) {
            return { success: false, error: 'Git is not installed, unable to install packages' };
        }

        const installPath = this.installPath(repository);
        const isInstalledInPackagesFolder = this.isInstalled(repository);

        if (this.isGitRepository(installPath)) {
            this.logger.info('Git repository already cloned, we should be pulling', installPath);

            const result = await this.pullRepository(installPath);
            if (!result) {
                return { success: false, error: 'Failed to pull repository' };
            } else {
                this.logger.info('Repository updated:', installPath);
            }

            const npmResult = await this.performNpmInstall(installPath);
            if (!npmResult) {
                return { success: false, error: 'Failed to perform npm install' };
            }

        } else if (!isInstalledInPackagesFolder) {
            this.logger.info('Cloning git repository:', installPath);
            const result = await this.cloneRepository(repository, installPath);
            if (!result) {
                return { success: false, error: 'Failed to clone repository' };
            } else {
                this.logger.info('Repository cloned:', installPath);
            }

            const npmResult = await this.performNpmInstall(installPath);
            if (!npmResult) {
                return { success: false, error: 'Failed to perform npm install' };
            }
        } else {
            this.logger.info('Package already installed, but it is not a git repository, skipping');
            return { success: false, error: 'Package already installed, but it is not a git repository, skipping' };
        }

        return { success: true };
    }

    performNpmInstall = async (installPath: string): Promise<boolean> => {
        const packageJsonPath = path.join(installPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            this.logger.error('No package.json found:', installPath);
            return true;
        }

        this.logger.info('Performing npm install:', installPath);
        return new Promise((resolve, reject) => {
            exec(`npm install`, { cwd: installPath }, (error) => {
                if (error) {
                    this.logger.error('Error performing npm install:', error);
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    }

    cloneRepository = async (repository: string, installPath: string): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            exec(`git clone ${repository} ${installPath}`, (error) => {
                if (error) {
                    this.logger.error('Error cloning repository:', error);
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    }

    pullRepository = async (installPath: string): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            exec(`git pull`, { cwd: installPath }, (error) => {
                if (error) {
                    this.logger.error('Error pulling repository:', error);
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    }

    isGitInstalled = async (): Promise<boolean> => {
        return new Promise((resolve) => {
            exec('git --version', (error) => {
                if (error) {
                    this.logger.error('Error checking if git is installed:', error);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    isInstalled = (repository: string): boolean => {
        const folder = this.installPath(repository);
        return fs.existsSync(folder);
    }

    installPath = (repository: string): string => {
        const packageRoot = this.hub.config.packages.root;
        const directoryName = path.basename(repository);
        return path.resolve(`${packageRoot}/${directoryName}`);
    }

    isGitRepository = (folder: string): boolean => {
        return fs.existsSync(path.join(folder, '.git'));
    }
}
