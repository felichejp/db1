import { Router } from 'express';
import * as tutorRequestController from '../controllers/tutorRequestController';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import { validateId } from '../middleware/validate';

const router = Router();

// Rutas para tutores
router.post('/subject-request', authenticateToken, authorizeRole('Tutor'), tutorRequestController.createTutorSubjectRequest);
router.post('/teacher-support', authenticateToken, authorizeRole('Tutor'), tutorRequestController.createTeacherSupportRequest);

// Rutas para profesores
router.get('/teacher-support', authenticateToken, authorizeRole('Profesor'), tutorRequestController.getTeacherSupportRequests);
router.put('/teacher-support/:id/accept', authenticateToken, authorizeRole('Profesor'), validateId, tutorRequestController.acceptTeacherSupportRequest);
router.put('/teacher-support/:id/reject', authenticateToken, authorizeRole('Profesor'), validateId, tutorRequestController.rejectTeacherSupportRequest);

// Rutas para administradores
router.get('/subject-requests', authenticateToken, authorizeRole('Admin'), tutorRequestController.getTutorSubjectRequests);
router.put('/subject-requests/:id/accept', authenticateToken, authorizeRole('Admin'), validateId, tutorRequestController.acceptTutorSubjectRequest);
router.put('/subject-requests/:id/reject', authenticateToken, authorizeRole('Admin'), validateId, tutorRequestController.rejectTutorSubjectRequest);

export default router;

