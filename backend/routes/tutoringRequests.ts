import { Router } from 'express';
import * as tutoringRequestController from '../controllers/tutoringRequestController';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import { validateId } from '../middleware/validate';

const router = Router();

// Rutas para estudiantes
router.post('/', authenticateToken, authorizeRole('Estudiante'), tutoringRequestController.createTutoringRequest);
router.get('/available-groups', authenticateToken, authorizeRole('Estudiante'), tutoringRequestController.getAvailableGroups);

// Rutas para tutores
router.get('/tutor', authenticateToken, authorizeRole('Tutor'), tutoringRequestController.getTutoringRequests);
router.put('/:id/accept', authenticateToken, authorizeRole('Tutor'), validateId, tutoringRequestController.acceptTutoringRequest);
router.put('/:id/reject', authenticateToken, authorizeRole('Tutor'), validateId, tutoringRequestController.rejectTutoringRequest);

export default router;

