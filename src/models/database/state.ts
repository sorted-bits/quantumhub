import { Database } from 'sqlite3';
import { Logger } from 'quantumhub-sdk';
import { Hub } from '../hub';
import { PackageProvider } from '../package-provider/package-provider';

export interface State {
    identifier: string;
    attribute: string;
    value: string;
    created_at: Date;
}

export class QuantumState {
    private database: Database;
    private logger: Logger;

    constructor(hub: Hub, database: Database) {
        this.database = database;
        this.logger = hub.createLogger('QuantumState', undefined, false);
    }

    getLastUpdated = async (provider: PackageProvider): Promise<State | undefined> => {
        return new Promise((resolve) => {
            try {
                this.database.get('SELECT attribute, value, created_at FROM states WHERE identifier = ? ORDER BY created_at DESC LIMIT 1', [provider.config.identifier], (err, row: State) => {
                    resolve(row);
                });
            } catch (error) {
                this.logger.error('Error getting last updated state', error);
                resolve(undefined);
            }
        });
    }

    getAll = async (provider: PackageProvider): Promise<State[]> => {
        this.logger.trace(`Getting all states for ${provider.config.identifier}}`);
        return new Promise((resolve, reject) => {
            try {
                this.database.all(`SELECT identifier, attribute, value, created_at FROM states WHERE identifier = ?`, [provider.config.identifier], (err, rows: State[]) => {
                    resolve(rows);
                });
            } catch (error) {
                this.logger.error('Error getting all states', error);
                reject(error);
            }
        });
    }

    get = async (provider: PackageProvider, attribute: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            try {
                this.database.get(`SELECT value FROM states WHERE identifier = ? AND attribute = ?`, [provider.config.identifier, attribute], (err, row: State) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(JSON.parse(row.value));
                    }
                });
            } catch (error) {
                this.logger.error('Error getting state', error);
                reject(error);
            }
        });
    }

    getRowByProvider = async (provider: PackageProvider, attribute: string): Promise<State> => {
        return new Promise((resolve, reject) => {
            try {
                this.database.get(`SELECT identifier, attribute, value, created_at FROM states WHERE identifier = ? AND attribute = ?`, [provider.config.identifier, attribute], (err, row: State) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            identifier: row.identifier,
                            attribute: row.attribute,
                            created_at: row.created_at,
                            value: JSON.parse(row.value)
                        });
                    }
                });
            } catch (error) {
                this.logger.error('Error getting state', error);
                reject(error);
            }
        });
    }

    getByRowId = async (rowId: number): Promise<State> => {
        return new Promise((resolve, reject) => {
            try {
                this.database.get('SELECT identifier, attribute, value, created_at FROM states WHERE rowid = ?', [rowId], (err, row: State) => {
                    resolve(row);
                });
            } catch (error) {
                this.logger.error('Error getting state by row id', error);
                reject(error);
            }
        });
    }

    set = async (provider: PackageProvider, attribute: string, value: any): Promise<State> => {
        const serializedValue = JSON.stringify(value);
        try {
            await this.execute(`INSERT OR REPLACE INTO states (identifier, attribute, value) VALUES (?, ?, ?)`, [provider.config.identifier, attribute, serializedValue]);
            return await this.getRowByProvider(provider, attribute);
        } catch (error) {
            this.logger.error('Error setting state', error);
            throw error;
        }
    }

    execute = async (sql: string, params: any[]): Promise<number> => {
        return new Promise((resolve, reject) => {
            try {
                this.database.run(sql, params, function (err: any) {
                    const last = this.lastID;

                    if (err || last === undefined) {
                        reject(err);
                    } else {
                        resolve(last);
                    }
                });
            } catch (error) {
                this.logger.error('Error executing SQL', error);
                reject(error);
            }
        });
    }
}
