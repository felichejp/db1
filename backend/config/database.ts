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
  connectionTimeoutMillis: 10000, // Aumentado a 10 segundos para AWS RDS
  // SSL para AWS RDS
  ...(process.env.DB_HOST?.includes('rds.amazonaws.com') && {
    ssl: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      // En desarrollo, permitir certificados autofirmados
      // En producción, debe ser true para mayor seguridad
    }
  })
};

// Log de configuración (sin mostrar contraseña)
logger.info('Configuración de base de datos', {
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  hasPassword: !!config.password && config.password.length > 0,
  ssl: config.ssl ? 'habilitado' : 'deshabilitado'
});

const pool = new Pool(config);

pool.on('error', (err) => {
  logger.error('Error inesperado en el pool de PostgreSQL', err);
});

pool.on('connect', (client) => {
  logger.info('Conexión a PostgreSQL establecida', {
    host: client.host,
    port: client.port,
    database: client.database
  });
});

// Intentar conectar al iniciar para verificar configuración
pool.connect()
  .then((client) => {
    logger.info('✅ Conexión de prueba exitosa a la base de datos');
    client.release();
  })
  .catch((err) => {
    logger.error('❌ Error al conectar a la base de datos al iniciar', {
      message: err.message,
      code: err.code,
      host: config.host,
      port: config.port,
      database: config.database,
      suggestion: 'Verifica que la base de datos esté accesible y las credenciales sean correctas'
    });
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
    if (error instanceof Error) {
      // Log más detallado para errores de conexión
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        logger.error('Error de conexión a la base de datos', {
          hostname: config.host,
          database: config.database,
          error: error.message,
          code: (error as any).code,
          suggestion: 'Verifica que el hostname sea correcto y que tengas conexión a internet'
        });
      } else {
        logger.error('Error ejecutando query', { 
          text: text.substring(0, 100), // Solo primeros 100 caracteres por seguridad
          error: error.message,
          code: (error as any).code
        });
      }
    } else {
      logger.error('Error ejecutando query', { text, error });
    }
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

