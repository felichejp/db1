import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';
import { emitToGroup, emitToUser } from '../config/socket';
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { createAndEmitNotificationsForUsers } from '../utils/notifications';
>>>>>>> origin/Juan_Nambo
=======
import { createAndEmitNotificationsForUsers } from '../utils/notifications';
>>>>>>> origin/Juan_Nambo

export async function getSessions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    let result;
    if (req.user.role === 'Admin') {
<<<<<<< HEAD
<<<<<<< HEAD
      result = await query(`
        SELECT s.*, u.nombre as "nombreTutor" 
        FROM sessions s
        LEFT JOIN tutors t ON s."tutorId" = t.id
        LEFT JOIN users u ON t."userId" = u.id
        ORDER BY s.fecha DESC, s."horaInicio" DESC
      `);
=======
      result = await query('SELECT * FROM sessions ORDER BY fecha DESC, "horaInicio" DESC');
>>>>>>> origin/Juan_Nambo
=======
      result = await query('SELECT * FROM sessions ORDER BY fecha DESC, "horaInicio" DESC');
>>>>>>> origin/Juan_Nambo
    } else if (req.user.role === 'Tutor') {
      const tutorResult = await query('SELECT id FROM tutors WHERE "userId" = $1', [req.user.userId]);
      if (tutorResult.rows.length > 0) {
        result = await query(
<<<<<<< HEAD
<<<<<<< HEAD
          `SELECT s.*, u.nombre as "nombreTutor"
           FROM sessions s
           LEFT JOIN tutors t ON s."tutorId" = t.id
           LEFT JOIN users u ON t."userId" = u.id
           WHERE s."tutorId" = $1 
           ORDER BY s.fecha DESC, s."horaInicio" DESC`,
=======
          'SELECT * FROM sessions WHERE "tutorId" = $1 ORDER BY fecha DESC, "horaInicio" DESC',
>>>>>>> origin/Juan_Nambo
=======
          'SELECT * FROM sessions WHERE "tutorId" = $1 ORDER BY fecha DESC, "horaInicio" DESC',
>>>>>>> origin/Juan_Nambo
          [tutorResult.rows[0].id]
        );
      } else {
        result = { rows: [] };
      }
    } else {
      result = await query(
<<<<<<< HEAD
<<<<<<< HEAD
        `SELECT s.*, u.nombre as "nombreTutor"
         FROM sessions s
         JOIN group_members gm ON s."groupId" = gm."groupId"
         LEFT JOIN tutors t ON s."tutorId" = t.id
         LEFT JOIN users u ON t."userId" = u.id
=======
        `SELECT s.* FROM sessions s
         JOIN group_members gm ON s."groupId" = gm."groupId"
>>>>>>> origin/Juan_Nambo
=======
        `SELECT s.* FROM sessions s
         JOIN group_members gm ON s."groupId" = gm."groupId"
>>>>>>> origin/Juan_Nambo
         WHERE gm."userId" = $1
         ORDER BY s.fecha DESC, s."horaInicio" DESC`,
        [req.user.userId]
      );
    }

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getSessions:', error);
    sendError(res, 'Error al obtener sesiones', 500);
  }
}

