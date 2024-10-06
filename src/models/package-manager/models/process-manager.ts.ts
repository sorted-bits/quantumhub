import { Attribute, Logger, Definition, Device } from 'quantumhub-sdk';

import { Hub } from "../../hub";
import { Process, ProcessDto, processToDto } from "../interfaces/process";
import { PackageManager } from "../package-manager";
import { PackageProvider } from '../../package-provider/package-provider';
import { v4 } from 'uuid';
import { ProcessStatus } from '../enums/status';
import { DateTime } from 'luxon';

export class ProcessManager {
    private processes: { [id: string]: Process } = {};
    private logger: Logger;

    constructor(private hub: Hub, private packageManager: PackageManager) {
        this.logger = hub.createLogger('ProcessManager');
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

    public getProcessesUsingPackage = (definition: Definition): Process[] => {
        return Object.values(this.processes).filter((process) => process.provider.packageDefinition.identifier === definition.identifier);
    }

    initializeProcess = async (definition: Definition, config: any, start: boolean = true): Promise<boolean> => {
        const uuid = v4();
        this.logger.trace(`Instantiating package: ${definition.name} (v${definition.version}) with config`, JSON.stringify(config));

        try {
            const loadedPackage = await import(definition.path);
            const device = new loadedPackage.default() as Device;
            const provider = new PackageProvider(this.hub, config, definition, device);

            const process: Process = {
                uuid,
                identifier: config.identifier,
                name: config.name,
                provider,
                status: ProcessStatus.LOADED,
            };

            this.processes[uuid] = process;

            const result = await device.init(provider);

            if (!result) {
                this.logger.error('Failed to initialize package:', definition.name);
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
            this.logger.error('Error starting package:', definition.name, error);
            return false;
        }
    };

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
                process.provider.logger.error('Error initializing package:', process.provider.packageDefinition.name, error);
                return false;
            }
        }

        process.status = ProcessStatus.STARTING;
        this.hub.server.sendProcessUpdate(process);

        try {
            await process.provider.device.start();
        } catch (error) {
            process.provider.logger.error('Error starting package:', process.provider.packageDefinition.name, error);
            return false;
        }

        process.status = ProcessStatus.RUNNING;
        process.startTime = DateTime.now();

        this.hub.state.setAvailability(process.provider, true);
        this.hub.server.sendProcessUpdate(process);

        return true;
    };

    startProcesses = async (identifiers: string[]): Promise<void> => {
        for (const identifier of identifiers) {
            const packageConfig = this.hub.config.packages.configuration.find((elm) => elm.identifier === identifier);
            if (!packageConfig) {
                this.logger.error('Package not found:', identifier);
                continue;
            }

            const definition = this.packageManager.definitions.find((elm) => elm.identifier === packageConfig.package);
            if (!definition) {
                this.logger.error('Package not found:', packageConfig.package);
                continue;
            }

            await this.initializeProcess(definition, packageConfig);
        }
    }

    startAllUsingPackage = async (definition: Definition): Promise<void> => {
        const packages = this.hub.config.packages.configuration.filter((elm) => elm.package === definition.identifier);

        for (const config of packages) {
            await this.initializeProcess(definition, config);
        }
    }

    stopAllProcessesUsingPackage = async (definition: Definition): Promise<void> => {
        // Lets stop all processes using this package
        this.logger.info('Stopping all processes using package:', definition.identifier);
        const processes = this.getProcessesUsingPackage(definition);

        for (const process of processes) {
            if (process.status !== ProcessStatus.STOPPED) {
                this.logger.info('Stopping process:', process.uuid);
                await this.stopProcess(process.uuid);
                this.logger.info('Destroying process:', process.uuid);
                await this.destroyProcess(process.uuid);
            }
        }

        const uuids = processes.map((process) => process.uuid);

        for (const uuid of uuids) {
            delete this.processes[uuid];
        }
    }

    startAll = async (): Promise<void> => {
        if (!this.hub.config.packages) {
            this.logger.error('No packages found in config');
            return;
        }

        const configurations = this.hub.config.packages.configuration;

        for (const config of configurations) {
            if (config.disabled) {
                this.logger.trace('Package disabled:', config.name);
                continue;
            }

            const definition = this.packageManager.definitions.find((elm) => elm.identifier === config.package);
            if (!definition) {
                this.logger.error('Package not found:', config.package);
                continue;
            }

            this.initializeProcess(definition, config);
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
            this.logger.error('Error stopping package:', process.provider.packageDefinition.name, error);
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