import { State } from "../../../models/database/state";
import { Hub } from "../../../models/hub";
import { Process } from "../../../models/process-manager/process";
import { ProcessStatus } from "../../../models/process-manager/status";

export interface ProcessDTO {
    identifier: string;
    name: string;
    availability: boolean;
    status: ProcessStatus;
    lastUpdatedState: State | undefined;

    package: {
        name: string;
        version: string;
    };
}

export const toProcessDTO = async (hub: Hub, process: Process): Promise<ProcessDTO> => {
    const lastUpdate = await hub.state.getLastUpdatedState(process.provider);

    return {
        identifier: process.identifier,
        name: process.name,
        availability: hub.state.getAvailability(process.provider),
        lastUpdatedState: lastUpdate,
        status: process.status,
        package: {
            name: process.provider.definition.name,
            version: process.provider.definition.version
        }
    }
}