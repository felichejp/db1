import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { UserRole } from '../types/global';

/**
 * Middleware para autenticar tokens JWT
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    sendError(res, 'Token no proporcionado', 401);
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email
    };
    next();
  } catch (error) {
    sendError(res, 'Token inválido o expirado', 401);
  }
}

/**
 * Middleware para autorizar roles específicos
 */
export function authorizeRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 'No tiene permisos para acceder a este recurso', 403);
      return;
    }

    next();
  };
}


