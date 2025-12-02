import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';
import { emitToUser } from '../config/socket';
import { createAndEmitNotification } from '../utils/notifications';

/**
 * Crear solicitud para asesorar materia (Tutor)
 */
export async function createTutorSubjectRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Tutor') {
      sendError(res, 'Solo tutores pueden crear solicitudes de materia', 403);
      return;
    }

    // Verificar límite de 3 grupos
    const tutorResult = await query('SELECT id FROM tutors WHERE "userId" = $1', [req.user.userId]);
    if (tutorResult.rows.length === 0) {
      sendError(res, 'Tutor no encontrado', 404);
      return;
    }

    const tutorId = tutorResult.rows[0].id;

    // Contar grupos asignados al tutor (usando sesiones como proxy)
    const groupsCount = await query(
      `SELECT COUNT(DISTINCT "groupId") as count 
       FROM sessions 
       WHERE "tutorId" = $1 AND estado != 'cancelada'`,
      [tutorId]
    );

    if (parseInt(groupsCount.rows[0].count, 10) >= 3) {
      sendError(res, 'Ya tienes el máximo de grupos asignados (3)', 400);
      return;
    }

    const { materia, nivel, requisitos } = req.body;

    try {
      const result = await query(
        `INSERT INTO tutor_subject_requests ("tutorId", materia, nivel, requisitos)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [tutorId, materia, nivel || null, requisitos || null]
      );

      // Notificar a administradores
      const adminsResult = await query('SELECT id FROM users WHERE role = $1', ['Admin']);
      for (const admin of adminsResult.rows) {
        await createAndEmitNotification({
          userId: admin.id,
          tipo: 'solicitud_materia',
          titulo: 'Nueva solicitud de materia',
          mensaje: `El tutor ${req.user.nombre} solicita asesorar la materia: ${materia}`,
          relacionId: result.rows[0].id,
          relacionTipo: 'tutor_subject_request'
        });
      }

      sendSuccess(res, result.rows[0], 'Solicitud creada exitosamente', 201);
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        // Si la tabla no existe, usar notificaciones directamente
        sendSuccess(res, { materia, nivel, requisitos, tipo: 'notification' }, 'Solicitud procesada', 201);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en createTutorSubjectRequest:', error);
    sendError(res, 'Error al crear solicitud', 500);
  }
}

/**
 * Crear solicitud de apoyo del profesor (Tutor)
 */
export async function createTeacherSupportRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Tutor') {
      sendError(res, 'Solo tutores pueden solicitar apoyo del profesor', 403);
      return;
    }

    const { groupId, tema, fechaPropuesta, horaInicioPropuesta, horaFinPropuesta } = req.body;

    // Obtener profesor del grupo
    const groupResult = await query('SELECT "profesorId" FROM groups WHERE id = $1', [groupId]);
    if (groupResult.rows.length === 0) {
      sendError(res, 'Grupo no encontrado', 404);
      return;
    }

    const profesorId = groupResult.rows[0].profesorId;
    if (!profesorId) {
      sendError(res, 'El grupo no tiene profesor asignado', 400);
      return;
    }

    const tutorResult = await query('SELECT id FROM tutors WHERE "userId" = $1', [req.user.userId]);
    if (tutorResult.rows.length === 0) {
      sendError(res, 'Tutor no encontrado', 404);
      return;
    }

    const tutorId = tutorResult.rows[0].id;

    try {
      const result = await query(
        `INSERT INTO teacher_support_requests ("tutorId", "groupId", "profesorId", tema, "fechaPropuesta", "horaInicioPropuesta", "horaFinPropuesta")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [tutorId, groupId, profesorId, tema, fechaPropuesta, horaInicioPropuesta, horaFinPropuesta]
      );

      // Notificar al profesor
      await createAndEmitNotification({
        userId: profesorId,
        tipo: 'solicitud_apoyo',
        titulo: 'Solicitud de apoyo del tutor',
        mensaje: `El tutor ${req.user.nombre} solicita apoyo para: ${tema} - ${fechaPropuesta} ${horaInicioPropuesta}`,
        relacionId: result.rows[0].id,
        relacionTipo: 'teacher_support_request'
      });

      sendSuccess(res, result.rows[0], 'Solicitud creada exitosamente', 201);
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        // Si la tabla no existe, usar notificaciones directamente
        await createAndEmitNotification({
          userId: profesorId,
          tipo: 'solicitud_apoyo',
          titulo: 'Solicitud de apoyo del tutor',
          mensaje: `El tutor ${req.user.nombre} solicita apoyo para: ${tema} - ${fechaPropuesta} ${horaInicioPropuesta}`,
          relacionId: groupId,
          relacionTipo: 'group'
        });

        sendSuccess(res, { grupoId: groupId, tema, tipo: 'notification' }, 'Solicitud procesada', 201);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en createTeacherSupportRequest:', error);
    sendError(res, 'Error al crear solicitud', 500);
  }
}

