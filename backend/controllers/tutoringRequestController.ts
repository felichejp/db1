import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';
import { emitToGroup, emitToUser } from '../config/socket';
import { createAndEmitNotificationsForUsers } from '../utils/notifications';

/**
 * Crear solicitud de asesoría (Estudiante)
 */
export async function createTutoringRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Estudiante') {
      sendError(res, 'Solo estudiantes pueden crear solicitudes de asesoría', 403);
      return;
    }

    const { groupId, tema, fechaPropuesta, horaInicioPropuesta, horaFinPropuesta, tutorId } = req.body;

    // Verificar que el estudiante pertenece al grupo
    const memberCheck = await query(
      'SELECT * FROM group_members WHERE "groupId" = $1 AND "userId" = $2',
      [groupId, req.user.userId]
    );

    if (memberCheck.rows.length === 0) {
      sendError(res, 'No perteneces a este grupo', 403);
      return;
    }

    // Si no hay tabla tutoring_requests, crear la sesión directamente
    try {
      const result = await query(
        `INSERT INTO tutoring_requests ("groupId", "studentId", "tutorId", tema, "fechaPropuesta", "horaInicioPropuesta", "horaFinPropuesta")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [groupId, req.user.userId, tutorId || null, tema, fechaPropuesta, horaInicioPropuesta, horaFinPropuesta]
      );

      // Notificar al tutor si existe
      if (tutorId) {
        const tutorUserResult = await query('SELECT "userId" FROM tutors WHERE id = $1', [tutorId]);
        if (tutorUserResult.rows.length > 0) {
          await createAndEmitNotificationsForUsers(
            [tutorUserResult.rows[0].userId],
            'solicitud_asesoria',
            'Nueva solicitud de asesoría',
            `Solicitud de asesoría para el tema: ${tema}`,
            result.rows[0].id,
            'tutoring_request'
          );
        }
      }

      sendSuccess(res, result.rows[0], 'Solicitud creada exitosamente', 201);
    } catch (error: any) {
      // Si la tabla no existe, crear sesión directamente
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        // Crear sesión directamente como alternativa
        const sessionResult = await query(
          `INSERT INTO sessions ("groupId", "tutorId", fecha, "horaInicio", "horaFin", tema, estado)
           VALUES ($1, $2, $3, $4, $5, $6, 'programada')
           RETURNING *`,
          [groupId, tutorId || null, fechaPropuesta, horaInicioPropuesta, horaFinPropuesta, tema]
        );

        sendSuccess(res, { ...sessionResult.rows[0], tipo: 'session' }, 'Solicitud procesada (sesión creada)', 201);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en createTutoringRequest:', error);
    sendError(res, 'Error al crear solicitud de asesoría', 500);
  }
}

/**
 * Obtener solicitudes de asesoría (Tutor)
 */
export async function getTutoringRequests(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Tutor') {
      sendError(res, 'Solo tutores pueden ver solicitudes', 403);
      return;
    }

    const tutorResult = await query('SELECT id FROM tutors WHERE "userId" = $1', [req.user.userId]);
    if (tutorResult.rows.length === 0) {
      sendSuccess(res, []);
      return;
    }

    const tutorId = tutorResult.rows[0].id;

    try {
      const result = await query(
        `SELECT tr.*, u.nombre as "studentName", u.email as "studentEmail", g.nombre as "groupName"
         FROM tutoring_requests tr
         JOIN users u ON tr."studentId" = u.id
         JOIN groups g ON tr."groupId" = g.id
         WHERE tr."tutorId" = $1 AND tr.estado = 'pendiente'
         ORDER BY tr."createdAt" DESC`,
        [tutorId]
      );

      sendSuccess(res, result.rows);
    } catch (error: any) {
      // Si la tabla no existe, devolver array vacío
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        sendSuccess(res, []);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en getTutoringRequests:', error);
    sendError(res, 'Error al obtener solicitudes', 500);
  }
}

/**
 * Aceptar solicitud de asesoría (Tutor)
 */
export async function acceptTutoringRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Tutor') {
      sendError(res, 'Solo tutores pueden aceptar solicitudes', 403);
      return;
    }

    const { id } = req.params;

    try {
      const requestResult = await query('SELECT * FROM tutoring_requests WHERE id = $1', [id]);
      if (requestResult.rows.length === 0) {
        sendError(res, 'Solicitud no encontrada', 404);
        return;
      }

      const request = requestResult.rows[0];

      // Verificar que el tutor es el correcto
      const tutorResult = await query('SELECT id FROM tutors WHERE "userId" = $1', [req.user.userId]);
      if (tutorResult.rows.length === 0 || tutorResult.rows[0].id !== request.tutorId) {
        sendError(res, 'No tienes permisos para aceptar esta solicitud', 403);
        return;
      }

      // Actualizar estado
      await query(
        'UPDATE tutoring_requests SET estado = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
        ['aceptada', id]
      );

      // Crear sesión
      const sessionResult = await query(
        `INSERT INTO sessions ("groupId", "tutorId", fecha, "horaInicio", "horaFin", tema, estado)
         VALUES ($1, $2, $3, $4, $5, $6, 'programada')
         RETURNING *`,
        [request.groupId, request.tutorId, request.fechaPropuesta, request.horaInicioPropuesta, request.horaFinPropuesta, request.tema]
      );

      const session = sessionResult.rows[0];

      // Notificar al grupo y profesor
      const groupResult = await query('SELECT "profesorId" FROM groups WHERE id = $1', [request.groupId]);
      const profesorId = groupResult.rows[0]?.profesorId;

      const membersResult = await query(
        'SELECT "userId" FROM group_members WHERE "groupId" = $1',
        [request.groupId]
      );
      const memberIds = membersResult.rows.map(row => row.userId);

      if (memberIds.length > 0) {
        await createAndEmitNotificationsForUsers(
          memberIds,
          'asesoria_aceptada',
          'Asesoría aceptada',
          `Asesoría aceptada: ${request.tema} - ${request.fechaPropuesta} ${request.horaInicioPropuesta}`,
          session.id,
          'session'
        );
      }

      if (profesorId) {
        await createAndEmitNotificationsForUsers(
          [profesorId],
          'asesoria_aceptada',
          'Asesoría aceptada',
          `El tutor ha aceptado una asesoría para el grupo: ${request.tema}`,
          session.id,
          'session'
        );
      }

      sendSuccess(res, { request: requestResult.rows[0], session }, 'Solicitud aceptada y sesión creada');
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        sendError(res, 'Funcionalidad no disponible: tabla de solicitudes no existe', 501);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en acceptTutoringRequest:', error);
    sendError(res, 'Error al aceptar solicitud', 500);
  }
}

/**
 * Rechazar solicitud de asesoría (Tutor)
 */
export async function rejectTutoringRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Tutor') {
      sendError(res, 'Solo tutores pueden rechazar solicitudes', 403);
      return;
    }

    const { id } = req.params;
    const { motivoRechazo } = req.body;

    try {
      const requestResult = await query('SELECT * FROM tutoring_requests WHERE id = $1', [id]);
      if (requestResult.rows.length === 0) {
        sendError(res, 'Solicitud no encontrada', 404);
        return;
      }

      const request = requestResult.rows[0];

      // Verificar que el tutor es el correcto
      const tutorResult = await query('SELECT id FROM tutors WHERE "userId" = $1', [req.user.userId]);
      if (tutorResult.rows.length === 0 || tutorResult.rows[0].id !== request.tutorId) {
        sendError(res, 'No tienes permisos para rechazar esta solicitud', 403);
        return;
      }

      await query(
        'UPDATE tutoring_requests SET estado = $1, "motivoRechazo" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3',
        ['rechazada', motivoRechazo || null, id]
      );

      sendSuccess(res, requestResult.rows[0], 'Solicitud rechazada');
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        sendError(res, 'Funcionalidad no disponible: tabla de solicitudes no existe', 501);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en rejectTutoringRequest:', error);
    sendError(res, 'Error al rechazar solicitud', 500);
  }
}

/**
 * Obtener grupos disponibles (Estudiante - grupos donde no está registrado)
 */
export async function getAvailableGroups(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Estudiante') {
      sendError(res, 'Solo estudiantes pueden ver grupos disponibles', 403);
      return;
    }

    // Obtener grupos donde el estudiante NO es miembro
    const result = await query(
      `SELECT DISTINCT g.*, 
              u.nombre as "profesorNombre",
              COUNT(DISTINCT gm."userId") as "numIntegrantes",
              (SELECT COUNT(*) FROM group_members WHERE "groupId" = g.id) as "cupoActual"
       FROM groups g
       LEFT JOIN users u ON g."profesorId" = u.id
       LEFT JOIN group_members gm ON g.id = gm."groupId"
       WHERE g.id NOT IN (
         SELECT "groupId" FROM group_members WHERE "userId" = $1
       )
       AND g.estado = 'activo'
       GROUP BY g.id, u.nombre
       ORDER BY g."createdAt" DESC`,
      [req.user.userId]
    );

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getAvailableGroups:', error);
    sendError(res, 'Error al obtener grupos disponibles', 500);
  }
}

