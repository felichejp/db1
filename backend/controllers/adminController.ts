import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const [users, groups, sessions, tutors, estudiantes, profesores] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM groups'),
      query('SELECT COUNT(*) as count FROM sessions'),
      query('SELECT COUNT(*) as count FROM tutors'),
      query("SELECT COUNT(*) as count FROM users WHERE role = 'Estudiante'"),
      query("SELECT COUNT(*) as count FROM users WHERE role = 'Profesor'")
    ]);

    const activeSessions = await query(
      "SELECT COUNT(*) as count FROM sessions WHERE estado IN ('programada', 'en_curso')"
    );

    // Obtener materia más popular
    const topSubject = await query(
      `SELECT ts.materia, COUNT(*) as count
       FROM tutor_subjects ts
       GROUP BY ts.materia
       ORDER BY count DESC
       LIMIT 1`
    );

    // Obtener grupo con más estudiantes
    const topGroup = await query(
      `SELECT g.nombre, COUNT(gm."userId") as count
       FROM groups g
       LEFT JOIN group_members gm ON g.id = gm."groupId"
       GROUP BY g.id, g.nombre
       ORDER BY count DESC
       LIMIT 1`
    );

    sendSuccess(res, {
      users: parseInt(users.rows[0].count, 10),
      groups: parseInt(groups.rows[0].count, 10),
      sessions: parseInt(sessions.rows[0].count, 10),
      tutors: parseInt(tutors.rows[0].count, 10),
      estudiantes: parseInt(estudiantes.rows[0].count, 10),
      profesores: parseInt(profesores.rows[0].count, 10),
      activeSessions: parseInt(activeSessions.rows[0].count, 10),
      topSubject: topSubject.rows[0] || null,
      topGroup: topGroup.rows[0] || null
    });
  } catch (error) {
    console.error('Error en getStats:', error);
    sendError(res, 'Error al obtener estadísticas', 500);
  }
}

export async function getAdminUsers(req: Request, res: Response): Promise<void> {
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

export async function getAdminGroups(req: Request, res: Response): Promise<void> {
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

export async function getAdminReports(req: Request, res: Response): Promise<void> {
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

export async function getBadges(req: Request, res: Response): Promise<void> {
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

