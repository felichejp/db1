import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import logger from '../utils/logger';

export class ValidationError extends Error {
  code = 400;
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  code = 401;

  constructor(message: string = 'No autenticado') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  code = 403;

  constructor(message: string = 'Sin permisos') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  code = 404;

  constructor(message: string = 'Recurso no encontrado') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error {
  code = 500;

  constructor(message: string = 'Error de base de datos') {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ServerError extends Error {
  code = 500;

  constructor(message: string = 'Error interno del servidor') {
    super(message);
    this.name = 'ServerError';
  }
}

/**
 * Middleware centralizado para manejo de errores
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error en la aplicación', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (
    err instanceof ValidationError ||
    err instanceof AuthenticationError ||
    err instanceof AuthorizationError ||
    err instanceof NotFoundError ||
    err instanceof DatabaseError ||
    err instanceof ServerError
  ) {
    sendError(res, err.message, err.code, (err as ValidationError).details);
    return;
  }

  // Error no manejado
  sendError(res, 'Error interno del servidor', 500);
}


