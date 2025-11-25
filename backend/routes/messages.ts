import { Router } from 'express';
import * as messageController from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
import { validateId, validateGroupId } from '../middleware/validate';

const router = Router();

// Mensajes de grupo
router.get('/group/:groupId', authenticateToken, validateGroupId, messageController.getGroupMessages);

// Conversaciones privadas (solo Profesores y Estudiantes)
router.get('/conversations', authenticateToken, messageController.getConversations);
router.get('/private/:userId', authenticateToken, messageController.getPrivateMessages);

// Crear mensaje (grupo o privado)
router.post('/', authenticateToken, messageController.createMessage);

// Eliminar mensaje
router.delete('/:id', authenticateToken, validateId, messageController.deleteMessage);

export default router;


