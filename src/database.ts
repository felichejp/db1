import { DatabaseConfig } from "./struct";
import { Client, QueryResult } from "pg";

export class Database {
    private client: Client;
    private config: DatabaseConfig;

    constructor(config: DatabaseConfig) {
        this.config = config;
        this.client = new Client({
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            ssl: {
                rejectUnauthorized: false,
            },
        });
    }
    public async connect(): Promise<void> {
        await this.client.connect();
    }
    public async disconnect(): Promise<void> {
        await this.client.end();
    }
    public async query(query: string): Promise<QueryResult> {
        return await this.client.query(query);
    }
}