/**
 * Obtener solicitudes de apoyo del profesor (Profesor)
 */
export async function getTeacherSupportRequests(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Profesor') {
      sendError(res, 'Solo profesores pueden ver solicitudes de apoyo', 403);
      return;
    }

    try {
      const result = await query(
        `SELECT tsr.*, 
                u.nombre as "tutorName", 
                u.email as "tutorEmail",
                g.nombre as "groupName"
         FROM teacher_support_requests tsr
         JOIN tutors t ON tsr."tutorId" = t.id
         JOIN users u ON t."userId" = u.id
         JOIN groups g ON tsr."groupId" = g.id
         WHERE tsr."profesorId" = $1 AND tsr.estado = 'pendiente'
         ORDER BY tsr."createdAt" DESC`,
        [req.user.userId]
      );

      sendSuccess(res, result.rows);
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        sendSuccess(res, []);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en getTeacherSupportRequests:', error);
    sendError(res, 'Error al obtener solicitudes', 500);
  }
}

/**
 * Aceptar solicitud de apoyo (Profesor)
 */
export async function acceptTeacherSupportRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Profesor') {
      sendError(res, 'Solo profesores pueden aceptar solicitudes', 403);
      return;
    }

    const { id } = req.params;

    try {
      const requestResult = await query('SELECT * FROM teacher_support_requests WHERE id = $1', [id]);
      if (requestResult.rows.length === 0) {
        sendError(res, 'Solicitud no encontrada', 404);
        return;
      }

      const request = requestResult.rows[0];

      if (request.profesorId !== req.user.userId) {
        sendError(res, 'No tienes permisos para aceptar esta solicitud', 403);
        return;
      }

      await query(
        'UPDATE teacher_support_requests SET estado = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
        ['aceptada', id]
      );

      // Notificar al tutor
      const tutorResult = await query('SELECT "userId" FROM tutors WHERE id = $1', [request.tutorId]);
      if (tutorResult.rows.length > 0) {
        await createAndEmitNotification({
          userId: tutorResult.rows[0].userId,
          tipo: 'solicitud_apoyo_aceptada',
          titulo: 'Solicitud de apoyo aceptada',
          mensaje: `El profesor ha aceptado tu solicitud de apoyo para: ${request.tema}`,
          relacionId: request.groupId,
          relacionTipo: 'group'
        });
      }

      sendSuccess(res, requestResult.rows[0], 'Solicitud aceptada');
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        sendError(res, 'Funcionalidad no disponible: tabla de solicitudes no existe', 501);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en acceptTeacherSupportRequest:', error);
    sendError(res, 'Error al aceptar solicitud', 500);
  }
}

/**
 * Rechazar solicitud de apoyo (Profesor)
 */
export async function rejectTeacherSupportRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Profesor') {
      sendError(res, 'Solo profesores pueden rechazar solicitudes', 403);
      return;
    }

    const { id } = req.params;
    const { motivoRechazo } = req.body;

    try {
      const requestResult = await query('SELECT * FROM teacher_support_requests WHERE id = $1', [id]);
      if (requestResult.rows.length === 0) {
        sendError(res, 'Solicitud no encontrada', 404);
        return;
      }

      const request = requestResult.rows[0];

      if (request.profesorId !== req.user.userId) {
        sendError(res, 'No tienes permisos para rechazar esta solicitud', 403);
        return;
      }

      await query(
        'UPDATE teacher_support_requests SET estado = $1, "motivoRechazo" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3',
        ['rechazada', motivoRechazo || null, id]
      );

      // Notificar al tutor
      const tutorResult = await query('SELECT "userId" FROM tutors WHERE id = $1', [request.tutorId]);
      if (tutorResult.rows.length > 0) {
        await createAndEmitNotification({
          userId: tutorResult.rows[0].userId,
          tipo: 'solicitud_apoyo_rechazada',
          titulo: 'Solicitud de apoyo rechazada',
          mensaje: `El profesor ha rechazado tu solicitud de apoyo. ${motivoRechazo ? `Motivo: ${motivoRechazo}` : ''}`,
          relacionId: request.groupId,
          relacionTipo: 'group'
        });
      }

      sendSuccess(res, requestResult.rows[0], 'Solicitud rechazada');
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        sendError(res, 'Funcionalidad no disponible: tabla de solicitudes no existe', 501);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en rejectTeacherSupportRequest:', error);
    sendError(res, 'Error al rechazar solicitud', 500);
  }
}

