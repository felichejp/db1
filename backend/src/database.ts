import { DatabaseConfig } from "./struct";
import { Client, QueryResult } from "pg";

export class Database {
    private client: Client;
    private config: DatabaseConfig;

    constructor(config: DatabaseConfig) {
        this.config = config;
        const clientConfig: any = {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            ssl: {
                rejectUnauthorized: false,
            },
        };
        this.client = new Client(clientConfig);
    }
    public async connect(): Promise<void> {
        await this.client.connect();
    }
    public async disconnect(): Promise<void> {
        await this.client.end();
    }
    public async query(query: string, params?: any[]): Promise<QueryResult> {
        return await this.client.query(query, params);
    }
    
    /**
     * Inicia una transacción
     */
    public async beginTransaction(): Promise<void> {
        await this.client.query('BEGIN');
    }
    
    /**
     * Confirma una transacción
     */
    public async commit(): Promise<void> {
        await this.client.query('COMMIT');
    }
    
    /**
     * Revierte una transacción
     */
    public async rollback(): Promise<void> {
        await this.client.query('ROLLBACK');
    }
}