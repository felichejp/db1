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
<<<<<<< HEAD
    if (!req.user) {
=======
    console.log('createMessage - Inicio', { body: req.body, user: req.user });
    
    if (!req.user) {
      console.log('createMessage - No autenticado');
>>>>>>> origin/Juan_Nambo
      sendError(res, 'No autenticado', 401);
      return;
    }

    const { groupId, content, tipo } = req.body;
<<<<<<< HEAD

=======
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
>>>>>>> origin/Juan_Nambo
    const result = await query(
      `INSERT INTO messages ("senderId", "groupId", content, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
<<<<<<< HEAD
      [req.user.userId, groupId, content, tipo || 'texto']
    );

    emitToGroup(groupId, 'new_message', result.rows[0]);
    sendSuccess(res, result.rows[0], 'Mensaje enviado', 201);
  } catch (error) {
    console.error('Error en createMessage:', error);
=======
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
>>>>>>> origin/Juan_Nambo
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

<<<<<<< HEAD
    const msgResult = await query('SELECT "senderId" FROM messages WHERE id = $1', [id]);
=======
    // Obtener información del mensaje antes de eliminarlo
    const msgResult = await query('SELECT "senderId", "groupId" FROM messages WHERE id = $1', [id]);
>>>>>>> origin/Juan_Nambo
    if (msgResult.rows.length === 0) {
      sendError(res, 'Mensaje no encontrado', 404);
      return;
    }

<<<<<<< HEAD
    if (req.user.role !== 'Admin' && msgResult.rows[0].senderId !== req.user.userId) {
=======
    const message = msgResult.rows[0];

    if (req.user.role !== 'Admin' && message.senderId !== req.user.userId) {
>>>>>>> origin/Juan_Nambo
      sendError(res, 'No tiene permisos para eliminar este mensaje', 403);
      return;
    }

    await query('DELETE FROM messages WHERE id = $1', [id]);
<<<<<<< HEAD
=======
    
    // Emitir evento de eliminación al grupo
    emitToGroup(message.groupId, 'message_deleted', { messageId: parseInt(id, 10) });
    
>>>>>>> origin/Juan_Nambo
    sendSuccess(res, null, 'Mensaje eliminado');
  } catch (error) {
    console.error('Error en deleteMessage:', error);
    sendError(res, 'Error al eliminar mensaje', 500);
  }
}


