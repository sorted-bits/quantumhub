import { Attribute, Logger, PackageDefinition, Device } from 'quantumhub-sdk';

import { Hub } from "../hub";
import { Process, ProcessDto, processToDto } from "./process";
import { PackageProvider } from '../package-provider/package-provider';
import { v4 } from 'uuid';
import { ProcessStatus } from './status';
import { DateTime } from 'luxon';
import { Dependency } from '../config/interfaces/dependencies';

export class ProcessManager {
    private processes: { [id: string]: Process } = {};
    private logger: Logger;

    constructor(private hub: Hub) {
        this.logger = hub.createLogger('ProcessManager');
    }

    processesUsingDependency = (dependency: Dependency): Process[] => {
        return Object.values(this.processes).filter((process) => process.provider.dependency.definition.name === dependency.definition.name);
    }

    public getProcess(identifier: string): Process | undefined {
        const process = Object.values(this.processes).find((elm) => elm.provider.config.identifier === identifier);
        return process;
    }

    public getProcesses(): Process[] {
        return Object.values(this.processes);
    }

    public getProcessDtos(): ProcessDto[] {
        return Object.values(this.processes).map((process) => processToDto(this.hub, process));
    }

    public getProcessesUsingDependency = (dependency: Dependency): Process[] => {
        return Object.values(this.processes).filter((process) => process.provider.dependency.definition.name === dependency.definition.name);
    }

    initializeProcess = async (config: any, start: boolean = true): Promise<boolean> => {
        const dependency = this.hub.dependencyManager.get(config.package);
        if (!dependency) {
            this.logger.error('Dependency not found:', config.package);
            return false;
        }

        const uuid = v4();
        this.logger.trace(`Instantiating package: ${dependency.definition.name} (v${dependency.definition.version}) with config`, JSON.stringify(config));

        try {
            const loadedPackage = await import(dependency.definition.path);
            const device = new loadedPackage.default() as Device;
            const provider = new PackageProvider(this.hub, config, dependency, device);

            const process: Process = {
                uuid,
                name: config.name,
                provider,
                status: ProcessStatus.LOADED,
            };

            this.processes[uuid] = process;

            const result = await device.init(provider);

            if (!result) {
                this.logger.error('Failed to initialize package:', dependency.definition.name);
                return false;
            }

            process.status = ProcessStatus.INITIALIZED;

            this.hub.server.sendProcessUpdate(process);

            if (start) {
                return await this.startProcess(uuid);
            } else {
                process.status = ProcessStatus.STOPPED;
                this.hub.server.sendProcessUpdate(process);
            }

            return true;
        } catch (error) {
            this.logger.error('Error starting package:', dependency.definition.name, error);
            return false;
        }
    };

    reloadProcess = async (uuid: string): Promise<boolean> => {
        const process = this.processes[uuid];
        if (!process) {
            this.logger.error('Process not found:', uuid);
            return false;
        }
        await this.stopProcess(uuid);

        this.hub.dependencyManager.reloadDefinition(process.provider.dependency);

        return await this.initializeProcess(process.provider.config, true);
    }

    startProcess = async (uuid: string): Promise<boolean> => {
        const process = this.processes[uuid];

        if (!process) {
            this.logger.error('Process not found:', uuid);
            return false;
        }

        if (process.status === ProcessStatus.STARTING || process.status === ProcessStatus.RUNNING) {
            return true;
        }

        if (process.status === ProcessStatus.LOADED) {
            process.provider.logger.error('Process not initialized:', uuid);
            try {
                await process.provider.device.init(process.provider);
            } catch (error) {
                process.provider.logger.error('Error initializing package:', process.provider.dependency.definition.name, error);
                return false;
            }
        }

        process.status = ProcessStatus.STARTING;
        this.hub.server.sendProcessUpdate(process);

        try {
            await process.provider.device.start();
        } catch (error) {
            process.provider.logger.error('Error starting package:', process.provider.dependency.definition.name, error);
            return false;
        }

        process.status = ProcessStatus.RUNNING;
        process.startTime = DateTime.now();

        this.hub.state.setAvailability(process.provider, true);
        this.hub.server.sendProcessUpdate(process);

        return true;
    };

    startAll = async (): Promise<void> => {
        if (!this.hub.config.packages) {
            this.logger.error('No packages found in config');
            return;
        }

        const configurations = this.hub.config.packages;

        for (const config of configurations) {
            if (config.disabled) {
                this.logger.trace('Package disabled:', config.name);
                continue;
            }

            this.initializeProcess(config);
        }
    };

    stopAll = async (): Promise<void> => {
        this.logger.trace('Stopping all processes', Object.keys(this.processes));

        for (const uuid in this.processes) {
            this.logger.trace('Stopping process:', uuid);
            await this.stopProcess(uuid);
        }
    };

    stopProcess = async (uuid: string): Promise<void> => {
        const process = this.processes[uuid];
        if (!process) {
            this.logger.error('Process not found:', uuid);
            return;
        }
        process.provider.timeout.clearAll();

        if (process.status === ProcessStatus.STOPPING || process.status === ProcessStatus.STOPPED) {
            return;
        }

        process.stopTime = DateTime.now();

        process.status = ProcessStatus.STOPPING;
        this.hub.state.setAvailability(process.provider, false);
        this.hub.server.sendProcessUpdate(process);

        this.logger.trace('Stopping:', process.provider.config.identifier);
        try {
            await process.provider.device.stop();
        } catch (error) {
            this.logger.error('Error stopping package:', process.provider.dependency.definition.name, error);
        }

        process.status = ProcessStatus.STOPPED;
        this.hub.server.sendProcessUpdate(process);
    };

    destroyProcess = async (uuid: string): Promise<void> => {
        const process = this.processes[uuid];
        if (!process) {
            this.logger.error('Process not found:', uuid);
            return;
        }

        process.provider.device.destroy();
    };
}