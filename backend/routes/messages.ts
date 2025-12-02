import { Router } from 'express';
import * as messageController from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
import { validateId, validateGroupId } from '../middleware/validate';

const router = Router();

// Mensajes de grupo
router.get('/group/:groupId', authenticateToken, validateGroupId, messageController.getGroupMessages);

// Mensajes directos
router.get('/conversations', authenticateToken, messageController.getConversations);
router.get('/direct/:userId', authenticateToken, messageController.getDirectMessages);
router.post('/direct', authenticateToken, messageController.createDirectMessage);

// Mensajes generales (mantener compatibilidad)
router.post('/', authenticateToken, messageController.createMessage);
router.delete('/:id', authenticateToken, validateId, messageController.deleteMessage);

export default router;