export async function createSession(req: Request, res: Response): Promise<void> {
  try {
<<<<<<< HEAD
<<<<<<< HEAD
    const { groupId, tutorId, fecha, horaInicio, horaFin, tema, materia, cupo } = req.body;

    const result = await query(
      `INSERT INTO sessions ("groupId", "tutorId", fecha, "horaInicio", "horaFin", tema, materia, cupo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [groupId, tutorId || null, fecha, horaInicio, horaFin, tema || null, materia || null, cupo || null]
    );

    emitToGroup(groupId, 'session_updated', result.rows[0]);
    if (tutorId) {
      emitToUser(tutorId, 'session_reminder', result.rows[0]);
    }

    sendSuccess(res, result.rows[0], 'Sesión creada exitosamente', 201);
=======
=======
>>>>>>> origin/Juan_Nambo
    const { groupId, tutorId, fecha, horaInicio, horaFin, tema } = req.body;

    const result = await query(
      `INSERT INTO sessions ("groupId", "tutorId", fecha, "horaInicio", "horaFin", tema)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [groupId, tutorId || null, fecha, horaInicio, horaFin, tema || null]
    );

    const session = result.rows[0];

    // Emitir eventos por Socket.IO
    emitToGroup(groupId, 'session_updated', session);
    if (tutorId) {
      emitToUser(tutorId, 'session_reminder', session);
    }

    // Obtener miembros del grupo para notificarles
    const membersResult = await query(
      `SELECT "userId" FROM group_members WHERE "groupId" = $1`,
      [groupId]
    );
    const memberIds = membersResult.rows.map(row => row.userId);

    // Crear notificaciones para todos los miembros del grupo
    if (memberIds.length > 0) {
      await createAndEmitNotificationsForUsers(
        memberIds,
        'sesion_programada',
        'Nueva sesión programada',
        `Sesión programada para ${fecha} a las ${horaInicio}${tema ? ` - ${tema}` : ''}`,
        session.id,
        'session'
      );
    }

    // Notificar al tutor si existe
    if (tutorId) {
      const tutorUserResult = await query('SELECT "userId" FROM tutors WHERE id = $1', [tutorId]);
      if (tutorUserResult.rows.length > 0) {
        await createAndEmitNotificationsForUsers(
          [tutorUserResult.rows[0].userId],
          'sesion_asignada',
          'Sesión asignada',
          `Has sido asignado a una sesión el ${fecha} a las ${horaInicio}${tema ? ` - ${tema}` : ''}`,
          session.id,
          'session'
        );
      }
    }

    sendSuccess(res, session, 'Sesión creada exitosamente', 201);
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
  } catch (error) {
    console.error('Error en createSession:', error);
    sendError(res, 'Error al crear sesión', 500);
  }
}

export async function getSessionById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM sessions WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      sendError(res, 'Sesión no encontrada', 404);
      return;
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error('Error en getSessionById:', error);
    sendError(res, 'Error al obtener sesión', 500);
  }
}

export async function updateSession(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { tutorId, fecha, horaInicio, horaFin, tema, notas, estado } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (tutorId !== undefined) {
      updates.push(`"tutorId" = $${paramCount++}`);
      values.push(tutorId);
    }
    if (fecha !== undefined) {
      updates.push(`fecha = $${paramCount++}`);
      values.push(fecha);
    }
    if (horaInicio !== undefined) {
      updates.push(`"horaInicio" = $${paramCount++}`);
      values.push(horaInicio);
    }
    if (horaFin !== undefined) {
      updates.push(`"horaFin" = $${paramCount++}`);
      values.push(horaFin);
    }
    if (tema !== undefined) {
      updates.push(`tema = $${paramCount++}`);
      values.push(tema);
    }
    if (notas !== undefined) {
      updates.push(`notas = $${paramCount++}`);
      values.push(notas);
    }
    if (estado !== undefined) {
      updates.push(`estado = $${paramCount++}`);
      values.push(estado);
    }

    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE sessions SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      sendError(res, 'Sesión no encontrada', 404);
      return;
    }

    emitToGroup(result.rows[0].groupId, 'session_updated', result.rows[0]);
    sendSuccess(res, result.rows[0], 'Sesión actualizada');
  } catch (error) {
    console.error('Error en updateSession:', error);
    sendError(res, 'Error al actualizar sesión', 500);
  }
}

export async function deleteSession(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM sessions WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      sendError(res, 'Sesión no encontrada', 404);
      return;
    }
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> origin/Juan_Nambo
    
    const deletedSession = result.rows[0];
    
    // Emitir evento de eliminación al grupo y al tutor si existe
    emitToGroup(deletedSession.groupId, 'session_deleted', { sessionId: parseInt(id, 10) });
    if (deletedSession.tutorId) {
      emitToUser(deletedSession.tutorId, 'session_cancelled', { sessionId: parseInt(id, 10) });
    }
    
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
    sendSuccess(res, null, 'Sesión cancelada');
  } catch (error) {
    console.error('Error en deleteSession:', error);
    sendError(res, 'Error al cancelar sesión', 500);
  }
}

