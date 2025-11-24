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

/*
Nueva parte de codigo
*/
/*
import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { NotFoundError, AuthorizationError } from '../middleware/errorHandler';
import { query } from '../config/database';

/**
 * Listar usuarios (Admin, Profesor) con paginación y filtros
 */
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    // Obtener parámetros de paginación desde la URL
    // Ejemplo: /users?page=2&limit=20
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = (page - 1) * limit;

    // Obtiene los filtros enviados por query params
    // Ejemplo: /users?role=Tutor&nombre=Juan
    const { role, grado, nombre, email } = req.query;

    // Arrays donde se guardan todas las condiciones dinámicas
    const filters: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    // Filtro por rol (Admin, Profesor, Tutor, Estudiante)
    if (role) {
      filters.push(`role = $${paramCount++}`);
      values.push(role);
    }

    // Filtro por grado (solo si tu tabla tiene ese campo)
    if (grado) {
      filters.push(`grado = $${paramCount++}`);
      values.push(grado);
    }

    // Filtro por coincidencia parcial en el nombre
    if (nombre) {
      filters.push(`nombre ILIKE $${paramCount++}`);
      values.push(`%${nombre}%`);
    }

    // Filtro por coincidencia parcial en email
    if (email) {
      filters.push(`email ILIKE $${paramCount++}`);
      values.push(`%${email}%`);
    }

    // Construcción dinámica del WHERE final
    const whereClause =
      filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    // Consulta principal: obtiene la lista paginada
    const dataQuery = `
      SELECT id, email, nombre, role, grado, "createdAt"
      FROM users
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    // Se agregan limit y offset al final de los valores
    values.push(limit, offset);

    const result = await query(dataQuery, values);

    // Consulta para contar el total de resultados sin paginar
    const countResult = await query(
      `SELECT COUNT(*) AS total FROM users ${whereClause}`,
      // Se quitan los últimos dos valores (limit y offset)
      values.slice(0, values.length - 2)
    );

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    // Respuesta formateada
    sendSuccess(res, {
      page,
      limit,
      total,
      totalPages,
      users: result.rows
    });
    
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

    // Busca al usuario según su ID
    const result = await query(
      'SELECT id, email, nombre, role, grado, "createdAt", "updatedAt" FROM users WHERE id = $1',
      [id]
    );

    // Si no existe
    if (result.rows.length === 0) {
      sendError(res, 'Usuario no encontrado', 404);
      return;
    }

    // Respuesta con el usuario encontrado
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

    // Validar que el usuario esté autenticado
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    // Solo Admin o el propio usuario puede actualizar
    if (req.user.role !== 'Admin' && req.user.userId !== parseInt(id, 10)) {
      sendError(res, 'No tiene permisos para actualizar este usuario', 403);
      return;
    }

    // Campos dinámicos para actualizar
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

    // Validar que haya al menos un campo para actualizar
    if (updates.length === 0) {
      sendError(res, 'No hay campos para actualizar', 400);
      return;
    }

    // Actualiza el timestamp
    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(id);

    // Ejecuta la actualización
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

    // Eliminar usuario por ID
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [
      id
    ]);

    // Validar si existía
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

    // Información básica del usuario
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

    // Si es tutor, obtener toda su información relacionada
    if (user.role === 'Tutor') {

      // Datos generales del tutor
      const tutorResult = await query(
        'SELECT id, "ratingPromedio", "totalSesiones", "totalEvaluaciones" FROM tutors WHERE "userId" = $1',
        [id]
      );

      if (tutorResult.rows.length > 0) {
        profile.tutorInfo = tutorResult.rows[0];

        // Materias del tutor
        const subjectsResult = await query(
          'SELECT id, materia, nivel FROM tutor_subjects WHERE "tutorId" = $1',
          [tutorResult.rows[0].id]
        );
        profile.tutorInfo.subjects = subjectsResult.rows;

        // Insignias ganadas por el tutor
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