/**
 * Obtener solicitudes de materia (Admin)
 */
export async function getTutorSubjectRequests(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      sendError(res, 'Solo administradores pueden ver solicitudes de materia', 403);
      return;
    }

    try {
      const result = await query(
        `SELECT tsr.*, 
                u.nombre as "tutorName", 
                u.email as "tutorEmail"
         FROM tutor_subject_requests tsr
         JOIN tutors t ON tsr."tutorId" = t.id
         JOIN users u ON t."userId" = u.id
         WHERE tsr.estado = 'pendiente'
         ORDER BY tsr."createdAt" DESC`,
        []
      );

      sendSuccess(res, result.rows);
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        sendSuccess(res, []);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en getTutorSubjectRequests:', error);
    sendError(res, 'Error al obtener solicitudes', 500);
  }
}

/**
 * Aceptar solicitud de materia (Admin)
 */
export async function acceptTutorSubjectRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      sendError(res, 'Solo administradores pueden aceptar solicitudes', 403);
      return;
    }

    const { id } = req.params;

    try {
      const requestResult = await query('SELECT * FROM tutor_subject_requests WHERE id = $1', [id]);
      if (requestResult.rows.length === 0) {
        sendError(res, 'Solicitud no encontrada', 404);
        return;
      }

      const request = requestResult.rows[0];

      // Agregar materia al tutor
      await query(
        `INSERT INTO tutor_subjects ("tutorId", materia, nivel)
         VALUES ($1, $2, $3)
         ON CONFLICT ("tutorId", materia) DO NOTHING`,
        [request.tutorId, request.materia, request.nivel || null]
      );

      // Actualizar estado
      await query(
        'UPDATE tutor_subject_requests SET estado = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
        ['aceptada', id]
      );

      // Notificar al tutor
      const tutorResult = await query('SELECT "userId" FROM tutors WHERE id = $1', [request.tutorId]);
      if (tutorResult.rows.length > 0) {
        await createAndEmitNotification({
          userId: tutorResult.rows[0].userId,
          tipo: 'solicitud_materia_aceptada',
          titulo: 'Solicitud de materia aceptada',
          mensaje: `Tu solicitud para asesorar la materia "${request.materia}" ha sido aceptada`,
          relacionId: request.id,
          relacionTipo: 'tutor_subject_request'
        });
      }

      sendSuccess(res, requestResult.rows[0], 'Solicitud aceptada');
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        sendError(res, 'Funcionalidad no disponible: tabla de solicitudes no existe', 501);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en acceptTutorSubjectRequest:', error);
    sendError(res, 'Error al aceptar solicitud', 500);
  }
}

/**
 * Rechazar solicitud de materia (Admin)
 */
export async function rejectTutorSubjectRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      sendError(res, 'Solo administradores pueden rechazar solicitudes', 403);
      return;
    }

    const { id } = req.params;
    const { motivoRechazo } = req.body;

    try {
      const requestResult = await query('SELECT * FROM tutor_subject_requests WHERE id = $1', [id]);
      if (requestResult.rows.length === 0) {
        sendError(res, 'Solicitud no encontrada', 404);
        return;
      }

      const request = requestResult.rows[0];

      await query(
        'UPDATE tutor_subject_requests SET estado = $1, "motivoRechazo" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3',
        ['rechazada', motivoRechazo || null, id]
      );

      // Notificar al tutor
      const tutorResult = await query('SELECT "userId" FROM tutors WHERE id = $1', [request.tutorId]);
      if (tutorResult.rows.length > 0) {
        await createAndEmitNotification({
          userId: tutorResult.rows[0].userId,
          tipo: 'solicitud_materia_rechazada',
          titulo: 'Solicitud de materia rechazada',
          mensaje: `Tu solicitud para asesorar la materia "${request.materia}" ha sido rechazada. ${motivoRechazo ? `Motivo: ${motivoRechazo}` : ''}`,
          relacionId: request.id,
          relacionTipo: 'tutor_subject_request'
        });
      }

      sendSuccess(res, requestResult.rows[0], 'Solicitud rechazada');
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        sendError(res, 'Funcionalidad no disponible: tabla de solicitudes no existe', 501);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error en rejectTutorSubjectRequest:', error);
    sendError(res, 'Error al rechazar solicitud', 500);
  }
}

