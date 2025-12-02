import { Router } from 'express';
import * as fileController from '../controllers/fileController';
import { authenticateToken } from '../middleware/auth';
import { validateId } from '../middleware/validate';
import { validateFile as validateFileMiddleware } from '../middleware/upload';

const router = Router();

router.get('/group/:groupId', authenticateToken, validateId, fileController.getGroupFiles);
router.post('/upload', authenticateToken, validateFileMiddleware, fileController.uploadFile);
router.get('/:id', authenticateToken, validateId, fileController.getFileById);
router.get('/:id/download', authenticateToken, validateId, fileController.downloadFile);
router.delete('/:id', authenticateToken, validateId, fileController.deleteFile);

export default router;


