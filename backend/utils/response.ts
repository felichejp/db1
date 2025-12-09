import { Response } from 'express';
import { ApiSuccess, ApiError } from '../types/global';

/**
 * Envía una respuesta de éxito
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  const response: ApiSuccess<T> = {
    success: true,
    data,
    ...(message && { message })
  };
  res.status(statusCode).json(response);
}

/**
 * Envía una respuesta de error
 */
export function sendError(
  res: Response,
  message: string,
  code: number = 500,
  details?: unknown
): void {
  const response: ApiError = {
    success: false,
    code,
    message,
    ...(details && { details })
  };
  res.status(code).json(response);
}


