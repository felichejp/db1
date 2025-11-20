import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { JwtPayload } from '../types/global';
import logger from '../utils/logger';

let io: Server | null = null;

/**
 * Inicializa Socket.IO
 */
export function initializeSocket(server: HttpServer): Server {
  const socketPath = process.env.SOCKET_IO_PATH || '/socket.io';

  io = new Server(server, {
    path: socketPath,
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
      methods: ['GET', 'POST']
    }
  });

  // Middleware de autenticación
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Token no proporcionado'));
    }

    try {
      const decoded = verifyToken(token as string);
      (socket as any).user = decoded;
      next();
    } catch (error) {
      logger.error('Error autenticando socket', error);
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    logger.info(`Usuario conectado: ${user.email} (${user.userId})`);

    // Unirse a room del usuario
    socket.join(`user_${user.userId}`);

    // Evento: Unirse a room de grupo
    socket.on('join_group', (groupId: number) => {
      socket.join(`group_${groupId}`);
      logger.debug(`Usuario ${user.userId} se unió al grupo ${groupId}`);
    });

    // Evento: Salir de room de grupo
    socket.on('leave_group', (groupId: number) => {
      socket.leave(`group_${groupId}`);
      logger.debug(`Usuario ${user.userId} salió del grupo ${groupId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Usuario desconectado: ${user.email} (${user.userId})`);
    });
  });

  return io;
}

/**
 * Obtiene la instancia de Socket.IO
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO no inicializado. Llama a initializeSocket primero.');
  }
  return io;
}

/**
 * Emite un evento a un usuario específico
 */
export function emitToUser(userId: number, event: string, data: unknown): void {
  if (!io) return;
  io.to(`user_${userId}`).emit(event, {
    type: event,
    data,
    timestamp: new Date()
  });
}

/**
 * Emite un evento a un grupo específico
 */
export function emitToGroup(groupId: number, event: string, data: unknown): void {
  if (!io) return;
  io.to(`group_${groupId}`).emit(event, {
    type: event,
    data,
    timestamp: new Date()
  });
}


