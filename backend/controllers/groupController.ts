import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/database';
import { emitToGroup, emitToUser } from '../config/socket';

/**
 * Listar grupos (según rol)
 */
export async function getGroups(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const baseSelect = `
      SELECT g.*, u.nombre as "profesorNombre", u.email as "profesorEmail"
      FROM groups g
      LEFT JOIN users u ON g."profesorId" = u.id
    `;

    let result;
    if (req.user.role === 'Admin') {
      result = await query(`${baseSelect} ORDER BY g."createdAt" DESC`);
    } else if (req.user.role === 'Profesor') {
      result = await query(
        `${baseSelect}
         WHERE g."profesorId" = $1
         ORDER BY g."createdAt" DESC`,
        [req.user.userId]
      );
    } else {
      // Estudiante o Tutor: grupos donde es miembro
      result = await query(
        `${baseSelect}
         JOIN group_members gm ON g.id = gm."groupId"
         WHERE gm."userId" = $1
         ORDER BY g."createdAt" DESC`,
        [req.user.userId]
      );
    }

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getGroups:', error);
    sendError(res, 'Error al obtener grupos', 500);
  }
}

/**
 * Crear grupo (Profesor, Admin)
 */
export async function createGroup(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, descripcion, profesorId } = req.body;
    const finalProfesorId = profesorId || (req.user?.role === 'Profesor' ? req.user.userId : null);

    const result = await query(
      `INSERT INTO groups (nombre, descripcion, "profesorId")
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nombre, descripcion || null, finalProfesorId]
    );

    const createdGroup = await query(
      `SELECT g.*, u.nombre as "profesorNombre", u.email as "profesorEmail"
       FROM groups g
       LEFT JOIN users u ON g."profesorId" = u.id
       WHERE g.id = $1`,
      [result.rows[0].id]
    );

    sendSuccess(res, createdGroup.rows[0], 'Grupo creado exitosamente', 201);
  } catch (error) {
    console.error('Error en createGroup:', error);
    sendError(res, 'Error al crear grupo', 500);
  }
}

/**
 * Obtener grupo por ID
 */
export async function getGroupById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT g.*, u.nombre as "profesorNombre", u.email as "profesorEmail"
       FROM groups g
       LEFT JOIN users u ON g."profesorId" = u.id
       WHERE g.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Grupo no encontrado', 404);
      return;
    }

    sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error('Error en getGroupById:', error);
    sendError(res, 'Error al obtener grupo', 500);
  }
}

/**
 * Actualizar grupo
 */
export async function updateGroup(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { nombre, descripcion, estado } = req.body;

    // Verificar permisos
    const groupResult = await query('SELECT "profesorId" FROM groups WHERE id = $1', [id]);
    if (groupResult.rows.length === 0) {
      sendError(res, 'Grupo no encontrado', 404);
      return;
    }

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const group = groupResult.rows[0];
    if (req.user.role !== 'Admin' && group.profesorId !== req.user.userId) {
      sendError(res, 'No tiene permisos para actualizar este grupo', 403);
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${paramCount++}`);
      values.push(nombre);
    }
    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramCount++}`);
      values.push(descripcion);
    }
    if (estado !== undefined) {
      updates.push(`estado = $${paramCount++}`);
      values.push(estado);
    }

    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE groups SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    const updatedGroup = await query(
      `SELECT g.*, u.nombre as "profesorNombre", u.email as "profesorEmail"
       FROM groups g
       LEFT JOIN users u ON g."profesorId" = u.id
       WHERE g.id = $1`,
      [result.rows[0].id]
    );

    emitToGroup(parseInt(id, 10), 'group_updated', updatedGroup.rows[0]);
    sendSuccess(res, updatedGroup.rows[0], 'Grupo actualizado exitosamente');
  } catch (error) {
    console.error('Error en updateGroup:', error);
    sendError(res, 'Error al actualizar grupo', 500);
  }
}

/**
 * Eliminar grupo
 */
export async function deleteGroup(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const groupResult = await query('SELECT "profesorId" FROM groups WHERE id = $1', [id]);
    if (groupResult.rows.length === 0) {
      sendError(res, 'Grupo no encontrado', 404);
      return;
    }

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const group = groupResult.rows[0];
    if (req.user.role !== 'Admin' && group.profesorId !== req.user.userId) {
      sendError(res, 'No tiene permisos para eliminar este grupo', 403);
      return;
    }

    await query('DELETE FROM groups WHERE id = $1', [id]);
    sendSuccess(res, null, 'Grupo eliminado exitosamente');
  } catch (error) {
    console.error('Error en deleteGroup:', error);
    sendError(res, 'Error al eliminar grupo', 500);
  }
}

/**
 * Listar miembros del grupo
 */
export async function getGroupMembers(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT u.id, u.email, u.nombre, u.role, u.grado, gm."joinedAt"
       FROM group_members gm
       JOIN users u ON gm."userId" = u.id
       WHERE gm."groupId" = $1
       ORDER BY gm."joinedAt" ASC`,
      [id]
    );

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getGroupMembers:', error);
    sendError(res, 'Error al obtener miembros', 500);
  }
}

