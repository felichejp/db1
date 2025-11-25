import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import { validateId } from '../middleware/validate';

const router = Router();

router.get('/', authenticateToken, authorizeRole('Admin', 'Profesor'), userController.getUsers);
router.get('/students', authenticateToken, userController.getStudents);
router.get('/:id', authenticateToken, validateId, userController.getUserById);
router.put('/:id', authenticateToken, validateId, userController.updateUser);
router.delete('/:id', authenticateToken, authorizeRole('Admin'), validateId, userController.deleteUser);
router.get('/:id/profile', authenticateToken, validateId, userController.getUserProfile);

export default router;

