// Cargar variables de entorno PRIMERO, antes de cualquier import
import dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import cors from 'cors';
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

// Middleware global
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// Detectar si estamos en Lambda
const isLambda = !!process.env.LAMBDA_TASK_ROOT || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

if (!isLambda) {
  // Solo inicializar servidor HTTP y Socket.IO si NO estamos en Lambda
  // Crear servidor HTTP
  const server = createServer(app);

  // Inicializar Socket.IO
  initializeSocket(server);

  // Iniciar servidor
  server.listen(PORT, () => {
    logger.info(`Servidor corriendo en puerto ${PORT}`);
    logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`CORS origin: ${CORS_ORIGIN}`);
  });
} else {
  // En Lambda, solo loguear que la app está lista
  logger.info('Aplicación lista para Lambda');
  logger.info(`Entorno: ${process.env.NODE_ENV || 'production'}`);
  logger.info(`CORS origin: ${CORS_ORIGIN}`);
  logger.warn('Socket.IO no está disponible en Lambda - solo rutas HTTP/API funcionarán');
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;

