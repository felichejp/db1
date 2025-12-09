import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';
import { emitToGroup } from '../config/socket';

export async function getGroupMessages(req: Request, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const result = await query(
      `SELECT m.*, u.nombre as "senderName", u.email as "senderEmail"
       FROM messages m
       JOIN users u ON m."senderId" = u.id
       WHERE m."groupId" = $1
       ORDER BY m."createdAt" ASC`,
      [groupId]
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getGroupMessages:', error);
    sendError(res, 'Error al obtener mensajes', 500);
  }
}

export async function createMessage(req: Request, res: Response): Promise<void> {
  try {
    console.log('createMessage - Inicio', { body: req.body, user: req.user });
    
    if (!req.user) {
      console.log('createMessage - No autenticado');
      sendError(res, 'No autenticado', 401);
      return;
    }

    const { groupId, content, tipo } = req.body;
    console.log('createMessage - Datos recibidos', { groupId, content: content?.substring(0, 50), tipo, userId: req.user.userId, role: req.user.role });

    // Validaciones
    if (!groupId) {
      console.log('createMessage - groupId faltante');
      sendError(res, 'groupId es requerido', 400);
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.log('createMessage - contenido inválido');
      sendError(res, 'El contenido del mensaje es requerido', 400);
      return;
    }

    // Normalizar tipos
    const userId = typeof req.user.userId === 'number' ? req.user.userId : parseInt(String(req.user.userId), 10);
    const groupIdNum = typeof groupId === 'number' ? groupId : parseInt(String(groupId), 10);
    
    if (isNaN(userId) || isNaN(groupIdNum)) {
      console.error('createMessage - Error en conversión de tipos', { userId, groupIdNum, originalUserId: req.user.userId, originalGroupId: groupId });
      sendError(res, 'Error en los parámetros: userId o groupId inválidos', 400);
      return;
    }

    console.log('createMessage - Tipos normalizados', { userId, groupIdNum });

    // Verificar que el grupo existe
    console.log('createMessage - Verificando grupo...');
    const groupCheck = await query('SELECT id FROM groups WHERE id = $1', [groupIdNum]);
    if (groupCheck.rows.length === 0) {
      console.log('createMessage - Grupo no encontrado', { groupIdNum });
      sendError(res, 'Grupo no encontrado', 404);
      return;
    }
    console.log('createMessage - Grupo encontrado');

    // Verificar que el usuario tiene acceso al grupo (es miembro, profesor, tutor asignado, o Admin)
    if (req.user.role !== 'Admin') {
      console.log('createMessage - Verificando acceso (no Admin)...');
      const membershipCheck = await query(
        `SELECT 1 FROM group_members WHERE "groupId" = $1 AND "userId" = $2`,
        [groupIdNum, userId]
      );
      const professorCheck = await query(
        `SELECT 1 FROM groups WHERE id = $1 AND "profesorId" = $2`,
        [groupIdNum, userId]
      );
      const tutorCheck = await query(
        `SELECT 1 FROM sessions s 
         JOIN tutors t ON s."tutorId" = t.id 
         WHERE s."groupId" = $1 AND t."userId" = $2 
         LIMIT 1`,
        [groupIdNum, userId]
      );

      const hasAccess = 
        membershipCheck.rows.length > 0 || 
        professorCheck.rows.length > 0 || 
        tutorCheck.rows.length > 0;

      console.log('createMessage - Resultados de acceso', {
        esMiembro: membershipCheck.rows.length > 0,
        esProfesor: professorCheck.rows.length > 0,
        esTutor: tutorCheck.rows.length > 0,
        hasAccess
      });

      if (!hasAccess) {
        console.log('createMessage - Sin acceso al grupo');
        sendError(res, 'No tienes acceso a este grupo', 403);
        return;
      }
    } else {
      console.log('createMessage - Admin, saltando verificación de acceso');
    }

    // Insertar mensaje
    console.log('createMessage - Insertando mensaje...', { userId, groupIdNum, content: content.substring(0, 30), tipo: tipo || 'texto' });
    const result = await query(
      `INSERT INTO messages ("senderId", "groupId", content, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, groupIdNum, content.trim(), tipo || 'texto']
    );

    const newMessage = result.rows[0];
    console.log('createMessage - Mensaje insertado', { messageId: newMessage.id });

    // Obtener información del remitente para incluir en el evento
    console.log('createMessage - Obteniendo información del remitente...');
    const senderResult = await query(
      `SELECT id, nombre, email FROM users WHERE id = $1`,
      [userId]
    );
    
    if (senderResult.rows.length > 0) {
      newMessage.senderName = senderResult.rows[0].nombre;
      newMessage.senderEmail = senderResult.rows[0].email;
      console.log('createMessage - Información del remitente obtenida', { senderName: newMessage.senderName });
    } else {
      console.warn('createMessage - Remitente no encontrado en users', { userId });
    }

    // Emitir evento por Socket.IO
    console.log('createMessage - Emitiendo evento Socket.IO...');
    emitToGroup(groupIdNum, 'new_message', newMessage);
    console.log('createMessage - Evento emitido');

    console.log('createMessage - Éxito');
    sendSuccess(res, newMessage, 'Mensaje enviado', 201);
  } catch (error) {
    console.error('Error en createMessage:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } else {
      console.error('Error desconocido:', error);
    }
    sendError(res, 'Error al enviar mensaje', 500);
  }
}

export async function deleteMessage(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    // Obtener información del mensaje antes de eliminarlo
    const msgResult = await query('SELECT "senderId", "groupId", "recipientId" FROM messages WHERE id = $1', [id]);
    if (msgResult.rows.length === 0) {
      sendError(res, 'Mensaje no encontrado', 404);
      return;
    }

    const message = msgResult.rows[0];

    if (req.user.role !== 'Admin' && message.senderId !== req.user.userId) {
      sendError(res, 'No tiene permisos para eliminar este mensaje', 403);
      return;
    }

    await query('DELETE FROM messages WHERE id = $1', [id]);
    
    // Emitir evento de eliminación
    if (message.groupId) {
      emitToGroup(message.groupId, 'message_deleted', { messageId: parseInt(id, 10) });
    }
    
    sendSuccess(res, null, 'Mensaje eliminado');
  } catch (error) {
    console.error('Error en deleteMessage:', error);
    sendError(res, 'Error al eliminar mensaje', 500);
  }
}

/**
 * Obtener conversaciones directas del usuario
 */
export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const userId = typeof req.user.userId === 'number' 
      ? req.user.userId 
      : parseInt(String(req.user.userId), 10);

    // Obtener conversaciones: usuarios con los que el usuario actual ha intercambiado mensajes directos
    // Primero verificar si la columna recipientId existe
    const result = await query(
      `SELECT DISTINCT
        CASE 
          WHEN m."senderId" = $1 THEN m."recipientId"
          ELSE m."senderId"
        END as "otherUserId",
        u.id, u.nombre, u.email, u.role,
        (SELECT content FROM messages 
         WHERE "groupId" IS NULL
         AND (("senderId" = $1 AND "recipientId" = u.id) 
            OR ("senderId" = u.id AND "recipientId" = $1))
         ORDER BY "createdAt" DESC LIMIT 1) as "lastMessage",
        (SELECT "createdAt" FROM messages 
         WHERE "groupId" IS NULL
         AND (("senderId" = $1 AND "recipientId" = u.id) 
            OR ("senderId" = u.id AND "recipientId" = $1))
         ORDER BY "createdAt" DESC LIMIT 1) as "lastMessageTime",
        COALESCE((SELECT COUNT(*)::INTEGER FROM messages 
         WHERE "groupId" IS NULL
         AND "senderId" = u.id AND "recipientId" = $1 AND "readAt" IS NULL), 0) as "unreadCount"
       FROM messages m
       JOIN users u ON (
         CASE 
           WHEN m."senderId" = $1 THEN u.id = m."recipientId"
           ELSE u.id = m."senderId"
         END
       )
       WHERE (m."senderId" = $1 OR m."recipientId" = $1)
       AND m."groupId" IS NULL
       AND m."recipientId" IS NOT NULL
       ORDER BY "lastMessageTime" DESC NULLS LAST`,
      [userId]
    );

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getConversations:', error);
    sendError(res, 'Error al obtener conversaciones', 500);
  }
}

/**
 * Obtener mensajes de una conversación directa
 */
export async function getDirectMessages(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const { userId: otherUserId } = req.params;
    const currentUserId = typeof req.user.userId === 'number' 
      ? req.user.userId 
      : parseInt(String(req.user.userId), 10);
    const otherUserIdNum = parseInt(otherUserId, 10);

    if (isNaN(otherUserIdNum)) {
      sendError(res, 'ID de usuario inválido', 400);
      return;
    }

    // Obtener mensajes entre los dos usuarios
    const result = await query(
      `SELECT m.*, u.nombre as "senderName", u.email as "senderEmail"
       FROM messages m
       JOIN users u ON m."senderId" = u.id
       WHERE m."groupId" IS NULL
       AND m."recipientId" IS NOT NULL
       AND ((m."senderId" = $1 AND m."recipientId" = $2) 
            OR (m."senderId" = $2 AND m."recipientId" = $1))
       ORDER BY m."createdAt" ASC`,
      [currentUserId, otherUserIdNum]
    );

    // Marcar mensajes como leídos
    await query(
      `UPDATE messages 
       SET "readAt" = CURRENT_TIMESTAMP 
       WHERE "senderId" = $1 AND "recipientId" = $2 AND "readAt" IS NULL`,
      [otherUserIdNum, currentUserId]
    );

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getDirectMessages:', error);
    sendError(res, 'Error al obtener mensajes', 500);
  }
}

/**
 * Crear mensaje directo
 */
export async function createDirectMessage(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const { recipientId, content } = req.body;

    if (!recipientId) {
      sendError(res, 'recipientId es requerido', 400);
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      sendError(res, 'El contenido del mensaje es requerido', 400);
      return;
    }

    const senderId = typeof req.user.userId === 'number' 
      ? req.user.userId 
      : parseInt(String(req.user.userId), 10);
    const recipientIdNum = typeof recipientId === 'number' 
      ? recipientId 
      : parseInt(String(recipientId), 10);

    if (isNaN(senderId) || isNaN(recipientIdNum)) {
      sendError(res, 'IDs de usuario inválidos', 400);
      return;
    }

    if (senderId === recipientIdNum) {
      sendError(res, 'No puedes enviarte mensajes a ti mismo', 400);
      return;
    }

    // Verificar que el destinatario existe
    const recipientCheck = await query('SELECT id FROM users WHERE id = $1', [recipientIdNum]);
    if (recipientCheck.rows.length === 0) {
      sendError(res, 'Usuario destinatario no encontrado', 404);
      return;
    }

    // Insertar mensaje directo
    // Nota: Si la tabla no tiene recipientId aún, necesitas ejecutar la migración primero
    const result = await query(
      `INSERT INTO messages ("senderId", "recipientId", content, tipo)
       VALUES ($1, $2, $3, 'texto')
       RETURNING *`,
      [senderId, recipientIdNum, content.trim()]
    );

    const newMessage = result.rows[0];

    // Obtener información del remitente
    const senderResult = await query(
      `SELECT id, nombre, email FROM users WHERE id = $1`,
      [senderId]
    );
    
    if (senderResult.rows.length > 0) {
      newMessage.senderName = senderResult.rows[0].nombre;
      newMessage.senderEmail = senderResult.rows[0].email;
    }

    // Emitir evento por Socket.IO (si está configurado para mensajes directos)
    // TODO: Implementar emisión de eventos para mensajes directos
    
    sendSuccess(res, newMessage, 'Mensaje enviado', 201);
  } catch (error) {
    console.error('Error en createDirectMessage:', error);
    sendError(res, 'Error al enviar mensaje', 500);
  }
}


