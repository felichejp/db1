import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { JwtPayload } from '../types/global';
import logger from '../utils/logger';
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { query } from './database';
>>>>>>> origin/Juan_Nambo
=======
import { query } from './database';
>>>>>>> origin/Juan_Nambo

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
<<<<<<< HEAD
<<<<<<< HEAD
    socket.on('join_group', (groupId: number) => {
      socket.join(`group_${groupId}`);
      logger.debug(`Usuario ${user.userId} se unió al grupo ${groupId}`);
=======
=======
>>>>>>> origin/Juan_Nambo
    socket.on('join_group', async (groupId: number) => {
      try {
        // Validar que groupId sea un número válido
        if (!groupId || typeof groupId !== 'number' || groupId <= 0) {
          socket.emit('error', { 
            type: 'validation_error',
            message: 'ID de grupo inválido' 
          });
          logger.warn(`Intento de unirse a grupo con ID inválido: ${groupId} por usuario ${user.userId}`);
          return;
        }

        // Verificar si el usuario es miembro del grupo o tiene permisos
        // Admin puede unirse a cualquier grupo
        if (user.role === 'Admin') {
          socket.join(`group_${groupId}`);
          logger.info(`Admin ${user.userId} se unió al grupo ${groupId}`);
          socket.emit('joined_group', { groupId });
          return;
        }

        // Asegurar que userId sea número
        const userId = typeof user.userId === 'number' ? user.userId : parseInt(String(user.userId), 10);
        const groupIdNum = typeof groupId === 'number' ? groupId : parseInt(String(groupId), 10);

        // Validar que las conversiones sean válidas
        if (isNaN(userId) || isNaN(groupIdNum)) {
          logger.error('Error en tipos de datos', { 
            originalUserId: user.userId, 
            originalGroupId: groupId,
            parsedUserId: userId,
            parsedGroupId: groupIdNum
          });
          socket.emit('error', { 
            type: 'validation_error',
            message: 'Error en tipos de datos' 
          });
          return;
        }

        // Verificar membresía en el grupo
        const membershipResult = await query(
          `SELECT 1 FROM group_members 
           WHERE "groupId" = $1 AND "userId" = $2`,
          [groupIdNum, userId]
        );

        // Verificar si es profesor del grupo
        const professorResult = await query(
          `SELECT 1 FROM groups 
           WHERE id = $1 AND "profesorId" = $2`,
          [groupIdNum, userId]
        );

        // Verificar si es tutor asignado a sesiones del grupo
        const tutorResult = await query(
          `SELECT 1 FROM sessions s
           JOIN tutors t ON s."tutorId" = t.id
           WHERE s."groupId" = $1 AND t."userId" = $2
           LIMIT 1`,
          [groupIdNum, userId]
        );

        // Logging detallado para debugging
        logger.info('Validación de acceso a grupo', {
          userId,
          groupId: groupIdNum,
          userRole: user.role,
          esMiembro: membershipResult.rows.length > 0,
          esProfesor: professorResult.rows.length > 0,
          esTutor: tutorResult.rows.length > 0,
          membershipRows: membershipResult.rows.length,
          professorRows: professorResult.rows.length,
          tutorRows: tutorResult.rows.length
        });

        const hasAccess = 
          membershipResult.rows.length > 0 || 
          professorResult.rows.length > 0 ||
          tutorResult.rows.length > 0;

        if (hasAccess) {
          socket.join(`group_${groupId}`);
          logger.info(`Usuario ${user.userId} se unió al grupo ${groupId}`);
          socket.emit('joined_group', { groupId });
        } else {
          socket.emit('error', { 
            type: 'authorization_error',
            message: 'No tienes acceso a este grupo' 
          });
          logger.warn(`Usuario ${user.userId} intentó unirse al grupo ${groupId} sin acceso`);
        }
      } catch (error) {
        logger.error('Error al unirse a grupo', { 
          error, 
          userId: user.userId, 
          groupId 
        });
        socket.emit('error', { 
          type: 'server_error',
          message: 'Error al unirse al grupo' 
        });
      }
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
    });

    // Evento: Salir de room de grupo
    socket.on('leave_group', (groupId: number) => {
<<<<<<< HEAD
<<<<<<< HEAD
      socket.leave(`group_${groupId}`);
      logger.debug(`Usuario ${user.userId} salió del grupo ${groupId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Usuario desconectado: ${user.email} (${user.userId})`);
=======
=======
>>>>>>> origin/Juan_Nambo
      try {
        if (!groupId || typeof groupId !== 'number' || groupId <= 0) {
          socket.emit('error', { 
            type: 'validation_error',
            message: 'ID de grupo inválido' 
          });
          return;
        }
        socket.leave(`group_${groupId}`);
        logger.debug(`Usuario ${user.userId} salió del grupo ${groupId}`);
        socket.emit('left_group', { groupId });
      } catch (error) {
        logger.error('Error al salir de grupo', { error, userId: user.userId, groupId });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Usuario desconectado: ${user.email} (${user.userId}), razón: ${reason}`);
    });

    // Manejo de errores del socket
    socket.on('error', (error) => {
      logger.error('Error en socket', { error, userId: user.userId });
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
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


