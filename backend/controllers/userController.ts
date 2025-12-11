import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { NotFoundError, AuthorizationError } from '../middleware/errorHandler';
import { query } from '../config/database';

/**
 * Listar usuarios (Admin, Profesor)
 */
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Implementar paginación y filtros
    const result = await query(
      'SELECT id, email, nombre, role, grado, "createdAt" FROM users ORDER BY "createdAt" DESC'
    );

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getUsers:', error);
    sendError(res, 'Error al obtener usuarios', 500);
  }
}

/**
 * Obtener usuario por ID
 */
export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, email, nombre, role, grado, "createdAt", "updatedAt" FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Usuario no encontrado', 404);
      return;
    }

    sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error('Error en getUserById:', error);
    sendError(res, 'Error al obtener usuario', 500);
  }
}

/**
 * Actualizar usuario
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { nombre, grado } = req.body;

    // Verificar permisos: solo puede actualizar su propio perfil o ser Admin
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    if (req.user.role !== 'Admin' && req.user.userId !== parseInt(id, 10)) {
      sendError(res, 'No tiene permisos para actualizar este usuario', 403);
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${paramCount++}`);
      values.push(nombre);
    }

    if (grado !== undefined) {
      updates.push(`grado = $${paramCount++}`);
      values.push(grado);
    }

    if (updates.length === 0) {
      sendError(res, 'No hay campos para actualizar', 400);
      return;
    }

    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, email, nombre, role, grado, "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      sendError(res, 'Usuario no encontrado', 404);
      return;
    }

    sendSuccess(res, result.rows[0], 'Usuario actualizado exitosamente');
  } catch (error) {
    console.error('Error en updateUser:', error);
    sendError(res, 'Error al actualizar usuario', 500);
  }
}

/**
 * Eliminar usuario (solo Admin)
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [
      id
    ]);

    if (result.rows.length === 0) {
      sendError(res, 'Usuario no encontrado', 404);
      return;
    }

    sendSuccess(res, null, 'Usuario eliminado exitosamente');
  } catch (error) {
    console.error('Error en deleteUser:', error);
    sendError(res, 'Error al eliminar usuario', 500);
  }
}

/**
 * Obtener perfil completo de usuario
 */
export async function getUserProfile(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    // Obtener usuario
    const userResult = await query(
      'SELECT id, email, nombre, role, grado, "createdAt", "updatedAt" FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      sendError(res, 'Usuario no encontrado', 404);
      return;
    }

    const user = userResult.rows[0];
    const profile: any = { ...user };

    // Si es tutor, obtener información adicional
    if (user.role === 'Tutor') {
      const tutorResult = await query(
        'SELECT id, "ratingPromedio", "totalSesiones", "totalEvaluaciones" FROM tutors WHERE "userId" = $1',
        [id]
      );

      if (tutorResult.rows.length > 0) {
        profile.tutorInfo = tutorResult.rows[0];

        // Obtener materias
        const subjectsResult = await query(
          'SELECT id, materia, nivel FROM tutor_subjects WHERE "tutorId" = $1',
          [tutorResult.rows[0].id]
        );
        profile.tutorInfo.subjects = subjectsResult.rows;

        // Obtener badges
        const badgesResult = await query(
          `SELECT b.id, b.nombre, b.descripcion, b.icono, ub."earnedAt"
           FROM user_badges ub
           JOIN badges b ON ub."badgeId" = b.id
           WHERE ub."userId" = $1`,
          [id]
        );
        profile.badges = badgesResult.rows;
      }
    }

    sendSuccess(res, profile);
  } catch (error) {
    console.error('Error en getUserProfile:', error);
    sendError(res, 'Error al obtener perfil', 500);
  }
}

<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
