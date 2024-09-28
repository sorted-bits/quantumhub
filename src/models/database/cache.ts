import { Database } from 'sqlite3';
import { StorageConfig } from '../config/interfaces/storage-config';
import { Logger as ILogger } from 'quantumhub-sdk';
import { Hub } from '../hub';
import { PackageProvider } from '../package-provider/package-provider';

interface CacheRow {
    id: string;
    value: string;
    identifier: string;
    created_at: Date;
}

export class QuantumCache {
    private hub: Hub;
    private logger: ILogger;
    private config: StorageConfig;
    private db: Database;

    constructor(hub: Hub, config: StorageConfig) {
        this.hub = hub;
        this.logger = this.hub.createLogger('Cache');
        this.config = config;
        this.db = new Database(this.config.file);
    }

    initialize = async () => {
        await this.createDatabase();
    }

    set = async (provider: PackageProvider, key: string, value: any) => {
        const serializedValue = JSON.stringify(value);

        try {
            this.db.run('insert or replace into cache (id, value, identifier) values (?, ?, ?)', [key, serializedValue, provider.config.identifier]);
        } catch (error) {
            this.logger.error('Error setting cache', error);
        }
    }

    get = async (provider: PackageProvider, key: string): Promise<any> => {
        this.logger.trace('Getting cache', provider.config.identifier, key);
        return new Promise((resolve, reject) => {
            try {
                this.db.get(`
                    SELECT value FROM cache WHERE id = ? AND identifier = ?
                `, [key, provider.config.identifier], (err, row: CacheRow) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(JSON.parse(row.value));
                    }
                });
            } catch (error) {
                this.logger.error('Error getting cache', error);
                reject(error);
            }
        });
    }

    delete = async (provider: PackageProvider, key: string) => {
        this.logger.trace('Deleting cache', provider.config.identifier, key);
        try {
            this.db.run(`
                DELETE FROM cache WHERE id = ? AND identifier = ?
            `, [key, provider.config.identifier]);
        } catch (error) {
            this.logger.error('Error deleting cache', error);
        }
    }

    all = async (provider: PackageProvider): Promise<{
        [key: string]: any;
    }> => {
        this.logger.trace('Getting all cache', provider.config.identifier);
        return new Promise((resolve, reject) => {
            try {
                this.db.all(`
                    SELECT id, value FROM cache WHERE identifier = ?
            `, [provider.config.identifier], (err, rows: CacheRow[]) => {
                    if (err) {
                        reject(err);
                    } else {
                        const returnObject: { [key: string]: string } = {};
                        rows.forEach((row: CacheRow) => {
                            returnObject[row.id] = row.value;
                        });
                        resolve(returnObject)
                    }
                });
            } catch (error) {
                this.logger.error('Error getting all cache', error);
            }
        });
    }

    private createDatabase = async () => {
        try {
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS cache (
                id TEXT NOT NULL,
                identifier TEXT NOT NULL,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id, identifier)
            )
        `);
        } catch (error) {
            this.logger.error('Error creating cache database', error);
        }
    }
}