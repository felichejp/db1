import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';

export async function getEvaluations(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    let result;
    if (req.user.role === 'Admin') {
      result = await query('SELECT * FROM evaluations ORDER BY "createdAt" DESC');
    } else if (req.user.role === 'Tutor') {
      const tutorResult = await query('SELECT id FROM tutors WHERE "userId" = $1', [req.user.userId]);
      if (tutorResult.rows.length > 0) {
        result = await query(
          'SELECT * FROM evaluations WHERE "tutorId" = $1 ORDER BY "createdAt" DESC',
          [tutorResult.rows[0].id]
        );
      } else {
        result = { rows: [] };
      }
    } else {
      result = await query(
        'SELECT * FROM evaluations WHERE "evaluatorId" = $1 ORDER BY "createdAt" DESC',
        [req.user.userId]
      );
    }

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getEvaluations:', error);
    sendError(res, 'Error al obtener evaluaciones', 500);
  }
}

export async function createEvaluation(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const { sessionId, tutorId, rating, comentario } = req.body;

    // Verificar que no haya evaluado esta sesión antes
    const existingResult = await query(
      'SELECT id FROM evaluations WHERE "sessionId" = $1 AND "evaluatorId" = $2',
      [sessionId, req.user.userId]
    );

    if (existingResult.rows.length > 0) {
      sendError(res, 'Ya has evaluado esta sesión', 400);
      return;
    }

    const result = await query(
      `INSERT INTO evaluations ("sessionId", "evaluatorId", "tutorId", rating, comentario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sessionId, req.user.userId, tutorId, rating, comentario || null]
    );

    sendSuccess(res, result.rows[0], 'Evaluación creada', 201);
  } catch (error) {
    console.error('Error en createEvaluation:', error);
    sendError(res, 'Error al crear evaluación', 500);
  }
}

export async function getEvaluationById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM evaluations WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      sendError(res, 'Evaluación no encontrada', 404);
      return;
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error('Error en getEvaluationById:', error);
    sendError(res, 'Error al obtener evaluación', 500);
  }
}

export async function updateEvaluation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { rating, comentario } = req.body;

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const evalResult = await query('SELECT "evaluatorId" FROM evaluations WHERE id = $1', [id]);
    if (evalResult.rows.length === 0) {
      sendError(res, 'Evaluación no encontrada', 404);
      return;
    }

    if (evalResult.rows[0].evaluatorId !== req.user.userId) {
      sendError(res, 'No tiene permisos para actualizar esta evaluación', 403);
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (rating !== undefined) {
      updates.push(`rating = $${paramCount++}`);
      values.push(rating);
    }
    if (comentario !== undefined) {
      updates.push(`comentario = $${paramCount++}`);
      values.push(comentario);
    }

    values.push(id);

    const result = await query(
      `UPDATE evaluations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    sendSuccess(res, result.rows[0], 'Evaluación actualizada');
  } catch (error) {
    console.error('Error en updateEvaluation:', error);
    sendError(res, 'Error al actualizar evaluación', 500);
  }
}

export async function getTutorEvaluations(req: Request, res: Response): Promise<void> {
  try {
    const { tutorId } = req.params;
    const result = await query(
      `SELECT e.*, u.nombre as "evaluatorName"
       FROM evaluations e
       JOIN users u ON e."evaluatorId" = u.id
       WHERE e."tutorId" = $1
       ORDER BY e."createdAt" DESC`,
      [tutorId]
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getTutorEvaluations:', error);
    sendError(res, 'Error al obtener evaluaciones', 500);
  }
}


