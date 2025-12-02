// Cargar variables de entorno PRIMERO, antes de cualquier import
import dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import { initializeSocket } from './config/socket';
import logger from './utils/logger';

// Importar rutas
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import groupRoutes from './routes/groups';
import tutorRoutes from './routes/tutors';
import sessionRoutes from './routes/sessions';
import messageRoutes from './routes/messages';
import fileRoutes from './routes/files';
import evaluationRoutes from './routes/evaluations';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';

const app: Express = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8080';

// Security headers con Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Necesario para Socket.IO
}));

// CORS
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint de diagnóstico (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/diagnostic', (_req, res) => {
    res.json({
      env: {
        hasJwtSecret: !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
        jwtSecretLength: process.env.JWT_SECRET?.length || 0,
        hasDbHost: !!process.env.DB_HOST,
        hasDbName: !!process.env.DB_NAME,
        hasDbUser: !!process.env.DB_USER,
        hasDbPassword: !!process.env.DB_PASSWORD,
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT
      }
    });
  });
}

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Manejo de errores (debe ir al final)
app.use(errorHandler);

// Crear servidor HTTP
const server = createServer(app);

// Inicializar Socket.IO
initializeSocket(server);

// Verificar configuración crítica antes de iniciar
function checkConfiguration() {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    issues.push('JWT_SECRET no está configurado o es muy corto (mínimo 32 caracteres)');
  }
  
  if (!process.env.DB_HOST) {
    issues.push('DB_HOST no está configurado');
  } else {
    // Verificar si es un hostname de AWS RDS
    if (process.env.DB_HOST.includes('rds.amazonaws.com')) {
      if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
        warnings.push('DB_USER o DB_PASSWORD están vacíos - La conexión a AWS RDS puede fallar');
      }
    }
  }
  
  if (!process.env.DB_NAME) {
    issues.push('DB_NAME no está configurado');
  }
  
  if (!process.env.DB_USER) {
    warnings.push('DB_USER no está configurado - Usando valor por defecto');
  }
  
  if (!process.env.DB_PASSWORD) {
    warnings.push('DB_PASSWORD no está configurado - Usando valor por defecto');
  }
  
  if (issues.length > 0) {
    logger.warn('⚠️  Problemas de configuración detectados:');
    issues.forEach(issue => logger.warn(`  - ${issue}`));
    logger.warn('El servidor puede no funcionar correctamente. Verifica tu archivo .env');
  }
  
  if (warnings.length > 0) {
    logger.warn('⚠️  Advertencias de configuración:');
    warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }
  
  if (issues.length === 0) {
    logger.info('✅ Configuración básica verificada');
  }
}

// Iniciar servidor
server.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
  logger.info(`📁 Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 CORS origin: ${CORS_ORIGIN}`);
  checkConfiguration();
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;

