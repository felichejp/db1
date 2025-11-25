import { body, param } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/response';

/**
 * Middleware para validar resultados de express-validator
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Errores de validación', 400, errors.array());
    return;
  }
  next();
}

/**
 * Validaciones para registro de usuario
 */
export const validateRegister = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('role')
    .isIn(['Admin', 'Profesor', 'Tutor', 'Estudiante'])
    .withMessage('Rol inválido'),
  body('grado').optional().isInt({ min: 1, max: 10 }).withMessage('Grado debe ser entre 1 y 10'),
  validate
];

/**
 * Validaciones para login
 */
export const validateLogin = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  validate
];

/**
 * Validaciones para ID numérico en parámetros
 */
export const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID inválido'),
  validate
];

/**
 * Validaciones para groupId numérico en parámetros
 */
export const validateGroupId = [
  param('groupId').isInt({ min: 1 }).withMessage('groupId inválido'),
  validate
];

/**
 * Validaciones para crear grupo
 */
export const validateCreateGroup = [
  body('nombre').notEmpty().withMessage('El nombre del grupo es requerido'),
  body('descripcion').optional().isString(),
  body('profesorId').optional().isInt({ min: 1 }),
  validate
];

/**
 * Validaciones para crear sesión
 */
export const validateCreateSession = [
  body('groupId').isInt({ min: 1 }).withMessage('groupId inválido'),
  body('fecha').isISO8601().withMessage('Fecha inválida (formato ISO8601)'),
  body('horaInicio').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida (HH:mm)'),
  body('horaFin').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida (HH:mm)'),
  body('tutorId').optional().isInt({ min: 1 }),
  body('tema').optional().isString(),
  validate
];

/**
 * Validaciones para crear evaluación
 */
export const validateCreateEvaluation = [
  body('sessionId').isInt({ min: 1 }).withMessage('sessionId inválido'),
  body('tutorId').isInt({ min: 1 }).withMessage('tutorId inválido'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating debe ser entre 1 y 5'),
  body('comentario').optional().isString(),
  validate
];

/**
 * Validaciones para actualizar usuario
 */
export const validateUpdateUser = [
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('grado').optional().isInt({ min: 1, max: 10 }).withMessage('Grado debe ser entre 1 y 10'),
  validate
];


