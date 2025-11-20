import { Router } from 'express';
import * as evaluationController from '../controllers/evaluationController';
import { authenticateToken } from '../middleware/auth';
import { validateId, validateCreateEvaluation } from '../middleware/validate';

const router = Router();

router.get('/', authenticateToken, evaluationController.getEvaluations);
router.post('/', authenticateToken, validateCreateEvaluation, evaluationController.createEvaluation);
router.get('/:id', authenticateToken, validateId, evaluationController.getEvaluationById);
router.put('/:id', authenticateToken, validateId, evaluationController.updateEvaluation);
router.get('/tutor/:tutorId', authenticateToken, validateId, evaluationController.getTutorEvaluations);

export default router;


