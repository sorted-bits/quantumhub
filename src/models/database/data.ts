import { Database } from "sqlite3";
import { StorageConfig } from "../config/interfaces/storage-config";
import { Logger } from 'quantumhub-sdk';
import { Hub } from "../hub";
import { QuantumCache } from "./cache";

export class QuantumData {
    private hub: Hub;
    private logger: Logger;
    private config: StorageConfig;
    private database: Database;

    public cache: QuantumCache;

    constructor(hub: Hub, config: StorageConfig) {
        this.hub = hub;
        this.logger = this.hub.createLogger('QuantumData');
        this.config = config;
        this.database = new Database(this.config.file);

        this.cache = new QuantumCache(hub, this.database);
    }

    initialize = async () => {
        await this.createDatabase();
    }

    private createDatabase = async () => {
        try {
            this.database.exec(`
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT NOT NULL,
                    identifier TEXT NOT NULL,
                    value TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (key, identifier)
                )
            `);

        } catch (error) {
            this.logger.error('Error creating cache database', error);
        }
    }
}