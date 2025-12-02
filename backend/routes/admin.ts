import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import { validateId } from '../middleware/validate';

const router = Router();

router.get('/stats', authenticateToken, authorizeRole('Admin'), adminController.getStats);
router.get('/users', authenticateToken, authorizeRole('Admin'), adminController.getAdminUsers);
router.get('/groups', authenticateToken, authorizeRole('Admin'), adminController.getAdminGroups);
router.get('/reports', authenticateToken, authorizeRole('Admin'), adminController.getAdminReports);
router.get('/badges', authenticateToken, authorizeRole('Admin'), adminController.getBadges);
router.post('/badges', authenticateToken, authorizeRole('Admin'), adminController.createBadge);
router.post('/badges/:badgeId/assign/:userId', authenticateToken, authorizeRole('Admin'), validateId, adminController.assignBadge);

// Rutas para asignaciones
router.post('/groups/:groupId/assign-profesor', authenticateToken, authorizeRole('Admin'), validateId, adminController.assignProfesorToGroup);
router.post('/groups/:groupId/assign-tutor', authenticateToken, authorizeRole('Admin'), validateId, adminController.assignTutorToGroup);
router.post('/groups/:groupId/assign-alumno', authenticateToken, authorizeRole('Admin'), validateId, adminController.assignAlumnoToGroup);

export default router;


