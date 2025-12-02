import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';
import { matchTutorToGroup } from '../utils/matching';

export async function getTutors(req: Request, res: Response): Promise<void> {
  try {
    // Primero, asegurarse de que todos los usuarios con rol Tutor tengan registro en tutors
    await query(
      `INSERT INTO tutors ("userId")
       SELECT u.id
       FROM users u
       WHERE u.role = 'Tutor'
       AND NOT EXISTS (
         SELECT 1 FROM tutors t WHERE t."userId" = u.id
       )
       ON CONFLICT DO NOTHING`
    );

    // Ahora obtener todos los tutores
    const result = await query(
      `SELECT t.*, u.email, u.nombre, u.grado, u.id as "userId"
       FROM tutors t
       JOIN users u ON t."userId" = u.id
       ORDER BY t."ratingPromedio" DESC`
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getTutors:', error);
    sendError(res, 'Error al obtener tutores', 500);
  }
}

export async function getTutorById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT t.*, u.email, u.nombre, u.grado
       FROM tutors t
       JOIN users u ON t."userId" = u.id
       WHERE t.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      sendError(res, 'Tutor no encontrado', 404);
      return;
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error('Error en getTutorById:', error);
    sendError(res, 'Error al obtener tutor', 500);
  }
}

export async function getTutorProfile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const tutorResult = await query(
      `SELECT t.*, u.email, u.nombre, u.grado
       FROM tutors t
       JOIN users u ON t."userId" = u.id
       WHERE t.id = $1`,
      [id]
    );
    if (tutorResult.rows.length === 0) {
      sendError(res, 'Tutor no encontrado', 404);
      return;
    }
    const tutor = tutorResult.rows[0];
    const subjectsResult = await query(
      'SELECT * FROM tutor_subjects WHERE "tutorId" = $1',
      [id]
    );
    const availabilityResult = await query(
      'SELECT * FROM tutor_availability WHERE "tutorId" = $1 AND activo = true',
      [id]
    );
    sendSuccess(res, {
      ...tutor,
      subjects: subjectsResult.rows,
      availability: availabilityResult.rows
    });
  } catch (error) {
    console.error('Error en getTutorProfile:', error);
    sendError(res, 'Error al obtener perfil del tutor', 500);
  }
}

export async function getTutorAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM tutor_availability WHERE "tutorId" = $1 AND activo = true',
      [id]
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getTutorAvailability:', error);
    sendError(res, 'Error al obtener disponibilidad', 500);
  }
}

export async function createTutorAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { diaSemana, horaInicio, horaFin } = req.body;

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    // Verificar que el tutor sea el usuario autenticado
    const tutorResult = await query('SELECT "userId" FROM tutors WHERE id = $1', [id]);
    if (tutorResult.rows.length === 0) {
      sendError(res, 'Tutor no encontrado', 404);
      return;
    }
    if (tutorResult.rows[0].userId !== req.user.userId) {
      sendError(res, 'No tiene permisos para modificar esta disponibilidad', 403);
      return;
    }

    const result = await query(
      `INSERT INTO tutor_availability ("tutorId", "diaSemana", "horaInicio", "horaFin")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, diaSemana, horaInicio, horaFin]
    );
    sendSuccess(res, result.rows[0], 'Disponibilidad creada', 201);
  } catch (error) {
    console.error('Error en createTutorAvailability:', error);
    sendError(res, 'Error al crear disponibilidad', 500);
  }
}

export async function deleteTutorAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { id, availabilityId } = req.params;

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const tutorResult = await query('SELECT "userId" FROM tutors WHERE id = $1', [id]);
    if (tutorResult.rows.length === 0 || tutorResult.rows[0].userId !== req.user.userId) {
      sendError(res, 'No tiene permisos', 403);
      return;
    }

    await query('DELETE FROM tutor_availability WHERE id = $1', [availabilityId]);
    sendSuccess(res, null, 'Disponibilidad eliminada');
  } catch (error) {
    console.error('Error en deleteTutorAvailability:', error);
    sendError(res, 'Error al eliminar disponibilidad', 500);
  }
}

export async function getTutorSubjects(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM tutor_subjects WHERE "tutorId" = $1',
      [id]
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getTutorSubjects:', error);
    sendError(res, 'Error al obtener materias', 500);
  }
}

export async function addTutorSubject(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { materia, nivel } = req.body;

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const tutorResult = await query('SELECT "userId" FROM tutors WHERE id = $1', [id]);
    if (tutorResult.rows.length === 0 || tutorResult.rows[0].userId !== req.user.userId) {
      sendError(res, 'No tiene permisos', 403);
      return;
    }

    const result = await query(
      `INSERT INTO tutor_subjects ("tutorId", materia, nivel)
       VALUES ($1, $2, $3)
       ON CONFLICT ("tutorId", materia) DO NOTHING
       RETURNING *`,
      [id, materia, nivel || null]
    );

    if (result.rows.length === 0) {
      sendError(res, 'La materia ya está registrada', 400);
      return;
    }

    sendSuccess(res, result.rows[0], 'Materia agregada', 201);
  } catch (error) {
    console.error('Error en addTutorSubject:', error);
    sendError(res, 'Error al agregar materia', 500);
  }
}

export async function deleteTutorSubject(req: Request, res: Response): Promise<void> {
  try {
    const { id, subjectId } = req.params;

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const tutorResult = await query('SELECT "userId" FROM tutors WHERE id = $1', [id]);
    if (tutorResult.rows.length === 0 || tutorResult.rows[0].userId !== req.user.userId) {
      sendError(res, 'No tiene permisos', 403);
      return;
    }

    await query('DELETE FROM tutor_subjects WHERE id = $1', [subjectId]);
    sendSuccess(res, null, 'Materia eliminada');
  } catch (error) {
    console.error('Error en deleteTutorSubject:', error);
    sendError(res, 'Error al eliminar materia', 500);
  }
}

export async function getTutorMatching(req: Request, res: Response): Promise<void> {
  try {
    const { groupId, materia, fecha, horaInicio, horaFin } = req.query;

    if (!groupId || !materia || !fecha || !horaInicio || !horaFin) {
      sendError(res, 'Faltan parámetros requeridos: groupId, materia, fecha, horaInicio, horaFin', 400);
      return;
    }

    const matches = await matchTutorToGroup(
      parseInt(groupId as string, 10),
      materia as string,
      fecha as string,
      horaInicio as string,
      horaFin as string
    );

    sendSuccess(res, matches);
  } catch (error) {
    console.error('Error en getTutorMatching:', error);
    sendError(res, 'Error al buscar tutores', 500);
  }
}

