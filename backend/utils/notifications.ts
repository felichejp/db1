import { query } from '../config/database';
import { emitToUser } from '../config/socket';
import logger from './logger';

export interface NotificationData {
  userId: number;
  tipo: string;
  titulo: string;
  mensaje?: string;
  relacionId?: number;
  relacionTipo?: string;
}

/**
 * Crea una notificación en la base de datos y la emite por Socket.IO
 */
export async function createAndEmitNotification(data: NotificationData): Promise<void> {
  try {
    const result = await query(
      `INSERT INTO notifications ("userId", tipo, titulo, mensaje, "relacionId", "relacionTipo")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.userId,
        data.tipo,
        data.titulo,
        data.mensaje || null,
        data.relacionId || null,
        data.relacionTipo || null
      ]
    );

    const notification = result.rows[0];

    // Emitir por Socket.IO
    emitToUser(data.userId, 'notification', notification);

    logger.debug('Notificación creada y emitida', { notificationId: notification.id, userId: data.userId });
  } catch (error) {
    logger.error('Error al crear notificación', { error, data });
    // No lanzar error para no interrumpir el flujo principal
  }
}

/**
 * Crea múltiples notificaciones para varios usuarios
 */
export async function createAndEmitNotificationsForUsers(
  userIds: number[],
  tipo: string,
  titulo: string,
  mensaje?: string,
  relacionId?: number,
  relacionTipo?: string
): Promise<void> {
  const promises = userIds.map(userId =>
    createAndEmitNotification({
      userId,
      tipo,
      titulo,
      mensaje,
      relacionId,
      relacionTipo
    })
  );

  await Promise.all(promises);
}

