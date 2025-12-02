import { Router } from 'express';
import * as sessionController from '../controllers/sessionController';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import { validateId, validateCreateSession } from '../middleware/validate';

const router = Router();

router.get('/', authenticateToken, sessionController.getSessions);
router.post('/', authenticateToken, authorizeRole('Profesor', 'Admin'), validateCreateSession, sessionController.createSession);
router.get('/calendar', authenticateToken, sessionController.getSessionsCalendar);
router.get('/:id', authenticateToken, validateId, sessionController.getSessionById);
router.put('/:id', authenticateToken, validateId, sessionController.updateSession);
router.delete('/:id', authenticateToken, validateId, sessionController.deleteSession);
router.put('/:id/start', authenticateToken, validateId, sessionController.startSession);
router.put('/:id/complete', authenticateToken, validateId, sessionController.completeSession);
router.post('/request', authenticateToken, sessionController.requestSession);
router.put('/:id/status', authenticateToken, authorizeRole('Admin', 'Profesor', 'Tutor'), validateId, sessionController.updateSessionStatus);

export default router;


