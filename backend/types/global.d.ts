import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        role: UserRole;
        email: string;
      };
    }
  }
}

export type UserRole = 'Admin' | 'Profesor' | 'Tutor' | 'Estudiante';

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  code: number;
  message: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export interface JwtPayload {
  userId: number;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

export interface User {
  id: number;
  email: string;
  nombre: string;
  role: UserRole;
  grado: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: number;
  nombre: string;
  profesorId: number | null;
  estado: 'activo' | 'inactivo' | 'completado';
  descripcion: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tutor {
  id: number;
  userId: number;
  ratingPromedio: number;
  totalSesiones: number;
  totalEvaluaciones: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: number;
  tutorId: number | null;
  groupId: number;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
  estado: 'programada' | 'en_curso' | 'completada' | 'cancelada';
  tema: string | null;
  notas: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TutorMatch {
  tutorId: number;
  userId: number;
  score: number;
  ratingPromedio: number;
  totalSesiones: number;
}

