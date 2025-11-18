import { Router } from 'express';
import * as groupController from '../controllers/groupController';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import { validateId, validateCreateGroup } from '../middleware/validate';

const router = Router();

router.get('/', authenticateToken, groupController.getGroups);
router.post('/', authenticateToken, authorizeRole('Profesor', 'Admin'), validateCreateGroup, groupController.createGroup);
router.get('/:id', authenticateToken, validateId, groupController.getGroupById);
router.put('/:id', authenticateToken, validateId, groupController.updateGroup);
router.delete('/:id', authenticateToken, validateId, groupController.deleteGroup);
router.get('/:id/members', authenticateToken, validateId, groupController.getGroupMembers);
router.post('/:id/members', authenticateToken, validateId, groupController.addGroupMember);
router.delete('/:id/members/:userId', authenticateToken, validateId, groupController.removeGroupMember);
router.post('/:id/invitations', authenticateToken, validateId, groupController.sendGroupInvitation);
router.get('/:id/invitations', authenticateToken, validateId, groupController.getGroupInvitations);
router.put('/invitations/:invitationId/accept', authenticateToken, groupController.acceptInvitation);
router.put('/invitations/:invitationId/reject', authenticateToken, groupController.rejectInvitation);

export default router;


