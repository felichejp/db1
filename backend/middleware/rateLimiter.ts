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
 * Rate limiter para autenticación: 10 requests por 15 minutos por IP
 * Aumentado para desarrollo
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Aumentado de 5 a 10 para desarrollo
  message: 'Demasiados intentos de autenticación, intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // En desarrollo, puedes saltar el rate limit si es necesario
    return process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit'] === 'true';
  }
});

