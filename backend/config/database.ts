import { Pool, PoolConfig } from 'pg';
import logger from '../utils/logger';

const config: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'peer_tutoring_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};

const pool = new Pool(config);

pool.on('error', (err) => {
  logger.error('Error inesperado en el pool de PostgreSQL', err);
});

pool.on('connect', () => {
  logger.info('Conexión a PostgreSQL establecida');
});

/**
 * Ejecuta una query
 */
export async function query(text: string, params?: unknown[]): Promise<any> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query ejecutada', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Error ejecutando query', { text, error });
    throw error;
  }
}

/**
 * Obtiene un cliente del pool para transacciones
 */
export async function getClient() {
  return pool.connect();
}

/**
 * Cierra el pool de conexiones
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;

