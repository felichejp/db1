import { Router } from 'express';
import * as messageController from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
<<<<<<< HEAD
import { validateId } from '../middleware/validate';

const router = Router();

router.get('/group/:groupId', authenticateToken, validateId, messageController.getGroupMessages);
=======
import { validateId, validateGroupId } from '../middleware/validate';

const router = Router();

router.get('/group/:groupId', authenticateToken, validateGroupId, messageController.getGroupMessages);
>>>>>>> origin/Juan_Nambo
router.post('/', authenticateToken, messageController.createMessage);
router.delete('/:id', authenticateToken, validateId, messageController.deleteMessage);

export default router;


