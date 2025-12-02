import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';

export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const [users, groups, sessions, tutors] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM groups'),
      query('SELECT COUNT(*) as count FROM sessions'),
      query('SELECT COUNT(*) as count FROM tutors')
    ]);

    const activeSessions = await query(
      "SELECT COUNT(*) as count FROM sessions WHERE estado IN ('programada', 'en_curso')"
    );

    sendSuccess(res, {
      users: parseInt(users.rows[0].count, 10),
      groups: parseInt(groups.rows[0].count, 10),
      sessions: parseInt(sessions.rows[0].count, 10),
      tutors: parseInt(tutors.rows[0].count, 10),
      activeSessions: parseInt(activeSessions.rows[0].count, 10)
    });
  } catch (error) {
    console.error('Error en getStats:', error);
    sendError(res, 'Error al obtener estadísticas', 500);
  }
}

export async function getAdminUsers(_req: Request, res: Response): Promise<void> {
  try {
    const result = await query(
      'SELECT id, email, nombre, role, grado, "createdAt" FROM users ORDER BY "createdAt" DESC'
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getAdminUsers:', error);
    sendError(res, 'Error al obtener usuarios', 500);
  }
}

export async function getAdminGroups(_req: Request, res: Response): Promise<void> {
  try {
    const result = await query(
      `SELECT g.*, u.nombre as "profesorName"
       FROM groups g
       LEFT JOIN users u ON g."profesorId" = u.id
       ORDER BY g."createdAt" DESC`
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getAdminGroups:', error);
    sendError(res, 'Error al obtener grupos', 500);
  }
}

export async function getAdminReports(_req: Request, res: Response): Promise<void> {
  try {
    // Reportes básicos
    const topTutors = await query(
      `SELECT t.*, u.nombre, u.email
       FROM tutors t
       JOIN users u ON t."userId" = u.id
       ORDER BY t."ratingPromedio" DESC
       LIMIT 10`
    );

    const sessionsByMonth = await query(
      `SELECT DATE_TRUNC('month', fecha) as month, COUNT(*) as count
       FROM sessions
       WHERE estado = 'completada'
       GROUP BY month
       ORDER BY month DESC
       LIMIT 12`
    );

    sendSuccess(res, {
      topTutors: topTutors.rows,
      sessionsByMonth: sessionsByMonth.rows
    });
  } catch (error) {
    console.error('Error en getAdminReports:', error);
    sendError(res, 'Error al obtener reportes', 500);
  }
}

export async function getBadges(_req: Request, res: Response): Promise<void> {
  try {
    const result = await query('SELECT * FROM badges ORDER BY "createdAt" DESC');
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getBadges:', error);
    sendError(res, 'Error al obtener badges', 500);
  }
}

export async function createBadge(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, descripcion, icono, criterio } = req.body;

    const result = await query(
      `INSERT INTO badges (nombre, descripcion, icono, criterio)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nombre, descripcion || null, icono || null, criterio || null]
    );

    sendSuccess(res, result.rows[0], 'Badge creado', 201);
  } catch (error) {
    console.error('Error en createBadge:', error);
    sendError(res, 'Error al crear badge', 500);
  }
}

export async function assignBadge(req: Request, res: Response): Promise<void> {
  try {
    const { badgeId, userId } = req.params;

    const result = await query(
      `INSERT INTO user_badges ("userId", "badgeId")
       VALUES ($1, $2)
       ON CONFLICT ("userId", "badgeId") DO NOTHING
       RETURNING *`,
      [userId, badgeId]
    );

    if (result.rows.length === 0) {
      sendError(res, 'El usuario ya tiene este badge', 400);
      return;
    }

    sendSuccess(res, result.rows[0], 'Badge asignado', 201);
  } catch (error) {
    console.error('Error en assignBadge:', error);
    sendError(res, 'Error al asignar badge', 500);
  }
}

/**
 * Asignar profesor responsable a un grupo
 */
export async function assignProfesorToGroup(req: Request, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const { profesorId } = req.body;

    if (!profesorId) {
      sendError(res, 'profesorId es requerido', 400);
      return;
    }

    // Verificar que el usuario sea un profesor
    const userResult = await query('SELECT role FROM users WHERE id = $1', [profesorId]);
    if (userResult.rows.length === 0) {
      sendError(res, 'Usuario no encontrado', 404);
      return;
    }
    if (userResult.rows[0].role !== 'Profesor') {
      sendError(res, 'El usuario debe ser un Profesor', 400);
      return;
    }

    // Validar límite de grupos por profesor (máximo 6)
    const countResult = await query(
      'SELECT COUNT(*) as count FROM groups WHERE "profesorId" = $1',
      [profesorId]
    );
    const groupCount = parseInt(countResult.rows[0].count, 10);
    
    // Verificar si el grupo ya tiene este profesor asignado
    const currentGroupResult = await query('SELECT "profesorId" FROM groups WHERE id = $1', [groupId]);
    if (currentGroupResult.rows.length === 0) {
      sendError(res, 'Grupo no encontrado', 404);
      return;
    }
    const currentProfesorId = currentGroupResult.rows[0].profesorId;
    const isSameProfesor = currentProfesorId === profesorId;
    
    if (!isSameProfesor && groupCount >= 6) {
      sendError(res, 'El profesor ya tiene el máximo de grupos asignados (6)', 400);
      return;
    }

    const result = await query(
      `UPDATE groups SET "profesorId" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [profesorId, groupId]
    );

    sendSuccess(res, result.rows[0], 'Profesor asignado exitosamente');
  } catch (error) {
    console.error('Error en assignProfesorToGroup:', error);
    sendError(res, 'Error al asignar profesor', 500);
  }
}

