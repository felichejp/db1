import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const result = await query(
      `SELECT * FROM notifications 
       WHERE "userId" = $1 
       ORDER BY "createdAt" DESC
       LIMIT 50`,
      [req.user.userId]
    );

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getNotifications:', error);
    sendError(res, 'Error al obtener notificaciones', 500);
  }
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE "userId" = $1 AND leida = false',
      [req.user.userId]
    );

    sendSuccess(res, { count: parseInt(result.rows[0].count, 10) });
  } catch (error) {
    console.error('Error en getUnreadCount:', error);
    sendError(res, 'Error al contar notificaciones', 500);
  }
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const { id } = req.params;

    const result = await query(
      `UPDATE notifications 
       SET leida = true 
       WHERE id = $1 AND "userId" = $2 
       RETURNING *`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Notificación no encontrada', 404);
      return;
    }

    sendSuccess(res, result.rows[0], 'Notificación marcada como leída');
  } catch (error) {
    console.error('Error en markAsRead:', error);
    sendError(res, 'Error al marcar notificación', 500);
  }
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    await query(
      `UPDATE notifications 
       SET leida = true 
       WHERE "userId" = $1 AND leida = false`,
      [req.user.userId]
    );

    sendSuccess(res, null, 'Todas las notificaciones marcadas como leídas');
  } catch (error) {
    console.error('Error en markAllAsRead:', error);
    sendError(res, 'Error al marcar notificaciones', 500);
  }
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const { id } = req.params;

    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND "userId" = $2 RETURNING *',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Notificación no encontrada', 404);
      return;
    }

    sendSuccess(res, null, 'Notificación eliminada');
  } catch (error) {
    console.error('Error en deleteNotification:', error);
    sendError(res, 'Error al eliminar notificación', 500);
  }
}

