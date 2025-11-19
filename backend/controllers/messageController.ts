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
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const { groupId, content, tipo } = req.body;

    const result = await query(
      `INSERT INTO messages ("senderId", "groupId", content, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.userId, groupId, content, tipo || 'texto']
    );

    emitToGroup(groupId, 'new_message', result.rows[0]);
    sendSuccess(res, result.rows[0], 'Mensaje enviado', 201);
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


