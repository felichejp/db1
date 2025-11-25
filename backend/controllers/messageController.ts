import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';
import { emitToGroup, emitToUser } from '../config/socket';

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

    const { groupId, recipientId, content, tipo } = req.body;
    console.log('createMessage - Datos recibidos', { groupId, recipientId, content: content?.substring(0, 50), tipo, userId: req.user.userId, role: req.user.role });

    // Validaciones: debe tener groupId O recipientId, pero no ambos
    if (!groupId && !recipientId) {
      console.log('createMessage - groupId o recipientId requerido');
      sendError(res, 'groupId o recipientId es requerido', 400);
      return;
    }

    if (groupId && recipientId) {
      console.log('createMessage - No se puede enviar a grupo y usuario al mismo tiempo');
      sendError(res, 'No se puede enviar a grupo y usuario al mismo tiempo', 400);
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.log('createMessage - contenido inválido');
      sendError(res, 'El contenido del mensaje es requerido', 400);
      return;
    }

    // Normalizar tipos
    const userId = typeof req.user.userId === 'number' ? req.user.userId : parseInt(String(req.user.userId), 10);
    
    // Mensaje privado
    if (recipientId) {
      const recipientIdNum = typeof recipientId === 'number' ? recipientId : parseInt(String(recipientId), 10);
      
      if (isNaN(userId) || isNaN(recipientIdNum)) {
        sendError(res, 'Error en los parámetros: userId o recipientId inválidos', 400);
        return;
      }

      // Solo Profesores y Estudiantes pueden enviar mensajes privados
      if (req.user.role !== 'Profesor' && req.user.role !== 'Estudiante') {
        sendError(res, 'Solo profesores y estudiantes pueden enviar mensajes privados', 403);
        return;
      }

      // Verificar que el destinatario existe y es Profesor o Estudiante
      const recipientCheck = await query(
        'SELECT id, nombre, email, role FROM users WHERE id = $1',
        [recipientIdNum]
      );

      if (recipientCheck.rows.length === 0) {
        sendError(res, 'Usuario destinatario no encontrado', 404);
        return;
      }

      const recipient = recipientCheck.rows[0];
      if (recipient.role !== 'Profesor' && recipient.role !== 'Estudiante') {
        sendError(res, 'Solo puedes enviar mensajes a profesores y estudiantes', 403);
        return;
      }

      // No permitir enviarse mensajes a sí mismo
      if (userId === recipientIdNum) {
        sendError(res, 'No puedes enviarte mensajes a ti mismo', 400);
        return;
      }

      // Insertar mensaje privado
      const result = await query(
        `INSERT INTO messages ("senderId", "recipientId", content, tipo)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, recipientIdNum, content.trim(), tipo || 'texto']
      );

      const newMessage = result.rows[0];
      
      // Obtener información del remitente
      const senderResult = await query(
        `SELECT id, nombre, email FROM users WHERE id = $1`,
        [userId]
      );
      
      if (senderResult.rows.length > 0) {
        newMessage.senderName = senderResult.rows[0].nombre;
        newMessage.senderEmail = senderResult.rows[0].email;
      }

      // Emitir evento por Socket.IO al destinatario
      emitToUser(recipientIdNum, 'private_message', newMessage);
      
      sendSuccess(res, newMessage, 'Mensaje enviado', 201);
      return;
    }

    // Mensaje de grupo (código existente)
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
    } else if (message.recipientId) {
      // Para mensajes privados, notificar a ambos usuarios
      const senderId = message.senderId;
      const recipientId = message.recipientId;
      emitToUser(senderId, 'private_message_deleted', { messageId: parseInt(id, 10) });
      emitToUser(recipientId, 'private_message_deleted', { messageId: parseInt(id, 10) });
    }
    
    sendSuccess(res, null, 'Mensaje eliminado');
  } catch (error) {
    console.error('Error en deleteMessage:', error);
    sendError(res, 'Error al eliminar mensaje', 500);
  }
}

/**
 * Obtener conversaciones del usuario (solo Profesores y Estudiantes)
 */
export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    // Solo Profesores y Estudiantes pueden ver conversaciones
    if (req.user.role !== 'Profesor' && req.user.role !== 'Estudiante') {
      sendError(res, 'Solo profesores y estudiantes pueden ver conversaciones', 403);
      return;
    }

    const userId = typeof req.user.userId === 'number' ? req.user.userId : parseInt(String(req.user.userId), 10);

    // Obtener todas las conversaciones donde el usuario es remitente o destinatario
    // Agrupar por el otro usuario de la conversación
    const result = await query(
      `WITH conversation_messages AS (
        SELECT 
          CASE 
            WHEN m."senderId" = $1 THEN m."recipientId"
            ELSE m."senderId"
          END as "otherUserId",
          m.content,
          m."createdAt",
          m."senderId"
        FROM messages m
        WHERE (m."senderId" = $1 OR m."recipientId" = $1)
        AND m."recipientId" IS NOT NULL
        ORDER BY m."createdAt" DESC
      ),
      latest_messages AS (
        SELECT DISTINCT ON ("otherUserId")
          "otherUserId",
          content as "lastMessage",
          "createdAt" as "lastMessageAt"
        FROM conversation_messages
        ORDER BY "otherUserId", "createdAt" DESC
      )
      SELECT 
        u.id,
        u.nombre,
        u.email,
        u.role,
        lm."lastMessage",
        lm."lastMessageAt",
        (SELECT COUNT(*) FROM messages m2 
         WHERE m2."recipientId" = $1 
         AND m2."senderId" = u.id 
         AND m2."createdAt" > COALESCE(
           (SELECT MAX(m3."createdAt") FROM messages m3 
            WHERE m3."senderId" = $1 AND m3."recipientId" = u.id), 
           '1970-01-01'::timestamp
         )
        ) as "unreadCount"
      FROM latest_messages lm
      JOIN users u ON u.id = lm."otherUserId"
      WHERE u.role IN ('Profesor', 'Estudiante')
      ORDER BY lm."lastMessageAt" DESC
      LIMIT 50`,
      [userId]
    );

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getConversations:', error);
    sendError(res, 'Error al obtener conversaciones', 500);
  }
}

/**
 * Obtener mensajes de una conversación privada
 */
export async function getPrivateMessages(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    // Solo Profesores y Estudiantes pueden ver mensajes privados
    if (req.user.role !== 'Profesor' && req.user.role !== 'Estudiante') {
      sendError(res, 'Solo profesores y estudiantes pueden ver mensajes privados', 403);
      return;
    }

    const { userId: otherUserId } = req.params;
    const currentUserId = typeof req.user.userId === 'number' ? req.user.userId : parseInt(String(req.user.userId), 10);
    const otherUserIdNum = typeof otherUserId === 'number' ? parseInt(String(otherUserId), 10) : parseInt(otherUserId, 10);

    if (isNaN(currentUserId) || isNaN(otherUserIdNum)) {
      sendError(res, 'ID de usuario inválido', 400);
      return;
    }

    // Verificar que el otro usuario existe y es Profesor o Estudiante
    const userCheck = await query(
      'SELECT id, nombre, email, role FROM users WHERE id = $1',
      [otherUserIdNum]
    );

    if (userCheck.rows.length === 0) {
      sendError(res, 'Usuario no encontrado', 404);
      return;
    }

    if (userCheck.rows[0].role !== 'Profesor' && userCheck.rows[0].role !== 'Estudiante') {
      sendError(res, 'Solo puedes conversar con profesores y estudiantes', 403);
      return;
    }

    // Obtener mensajes de la conversación
    const result = await query(
      `SELECT m.*, 
        u_sender.nombre as "senderName", 
        u_sender.email as "senderEmail",
        u_recipient.nombre as "recipientName",
        u_recipient.email as "recipientEmail"
      FROM messages m
      JOIN users u_sender ON m."senderId" = u_sender.id
      LEFT JOIN users u_recipient ON m."recipientId" = u_recipient.id
      WHERE ((m."senderId" = $1 AND m."recipientId" = $2) OR 
             (m."senderId" = $2 AND m."recipientId" = $1))
      AND m."recipientId" IS NOT NULL
      ORDER BY m."createdAt" ASC`,
      [currentUserId, otherUserIdNum]
    );

    // Marcar mensajes como leídos
    await query(
      `UPDATE messages 
       SET "createdAt" = "createdAt" 
       WHERE "recipientId" = $1 AND "senderId" = $2`,
      [currentUserId, otherUserIdNum]
    );

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getPrivateMessages:', error);
    sendError(res, 'Error al obtener mensajes', 500);
  }
}


