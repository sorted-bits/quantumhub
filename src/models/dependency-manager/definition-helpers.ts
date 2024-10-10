import { Attribute, Logger, PackageDefinition } from 'quantumhub-sdk';

import YAML from 'yaml';
import fs from 'fs';
import path from 'path';

export const readPackageConfig = (logger: Logger, configFile: string): PackageDefinition | undefined => {
    if (!fs.existsSync(configFile)) {
        logger.error('File does not exist:', configFile);
        return undefined;
    }

    const content = fs.readFileSync(configFile, 'utf8');
    const output = YAML.parse(content, {});

    const {
        name,
        entry,
        version,
        description,
        author,
        repository,
    } = output.package;

    const directoryName = path.dirname(configFile);

    const entryFile = `${directoryName}/${entry}`;

    if (!fs.existsSync(entryFile)) {
        logger.error('Entry file not found:', path);
        return undefined;
    }

    const definition: PackageDefinition = {
        config_file: configFile,
        path: entryFile,
        name,
        entry,
        description,
        author,
        version,
        attributes: parseAttributes(logger, output.attributes),
        repository
    };
    return definition;
};

const parseAttributes = (logger: Logger, fileAttributes: any): Attribute[] => {
    const attributes: Attribute[] = [];

    for (const key in fileAttributes) {
        const data = fileAttributes[key];
        data.key = key;

        data.availability = data.availability ?? (data.unavailability_value === undefined);

        logger.trace('Loaded attribute:', JSON.stringify(data));

        attributes.push(data);
    }

    return attributes;
};
