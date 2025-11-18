import { Router } from 'express';
import * as tutorController from '../controllers/tutorController';
import { authenticateToken } from '../middleware/auth';
import { validateId } from '../middleware/validate';

const router = Router();

router.get('/', authenticateToken, tutorController.getTutors);
router.get('/matching', authenticateToken, tutorController.getTutorMatching);
router.get('/:id', authenticateToken, validateId, tutorController.getTutorById);
router.get('/:id/profile', authenticateToken, validateId, tutorController.getTutorProfile);
router.get('/:id/availability', authenticateToken, validateId, tutorController.getTutorAvailability);
router.post('/:id/availability', authenticateToken, validateId, tutorController.createTutorAvailability);
router.delete('/:id/availability/:availabilityId', authenticateToken, validateId, tutorController.deleteTutorAvailability);
router.get('/:id/subjects', authenticateToken, validateId, tutorController.getTutorSubjects);
router.post('/:id/subjects', authenticateToken, validateId, tutorController.addTutorSubject);
router.delete('/:id/subjects/:subjectId', authenticateToken, validateId, tutorController.deleteTutorSubject);

export default router;


