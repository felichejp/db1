import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';
import { emitToGroup, emitToUser } from '../config/socket';

export async function getSessions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    let result;
    if (req.user.role === 'Admin') {
      result = await query(`
        SELECT s.*, u.nombre as "nombreTutor" 
        FROM sessions s
        LEFT JOIN tutors t ON s."tutorId" = t.id
        LEFT JOIN users u ON t."userId" = u.id
        ORDER BY s.fecha DESC, s."horaInicio" DESC
      `);
    } else if (req.user.role === 'Tutor') {
      const tutorResult = await query('SELECT id FROM tutors WHERE "userId" = $1', [req.user.userId]);
      if (tutorResult.rows.length > 0) {
        result = await query(
          `SELECT s.*, u.nombre as "nombreTutor"
           FROM sessions s
           LEFT JOIN tutors t ON s."tutorId" = t.id
           LEFT JOIN users u ON t."userId" = u.id
           WHERE s."tutorId" = $1 
           ORDER BY s.fecha DESC, s."horaInicio" DESC`,
          [tutorResult.rows[0].id]
        );
      } else {
        result = { rows: [] };
      }
    } else {
      result = await query(
        `SELECT s.*, u.nombre as "nombreTutor"
         FROM sessions s
         JOIN group_members gm ON s."groupId" = gm."groupId"
         LEFT JOIN tutors t ON s."tutorId" = t.id
         LEFT JOIN users u ON t."userId" = u.id
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