/**
 * Agregar miembro al grupo
 */
export async function addGroupMember(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Verificar que el grupo no tenga más de 5 miembros
    const countResult = await query(
      'SELECT COUNT(*) as count FROM group_members WHERE "groupId" = $1',
      [id]
    );
    if (parseInt(countResult.rows[0].count, 10) >= 5) {
      sendError(res, 'El grupo ya tiene el máximo de miembros (5)', 400);
      return;
    }

    const result = await query(
      `INSERT INTO group_members ("groupId", "userId")
       VALUES ($1, $2)
       ON CONFLICT ("groupId", "userId") DO NOTHING
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      sendError(res, 'El usuario ya es miembro del grupo', 400);
      return;
    }

    emitToUser(userId, 'group_invitation', { groupId: id, accepted: true });
    sendSuccess(res, result.rows[0], 'Miembro agregado exitosamente', 201);
  } catch (error) {
    console.error('Error en addGroupMember:', error);
    sendError(res, 'Error al agregar miembro', 500);
  }
}

/**
 * Eliminar miembro del grupo
 */
export async function removeGroupMember(req: Request, res: Response): Promise<void> {
  try {
    const { id, userId } = req.params;

    const result = await query(
      'DELETE FROM group_members WHERE "groupId" = $1 AND "userId" = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Miembro no encontrado', 404);
      return;
    }

    sendSuccess(res, null, 'Miembro eliminado exitosamente');
  } catch (error) {
    console.error('Error en removeGroupMember:', error);
    sendError(res, 'Error al eliminar miembro', 500);
  }
}

/**
 * Enviar invitación a grupo
 */
export async function sendGroupInvitation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { invitedUserId } = req.body;

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

    const result = await query(
      `INSERT INTO group_invitations ("groupId", "invitedUserId", "inviterId", "expiresAt")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, invitedUserId, req.user.userId, expiresAt]
    );

    emitToUser(invitedUserId, 'group_invitation', { groupId: id, invitationId: result.rows[0].id });
    sendSuccess(res, result.rows[0], 'Invitación enviada exitosamente', 201);
  } catch (error) {
    console.error('Error en sendGroupInvitation:', error);
    sendError(res, 'Error al enviar invitación', 500);
  }
}

/**
 * Listar invitaciones del grupo
 */
export async function getGroupInvitations(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT gi.*, u.email, u.nombre as "invitedUserName"
       FROM group_invitations gi
       JOIN users u ON gi."invitedUserId" = u.id
       WHERE gi."groupId" = $1
       ORDER BY gi."createdAt" DESC`,
      [id]
    );

    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error en getGroupInvitations:', error);
    sendError(res, 'Error al obtener invitaciones', 500);
  }
}

/**
 * Aceptar invitación
 */
export async function acceptInvitation(req: Request, res: Response): Promise<void> {
  try {
    const { invitationId } = req.params;

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const invResult = await query(
      'SELECT * FROM group_invitations WHERE id = $1 AND "invitedUserId" = $2',
      [invitationId, req.user.userId]
    );

    if (invResult.rows.length === 0) {
      sendError(res, 'Invitación no encontrada', 404);
      return;
    }

    const invitation = invResult.rows[0];
    if (invitation.estado !== 'pendiente') {
      sendError(res, 'La invitación ya fue procesada', 400);
      return;
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await query('UPDATE group_invitations SET estado = $1 WHERE id = $2', ['expirada', invitationId]);
      sendError(res, 'La invitación ha expirado', 400);
      return;
    }

    // Agregar miembro
    await addGroupMember(
      { params: { id: invitation.groupId }, body: { userId: req.user.userId } } as Request,
      res,
      () => {}
    );

    // Actualizar invitación
    await query(
      'UPDATE group_invitations SET estado = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      ['aceptada', invitationId]
    );
  } catch (error) {
    console.error('Error en acceptInvitation:', error);
    sendError(res, 'Error al aceptar invitación', 500);
  }
}

/**
 * Rechazar invitación
 */
export async function rejectInvitation(req: Request, res: Response): Promise<void> {
  try {
    const { invitationId } = req.params;

    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    const result = await query(
      `UPDATE group_invitations 
       SET estado = $1, "updatedAt" = CURRENT_TIMESTAMP 
       WHERE id = $2 AND "invitedUserId" = $3 AND estado = $4
       RETURNING *`,
      ['rechazada', invitationId, req.user.userId, 'pendiente']
    );

    if (result.rows.length === 0) {
      sendError(res, 'Invitación no encontrada o ya procesada', 404);
      return;
    }

    sendSuccess(res, result.rows[0], 'Invitación rechazada');
  } catch (error) {
    console.error('Error en rejectInvitation:', error);
    sendError(res, 'Error al rechazar invitación', 500);
  }
}

