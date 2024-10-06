import { Hub } from "../../../models/hub";
import { Process } from "../../../models/process-manager/process";
import { ProcessStatus } from "../../../models/process-manager/status";

export interface ProcessDTO {
    identifier: string;
    name: string;
    availability: boolean;
    status: ProcessStatus;

    package: {
        name: string;
        version: string;
    };
}

export const toProcessDTO = (hub: Hub, process: Process): ProcessDTO => {
    return {
        identifier: process.identifier,
        name: process.name,
        availability: hub.state.getAvailability(process.provider),
        status: process.status,
        package: {
            name: process.provider.definition.name,
            version: process.provider.definition.version
        }
    }
}