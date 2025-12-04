import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';
import { generateUploadUrl, generateDownloadUrl } from '../config/s3';

export async function getGroupFiles(req: Request, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const result = await query(
      `SELECT f.*, u.nombre as "uploaderName"
       FROM files f
       JOIN users u ON f."uploaderId" = u.id
       WHERE f."groupId" = $1
       ORDER BY f."createdAt" DESC`,
      [groupId]
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getGroupFiles:', error);
    sendError(res, 'Error al obtener archivos', 500);
  }
}

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const { groupId, nombre, tipo, descripcion } = req.body;
    const file = (req as any).file || (req as any).files?.[0];

    if (!file) {
      sendError(res, 'No se proporcionó archivo', 400);
      return;
    }

    // Generar URL de upload
    const uploadUrl = await generateUploadUrl(groupId, file.originalname, file.mimetype);
    const s3Key = uploadUrl.split('?')[0].split('/').slice(-3).join('/');

    // Guardar registro en BD
    const result = await query(
      `INSERT INTO files ("groupId", "uploaderId", nombre, "s3Key", tipo, tamaño, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [groupId, req.user.userId, nombre || file.originalname, s3Key, tipo || file.mimetype, file.size, descripcion || null]
    );

    sendSuccess(res, {
      file: result.rows[0],
      uploadUrl
    }, 'Archivo listo para subir', 201);
  } catch (error) {
    console.error('Error en uploadFile:', error);
    sendError(res, 'Error al procesar archivo', 500);
  }
}

export async function getFileById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM files WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      sendError(res, 'Archivo no encontrado', 404);
      return;
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error('Error en getFileById:', error);
    sendError(res, 'Error al obtener archivo', 500);
  }
}

export async function downloadFile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query('SELECT "s3Key" FROM files WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      sendError(res, 'Archivo no encontrado', 404);
      return;
    }

    const downloadUrl = await generateDownloadUrl(result.rows[0].s3Key);
    sendSuccess(res, { downloadUrl });
  } catch (error) {
    console.error('Error en downloadFile:', error);
    sendError(res, 'Error al generar URL de descarga', 500);
  }
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const fileResult = await query('SELECT "uploaderId" FROM files WHERE id = $1', [id]);
    if (fileResult.rows.length === 0) {
      sendError(res, 'Archivo no encontrado', 404);
      return;
    }

    if (req.user.role !== 'Admin' && fileResult.rows[0].uploaderId !== req.user.userId) {
      sendError(res, 'No tiene permisos para eliminar este archivo', 403);
      return;
    }

    await query('DELETE FROM files WHERE id = $1', [id]);
    sendSuccess(res, null, 'Archivo eliminado');
  } catch (error) {
    console.error('Error en deleteFile:', error);
    sendError(res, 'Error al eliminar archivo', 500);
  }
}


