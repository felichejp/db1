import { Router } from 'express';
import * as messageController from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
import { validateId, validateGroupId } from '../middleware/validate';

const router = Router();

router.get('/group/:groupId', authenticateToken, validateGroupId, messageController.getGroupMessages);
router.post('/', authenticateToken, messageController.createMessage);
router.delete('/:id', authenticateToken, validateId, messageController.deleteMessage);

export default router;


