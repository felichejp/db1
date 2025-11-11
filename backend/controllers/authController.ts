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
    const { email, password, nombre, role, grado } = req.body;

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

    // Crear usuario
    const result = await query(
      `INSERT INTO users (email, "passwordHash", nombre, role, grado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, nombre, role, grado`,
      [email, passwordHash, nombre, role, grado || null]
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
    const { email, password } = req.body;

    // Buscar usuario
    const result = await query(
      'SELECT id, email, "passwordHash", nombre, role, grado FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Credenciales inválidas', 401);
      return;
    }

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

