import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types/global';

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
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

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256'
  });
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
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

