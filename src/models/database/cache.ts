import { Database } from 'sqlite3';
import { Logger } from 'quantumhub-sdk';
import { Hub } from '../hub';
import { PackageProvider } from '../package-provider/package-provider';

interface CacheRow {
    key: string;
    value: string;
    identifier: string;
    created_at: Date;
}

export class QuantumCache {
    private database: Database;
    private logger: Logger;

    constructor(hub: Hub, database: Database) {
        this.database = database;
        this.logger = hub.createLogger('QuantumCache');
    }

    set = async (provider: PackageProvider, key: string, value: any) => {
        const serializedValue = JSON.stringify(value);

        try {
            this.database.run('insert or replace into cache (key, value, identifier) values (?, ?, ?)', [key, serializedValue, provider.config.identifier]);
        } catch (error) {
            this.logger.error('Error setting cache', error);
        }
    }

    get = async (provider: PackageProvider, key: string): Promise<any> => {
        this.logger.trace('Getting cache', provider.config.identifier, key);
        return new Promise((resolve, reject) => {
            try {
                this.database.get(`
                    SELECT value FROM cache WHERE key = ? AND identifier = ?
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
            this.database.run(`
                DELETE FROM cache WHERE key = ? AND identifier = ?
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
                this.database.all(`
                    SELECT key, value FROM cache WHERE identifier = ?
            `, [provider.config.identifier], (err, rows: CacheRow[]) => {
                    if (err) {
                        reject(err);
                    } else {

                        const returnObject: { [key: string]: string } = {};
                        rows.forEach((row: CacheRow) => {
                            returnObject[row.key] = JSON.parse(row.value);
                        });
                        resolve(returnObject)
                    }
                });
            } catch (error) {
                this.logger.error('Error getting all cache', error);
            }
        });
    }

}