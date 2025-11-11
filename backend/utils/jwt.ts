import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types/global';

const JWT_EXPIRES_IN = '7d';

/**
 * Obtiene el JWT_SECRET y valida que tenga al menos 32 caracteres
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || '';
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres. Verifica tu archivo .env');
  }
  return secret;
}

/**
 * Genera un token JWT para un usuario
 */
export function generateToken(
  userId: number,
  role: UserRole,
  email: string
): string {
  const payload: JwtPayload = {
    userId,
    role,
    email
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256'
  });
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256']
    }) as JwtPayload;
    return decoded;
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
}

/**
 * Decodifica un token sin verificar (útil para debugging)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

