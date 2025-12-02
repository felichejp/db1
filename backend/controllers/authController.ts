import { Request, Response } from 'express';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';
import logger from '../utils/logger';

/**
 * Registro de nuevo usuario
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, nombre, role, grado } = req.body;

    // Permitir registro con cualquier rol (para testing/verificación de vistas)
    // Validación de rol se hace en el middleware validateRegister

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

    // Si es Tutor, crear registro en tabla tutors
    if (role === 'Tutor') {
      try {
        await query(
          `INSERT INTO tutors ("userId")
           VALUES ($1)
           ON CONFLICT ("userId") DO NOTHING`,
          [user.id]
        );
      } catch (tutorError) {
        logger.error('Error creando registro de tutor:', tutorError);
        // No fallar el registro si hay error en la tabla tutors
        // El usuario ya está creado, solo falta el registro de tutor
      }
    }

    // Si es Profesor, no necesita registro adicional (ya está en users)
    // Si es Admin, no necesita registro adicional (ya está en users)

    // Generar token
    let token: string;
    try {
      token = generateToken(user.id, user.role, user.email);
    } catch (tokenError) {
      logger.error('Error generando token JWT', {
        error: tokenError instanceof Error ? tokenError.message : String(tokenError),
        userId: user.id
      });
      
      if (tokenError instanceof Error && tokenError.message.includes('JWT_SECRET')) {
        sendError(res, 'Error de configuración del servidor. JWT_SECRET no está configurado correctamente.', 500);
        return;
      }
      throw tokenError; // Re-lanzar para que se capture en el catch general
    }

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
    // Log detallado del error
    if (error instanceof Error) {
      logger.error('Error en register', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        body: {
          email: req.body?.email,
          role: req.body?.role,
          hasPassword: !!req.body?.password,
          hasNombre: !!req.body?.nombre
        }
      });
      
      // Errores específicos de JWT
      if (error.message.includes('JWT_SECRET')) {
        logger.error('JWT_SECRET no configurado correctamente');
        sendError(res, 'Error de configuración del servidor. JWT_SECRET no está configurado.', 500);
        return;
      }
      
      // Errores de base de datos
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        sendError(res, 'El email ya está registrado', 400);
        return;
      }
      
      if (error.message.includes('violates check constraint')) {
        sendError(res, 'Datos inválidos. Verifica que el rol y grado sean correctos', 400);
        return;
      }
      
      // Errores de conexión a base de datos
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        logger.error('Error: No se puede resolver el hostname de la base de datos', {
          hostname: process.env.DB_HOST,
          message: 'Verifica que el hostname sea correcto y que tengas conexión a internet'
        });
        sendError(res, 'Error de conexión: No se puede conectar a la base de datos. Verifica la configuración del servidor.', 500);
        return;
      }
      
      if (error.message.includes('connection') || error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        logger.error('Error de conexión a la base de datos');
        sendError(res, 'Error de conexión a la base de datos. Verifica la configuración.', 500);
        return;
      }
      
      // Errores de sintaxis SQL
      if (error.message.includes('syntax error') || error.message.includes('column') && error.message.includes('does not exist')) {
        logger.error('Error de SQL', { error: error.message });
        sendError(res, 'Error en la base de datos. Verifica que las tablas existan.', 500);
        return;
      }
    } else {
      logger.error('Error desconocido en register', { error });
    }
    
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


