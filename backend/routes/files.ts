import { Router } from 'express';
import * as fileController from '../controllers/fileController';
import { authenticateToken } from '../middleware/auth';
<<<<<<< HEAD
import { validateId, validateFile } from '../middleware/validate';
=======
import { validateId, validateFile, validateGroupId } from '../middleware/validate';
>>>>>>> origin/Juan_Nambo
import { validateFile as validateFileMiddleware } from '../middleware/upload';

const router = Router();

<<<<<<< HEAD
router.get('/group/:groupId', authenticateToken, validateId, fileController.getGroupFiles);
=======
router.get('/group/:groupId', authenticateToken, validateGroupId, fileController.getGroupFiles);
>>>>>>> origin/Juan_Nambo
router.post('/upload', authenticateToken, validateFileMiddleware, fileController.uploadFile);
router.get('/:id', authenticateToken, validateId, fileController.getFileById);
router.get('/:id/download', authenticateToken, validateId, fileController.downloadFile);
router.delete('/:id', authenticateToken, validateId, fileController.deleteFile);

export default router;


