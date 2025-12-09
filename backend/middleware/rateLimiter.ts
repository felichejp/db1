import rateLimit from 'express-rate-limit';

/**
 * Rate limiter general: 100 requests por 10 minutos por IP
 */
export const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 100,
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter para autenticación: 5 requests por 15 minutos por IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: 'Demasiados intentos de autenticación, intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false
});

