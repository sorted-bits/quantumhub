import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Logger } from 'quantumhub-sdk';

export const isLocalFolder = (folder: string): boolean => {
    return folder.startsWith('/');
}

export const isGitRepository = (folder: string): boolean => {
    return fs.existsSync(path.join(folder, '.git'));
}

export const isInstalled = (repository: string, file: string): boolean => {
    const installPath = path.join(repository, file);
    return fs.existsSync(installPath);
}

export const isGitInstalled = async (): Promise<boolean> => {
    return new Promise((resolve) => {
        exec('git --version', (error) => {
            if (error) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

export const cloneRepository = async (logger: Logger, repository: string, installPath: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        exec(`git clone ${repository} ${installPath}`, (error) => {
            if (error) {
                logger.error('Error cloning repository:', error);
                reject(error);
            } else {
                resolve(true);
            }
        });
    });
}

export const pullAndInstall = async (logger: Logger, installPath: string): Promise<boolean> => {
    const pullResult = await pullRepository(logger, installPath);
    if (!pullResult) {
        logger.error('Failed to pull repository', installPath);
        return false;
    }

    const npmResult = await npmInstall(logger, installPath);
    if (!npmResult) {
        logger.error('Failed to perform npm install', installPath);
        return false;
    }

    return true;
}

export const cloneAndInstall = async (logger: Logger, repository: string, installPath: string): Promise<boolean> => {
    const cloneResult = await cloneRepository(logger, repository, installPath);
    if (!cloneResult) {
        logger.error('Failed to clone repository', installPath);
        return false;
    }

    const npmResult = await npmInstall(logger, installPath);
    if (!npmResult) {
        logger.error('Failed to perform npm install', installPath);
        return false;
    }

    return true;
}


export const pullRepository = async (logger: Logger, installPath: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        exec(`git pull`, { cwd: installPath }, (error) => {
            if (error) {
                logger.error('Error pulling repository:', error);
                reject(error);
            } else {
                resolve(true);
            }
        });
    });
}

export const npmInstall = async (logger: Logger, installPath: string): Promise<boolean> => {
    const packageJsonPath = path.join(installPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        logger.error('No package.json found:', installPath);
        return true;
    }

    logger.info('Performing npm install:', installPath);
    return new Promise((resolve, reject) => {
        exec(`npm install`, { cwd: installPath }, (error) => {
            if (error) {
                logger.error('Error performing npm install:', error);
                reject(error);
            } else {
                resolve(true);
            }
        });
    });
}