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
        this.logger = hub.createLogger('QuantumState');
    }

    getAll = async (provider: PackageProvider): Promise<State[]> => {
        return new Promise((resolve, reject) => {
            try {
                this.database.all(`SELECT attribute, value, created_at FROM states WHERE identifier = ?`, [provider.config.identifier], (err, rows: State[]) => {
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

    set = async (provider: PackageProvider, attribute: string, value: any): Promise<State> => {
        const serializedValue = JSON.stringify(value);
        return new Promise((resolve, reject) => {
            try {
                this.database.run(`INSERT OR REPLACE INTO states (identifier, attribute, value) VALUES (?, ?, ?)`, [provider.config.identifier, attribute, serializedValue], function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            identifier: provider.config.identifier,
                            attribute: attribute,
                            value: value,
                            created_at: new Date()
                        });
                    }
                });
            } catch (error) {
                this.logger.error('Error setting state', error);
                reject(error);
            }
        });
    }
}