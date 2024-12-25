import { readPackageConfig, parseAttributes } from '../definition-helpers';
import { Logger } from 'quantumhub-sdk';
import fs from 'fs';
import YAML from 'yaml';

jest.mock('fs');
jest.mock('yaml');

describe('definition-helpers', () => {
    let mockLogger: jest.Mocked<Logger>;

    beforeEach(() => {
        mockLogger = {
            error: jest.fn(),
            trace: jest.fn(),
        } as any;
    });

    describe('readPackageConfig', () => {
        it('should return undefined if config file does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = readPackageConfig(mockLogger, 'non-existent-file.yml');

            expect(result).toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledWith('File does not exist:', 'non-existent-file.yml');
        });

        it('should return undefined if entry file does not exist', () => {
            (fs.existsSync as jest.Mock)
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false);
            (fs.readFileSync as jest.Mock).mockReturnValue('');
            (YAML.parse as jest.Mock).mockReturnValue({
                package: {
                    name: 'test-package',
                    entry: 'index.js',
                },
            });

            const result = readPackageConfig(mockLogger, '/path/to/config.yml');

            expect(result).toBeUndefined();
        });

        it('should return a valid PackageDefinition when all files exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('');
            (YAML.parse as jest.Mock).mockReturnValue({
                package: {
                    name: 'test-package',
                    entry: 'index.js',
                    version: '1.0.0',
                    description: 'Test package',
                    author: 'Test Author',
                    repository: 'https://github.com/test/repo',
                },
                attributes: {},
            });

            const result = readPackageConfig(mockLogger, '/path/to/config.yml');

            expect(result).toEqual({
                config_file: '/path/to/config.yml',
                path: '/path/to/index.js',
                name: 'test-package',
                entry: 'index.js',
                version: '1.0.0',
                description: 'Test package',
                author: 'Test Author',
                repository: 'https://github.com/test/repo',
                attributes: [],
            });
        });
    });

    describe('parseAttributes', () => {
        it('should parse attributes correctly', () => {
            const fileAttributes = {
                attr1: { type: 'string', default: 'value1' },
                attr2: { type: 'number', unavailability_value: 0 },
            };

            const result = parseAttributes(mockLogger, fileAttributes);

            expect(result).toEqual([
                { key: 'attr1', type: 'string', default: 'value1', availability: true },
                { key: 'attr2', type: 'number', unavailability_value: 0, availability: false },
            ]);
            expect(mockLogger.trace).toHaveBeenCalledTimes(2);
        });

        it('should handle empty attributes', () => {
            const result = parseAttributes(mockLogger, {});

            expect(result).toEqual([]);
            expect(mockLogger.trace).not.toHaveBeenCalled();
        });
    });
});