import { Request, Response } from 'express';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { NotFoundError, DatabaseError } from '../middleware/errorHandler';
import { query } from '../config/database';

/**
 * Registro de nuevo usuario
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, nombre, role, grado, apellidos, telefono, carrera } = req.body;

    // Validar campos requeridos
    if (!email || !password || !nombre) {
      sendError(res, 'Email, contraseña y nombre son campos obligatorios', 400);
      return;
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      sendError(res, 'El formato del email no es válido', 400);
      return;
    }

    // Validar que solo se pueda registrar como Estudiante
    if (role && role !== 'Estudiante') {
      sendError(res, 'Solo se puede registrar como Estudiante', 400);
      return;
    }

    // Validar que el grado no exceda 10 si se proporciona
    if (grado && (parseInt(grado) < 1 || parseInt(grado) > 10)) {
      sendError(res, 'El grado debe estar entre 1 y 10', 400);
      return;
    }

    // Verificar si el email ya existe
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      sendError(res, 'El email ya está registrado', 400);
      return;
    }

    // Hashear contraseña
    const passwordHash = await hashPassword(password);

    // Combinar nombre y apellidos si se proporcionan
    // Si el frontend ya envía nombre completo, usarlo directamente
    // Si envía nombre y apellidos por separado, combinarlos
    const nombreCompleto = apellidos ? `${nombre} ${apellidos}`.trim() : nombre;

    // Crear usuario
    // Nota: apellidos, telefono y carrera no están en el schema actual
    // pero los guardamos en el campo nombre si es necesario, o se pueden agregar al schema después
    const result = await query(
      `INSERT INTO users (email, "passwordHash", nombre, role, grado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, nombre, role, grado`,
      [email, passwordHash, nombreCompleto, role || 'Estudiante', grado || null]
    );

    const user = result.rows[0];

    // Generar token
    const token = generateToken(user.id, user.role, user.email);

    sendSuccess(
      res,
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          grado: user.grado,
          nombre: user.nombre
        }
      },
      'Usuario registrado exitosamente',
      201
    );
  } catch (error) {
    console.error('Error en register:', error);
    sendError(res, 'Error al registrar usuario', 500);
  }
}

/**
 * Login de usuario
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, nombre } = req.body;

    // Validar que se proporcione email o nombre
    if (!email && !nombre) {
      sendError(res, 'Debe proporcionar email o nombre de usuario', 400);
      return;
    }

    if (!password) {
      sendError(res, 'La contraseña es requerida', 400);
      return;
    }

    // Buscar usuario por email o nombre
    let result;
    if (email) {
      // Buscar por email (más preciso)
      result = await query(
        'SELECT id, email, "passwordHash", nombre, role, grado FROM users WHERE LOWER(email) = LOWER($1)',
        [email.trim()]
      );
    } else if (nombre) {
      // Buscar por nombre (coincidencia exacta primero, luego parcial)
      const nombreTrimmed = nombre.trim();
      result = await query(
        `SELECT id, email, "passwordHash", nombre, role, grado 
         FROM users 
         WHERE nombre = $1 OR LOWER(nombre) = LOWER($1) OR nombre LIKE $2
         ORDER BY CASE WHEN nombre = $1 THEN 1 WHEN LOWER(nombre) = LOWER($1) THEN 2 ELSE 3 END
         LIMIT 1`,
        [nombreTrimmed, `%${nombreTrimmed}%`]
      );
    } else {
      sendError(res, 'Debe proporcionar email o nombre de usuario', 400);
      return;
    }

    if (result.rows.length === 0) {
      sendError(res, 'Credenciales inválidas', 401);
      return;
    }

    // Si hay múltiples resultados por nombre, tomar el primero
    // (en producción, sería mejor requerir email para evitar ambigüedad)
    const user = result.rows[0];

    // Verificar contraseña
    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
      sendError(res, 'Credenciales inválidas', 401);
      return;
    }

    // Generar token
    const token = generateToken(user.id, user.role, user.email);

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        grado: user.grado,
        nombre: user.nombre
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    sendError(res, 'Error al iniciar sesión', 500);
  }
}

/**
 * Obtener información del usuario autenticado
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const result = await query(
      'SELECT id, email, nombre, role, grado FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Usuario no encontrado', 404);
      return;
    }

    sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error('Error en getMe:', error);
    sendError(res, 'Error al obtener información del usuario', 500);
  }
}

/**
 * Verificar si el token es válido
 */
export async function verify(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendSuccess(res, { valid: false });
      return;
    }

    sendSuccess(res, {
      valid: true,
      user: {
        id: req.user.userId,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    sendSuccess(res, { valid: false });
  }
}


