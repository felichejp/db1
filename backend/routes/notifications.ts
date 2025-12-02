import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';
import { validateId } from '../middleware/validate';

const router = Router();

router.get('/', authenticateToken, notificationController.getNotifications);
router.get('/unread', authenticateToken, notificationController.getUnreadCount);
router.put('/:id/read', authenticateToken, validateId, notificationController.markAsRead);
router.put('/read-all', authenticateToken, notificationController.markAllAsRead);
router.delete('/:id', authenticateToken, validateId, notificationController.deleteNotification);

export default router;


