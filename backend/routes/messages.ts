import { Router } from 'express';
import * as messageController from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
import { validateId } from '../middleware/validate';
import { param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

const router = Router();

// Validación específica para groupId
const validateGroupId = [
  param('groupId')
    .custom((value) => {
      const num = parseInt(value, 10);
      return !isNaN(num) && num > 0;
    })
    .withMessage('groupId inválido'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, 'Errores de validación', 400, errors.array());
      return;
    }
    next();
  }
];

router.get('/group/:groupId', authenticateToken, validateGroupId, messageController.getGroupMessages);
router.post('/', authenticateToken, messageController.createMessage);
router.delete('/:id', authenticateToken, validateId, messageController.deleteMessage);

export default router;