export async function startSession(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE sessions SET estado = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      ['en_curso', id]
    );
    if (result.rows.length === 0) {
      sendError(res, 'Sesión no encontrada', 404);
      return;
    }
    emitToGroup(result.rows[0].groupId, 'session_updated', result.rows[0]);
    sendSuccess(res, result.rows[0], 'Sesión iniciada');
  } catch (error) {
    console.error('Error en startSession:', error);
    sendError(res, 'Error al iniciar sesión', 500);
  }
}

export async function completeSession(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE sessions SET estado = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      ['completada', id]
    );
    if (result.rows.length === 0) {
      sendError(res, 'Sesión no encontrada', 404);
      return;
    }
    emitToGroup(result.rows[0].groupId, 'session_updated', result.rows[0]);
    sendSuccess(res, result.rows[0], 'Sesión completada');
  } catch (error) {
    console.error('Error en completeSession:', error);
    sendError(res, 'Error al completar sesión', 500);
  }
}

export async function getSessionsCalendar(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      sendError(res, 'Faltan parámetros: startDate y endDate (formato YYYY-MM-DD)', 400);
      return;
    }

    const result = await query(
      `SELECT * FROM sessions 
       WHERE fecha >= $1 AND fecha <= $2 
       ORDER BY fecha ASC, "horaInicio" ASC`,
      [startDate, endDate]
    );

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getSessionsCalendar:', error);
    sendError(res, 'Error al obtener calendario', 500);
  }
}


<<<<<<< HEAD
<<<<<<< HEAD
export async function requestSession(req: Request, res: Response): Promise<void> {
  try {
    const { groupId, fecha, horaInicio, horaFin, tema, materia, cupo } = req.body;

    // Crear sesión con estado 'pendiente'
    const result = await query(
      `INSERT INTO sessions ("groupId", "tutorId", fecha, "horaInicio", "horaFin", tema, materia, cupo, estado)
       VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, 'pendiente')
       RETURNING *`,
      [groupId, fecha, horaInicio, horaFin, tema || null, materia || null, cupo || null]
    );

    // Notificar a admins y profesores (esto requeriría lógica adicional de socket, por ahora solo al grupo)
    emitToGroup(groupId, 'session_requested', result.rows[0]);

    sendSuccess(res, result.rows[0], 'Solicitud enviada exitosamente', 201);
  } catch (error) {
    console.error('Error en requestSession:', error);
    sendError(res, 'Error al solicitar sesión', 500);
  }
}

export async function updateSessionStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { estado, tutorId } = req.body; // 'programada' (aprobar) o 'rechazada'

    if (!['programada', 'rechazada'].includes(estado)) {
      sendError(res, 'Estado inválido', 400);
      return;
    }

    let result;
    if (estado === 'programada') {
      // Aprobar: asignar tutor (si se envía) y cambiar estado
      result = await query(
        `UPDATE sessions 
         SET estado = $1, "tutorId" = COALESCE($2, "tutorId"), "updatedAt" = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING *`,
        [estado, tutorId || null, id]
      );
    } else {
      // Rechazar
      result = await query(
        `UPDATE sessions 
         SET estado = $1, "updatedAt" = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
        [estado, id]
      );
    }

    if (result.rows.length === 0) {
      sendError(res, 'Sesión no encontrada', 404);
      return;
    }

    emitToGroup(result.rows[0].groupId, 'session_status_updated', result.rows[0]);
    sendSuccess(res, result.rows[0], `Solicitud ${estado === 'programada' ? 'aprobada' : 'rechazada'}`);
  } catch (error) {
    console.error('Error en updateSessionStatus:', error);
    sendError(res, 'Error al actualizar estado de la solicitud', 500);
  }
}
=======
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
