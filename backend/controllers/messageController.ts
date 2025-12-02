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
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const { groupId, content, tipo } = req.body;

    // Obtener información del grupo y del remitente
    const [groupResult, senderResult] = await Promise.all([
      query('SELECT nombre FROM groups WHERE id = $1', [groupId]),
      query('SELECT nombre FROM users WHERE id = $1', [req.user.userId])
    ]);

    if (groupResult.rows.length === 0) {
      sendError(res, 'Grupo no encontrado', 404);
      return;
    }

    const groupName = groupResult.rows[0].nombre;
    const senderName = senderResult.rows[0]?.nombre || req.user.email;

    // Crear el mensaje
    const result = await query(
      `INSERT INTO messages ("senderId", "groupId", content, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.userId, groupId, content, tipo || 'texto']
    );

    const message = result.rows[0];
    
    // Agregar información del remitente al mensaje
    const messageWithSender = {
      ...message,
      senderName: senderName
    };

    // Emitir mensaje a todos los miembros del grupo
    emitToGroup(groupId, 'new_message', messageWithSender);

    // Obtener todos los miembros del grupo (excepto el remitente)
    const membersResult = await query(
      `SELECT "userId" FROM group_members WHERE "groupId" = $1 AND "userId" != $2
       UNION
       SELECT "profesorId" as "userId" FROM groups WHERE id = $1 AND "profesorId" IS NOT NULL AND "profesorId" != $2`,
      [groupId, req.user.userId]
    );

    const memberIds = membersResult.rows.map((row: any) => row.userId);

    // Crear notificaciones para cada miembro
    for (const memberId of memberIds) {
      try {
        await query(
          `INSERT INTO notifications ("userId", tipo, titulo, mensaje, "relacionId", "relacionTipo")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            memberId,
            'mensaje_nuevo',
            `Nuevo mensaje en ${groupName}`,
            `${senderName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
            groupId,
            'group'
          ]
        );

        // Enviar notificación por Socket.IO
        emitToUser(memberId, 'message_notification', {
          groupId: groupId,
          groupName: groupName,
          senderId: req.user.userId,
          senderName: senderName,
          messageId: message.id,
          content: content.substring(0, 100)
        });
      } catch (notifError) {
        console.error(`Error creando notificación para usuario ${memberId}:`, notifError);
        // Continuar con los demás miembros aunque falle uno
      }
    }

    sendSuccess(res, messageWithSender, 'Mensaje enviado', 201);
  } catch (error) {
    console.error('Error en createMessage:', error);
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

    const msgResult = await query('SELECT "senderId" FROM messages WHERE id = $1', [id]);
    if (msgResult.rows.length === 0) {
      sendError(res, 'Mensaje no encontrado', 404);
      return;
    }

    if (req.user.role !== 'Admin' && msgResult.rows[0].senderId !== req.user.userId) {
      sendError(res, 'No tiene permisos para eliminar este mensaje', 403);
      return;
    }

    await query('DELETE FROM messages WHERE id = $1', [id]);
    sendSuccess(res, null, 'Mensaje eliminado');
  } catch (error) {
    console.error('Error en deleteMessage:', error);
    sendError(res, 'Error al eliminar mensaje', 500);
  }
}