/**
 * Asignar tutor a un grupo (creando una sesión inicial)
 */
export async function assignTutorToGroup(req: Request, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const { tutorId } = req.body;

    if (!tutorId) {
      sendError(res, 'tutorId es requerido', 400);
      return;
    }

    // Verificar que el tutor existe (tutorId es el ID de la tabla tutors)
    const tutorResult = await query(
      `SELECT t.id, t."userId", u.role 
       FROM tutors t 
       JOIN users u ON t."userId" = u.id 
       WHERE t.id = $1`,
      [tutorId]
    );
    if (tutorResult.rows.length === 0) {
      sendError(res, 'Tutor no encontrado', 404);
      return;
    }

    // Validar límite de grupos únicos por tutor (máximo 3)
    const countResult = await query(
      `SELECT COUNT(DISTINCT "groupId") as count 
       FROM sessions 
       WHERE "tutorId" = $1 AND estado != 'cancelada'`,
      [tutorId]
    );
    const uniqueGroupCount = parseInt(countResult.rows[0].count, 10);
    
    // Verificar si el grupo ya está asignado a este tutor
    const existingGroupResult = await query(
      `SELECT COUNT(*) as count 
       FROM sessions 
       WHERE "tutorId" = $1 AND "groupId" = $2 AND estado != 'cancelada'`,
      [tutorId, groupId]
    );
    const isExistingGroup = parseInt(existingGroupResult.rows[0].count, 10) > 0;
    
    if (!isExistingGroup && uniqueGroupCount >= 3) {
      sendError(res, 'El tutor ya tiene el máximo de grupos asignados (3)', 400);
      return;
    }

    // Verificar que el grupo existe
    const groupResult = await query('SELECT id FROM groups WHERE id = $1', [groupId]);
    if (groupResult.rows.length === 0) {
      sendError(res, 'Grupo no encontrado', 404);
      return;
    }

    // Si el tutor ya tiene una sesión con este grupo, no crear otra
    if (isExistingGroup) {
      sendError(res, 'El tutor ya está asignado a este grupo', 400);
      return;
    }

    // Crear una sesión inicial para asignar el tutor al grupo
    const result = await query(
      `INSERT INTO sessions ("groupId", "tutorId", fecha, "horaInicio", "horaFin", estado, tema)
       VALUES ($1, $2, CURRENT_DATE, '00:00:00', '00:00:00', 'programada', 'Asignación inicial')
       RETURNING *`,
      [groupId, tutorId]
    );

    sendSuccess(res, result.rows[0], 'Tutor asignado exitosamente', 201);
  } catch (error) {
    console.error('Error en assignTutorToGroup:', error);
    sendError(res, 'Error al asignar tutor', 500);
  }
}

/**
 * Asignar alumno a un grupo
 */
export async function assignAlumnoToGroup(req: Request, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      sendError(res, 'userId es requerido', 400);
      return;
    }

    // Verificar que el usuario sea un estudiante
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      sendError(res, 'Usuario no encontrado', 404);
      return;
    }
    if (userResult.rows[0].role !== 'Estudiante') {
      sendError(res, 'El usuario debe ser un Estudiante', 400);
      return;
    }

    // Verificar que el grupo no tenga más de 5 miembros
    const countResult = await query(
      'SELECT COUNT(*) as count FROM group_members WHERE "groupId" = $1',
      [groupId]
    );
    if (parseInt(countResult.rows[0].count, 10) >= 5) {
      sendError(res, 'El grupo ya tiene el máximo de miembros (5)', 400);
      return;
    }

    // Verificar que el grupo existe
    const groupResult = await query('SELECT id FROM groups WHERE id = $1', [groupId]);
    if (groupResult.rows.length === 0) {
      sendError(res, 'Grupo no encontrado', 404);
      return;
    }

    const result = await query(
      `INSERT INTO group_members ("groupId", "userId")
       VALUES ($1, $2)
       ON CONFLICT ("groupId", "userId") DO NOTHING
       RETURNING *`,
      [groupId, userId]
    );

    if (result.rows.length === 0) {
      sendError(res, 'El alumno ya es miembro del grupo', 400);
      return;
    }

    sendSuccess(res, result.rows[0], 'Alumno asignado exitosamente', 201);
  } catch (error) {
    console.error('Error en assignAlumnoToGroup:', error);
    sendError(res, 'Error al asignar alumno', 500);
  }
}


