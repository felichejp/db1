import { Request, Response, NextFunction } from 'express';
import { validateFileSize, validateFileType } from '../config/s3';
import { sendError } from '../utils/response';

/**
 * Middleware para validar archivos antes de subir
 */
export function validateFile(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const file = (req as any).file || (req as any).files?.[0];

  if (!file) {
    sendError(res, 'No se proporcionó ningún archivo', 400);
    return;
  }

  // Validar tamaño
  if (!validateFileSize(file.size)) {
    sendError(res, 'El archivo excede el tamaño máximo de 10 MB', 400);
    return;
  }

  // Validar tipo
  if (!validateFileType(file.mimetype)) {
    sendError(
      res,
      'Tipo de archivo no permitido. Tipos permitidos: PDF, DOC, DOCX, JPG, PNG, GIF, TXT, XLS, XLSX',
      400
    );
    return;
  }

  next();
}


