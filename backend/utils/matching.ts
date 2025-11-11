import { TutorMatch } from '../types/global';

/**
 * Algoritmo de emparejamiento de tutores con grupos
 * 
 * @param groupId - ID del grupo
 * @param materia - Materia requerida
 * @param fecha - Fecha de la sesión (YYYY-MM-DD)
 * @param horaInicio - Hora de inicio (HH:mm)
 * @param horaFin - Hora de fin (HH:mm)
 * @returns Array de tutores ordenados por score (mejor match primero)
 * 
 * Criterios de matching (con pesos):
 * - Grado del tutor (30%): Mismo grado = 100 puntos, grado superior = 80 puntos
 * - Materia de especialidad (25%): Coincide materia = 100 puntos
 * - Disponibilidad (25%): Disponible en fecha/hora = 100 puntos
 * - Rating promedio (20%): 5 estrellas = 100 puntos, escala lineal
 */
export async function matchTutorToGroup(
  groupId: number,
  materia: string,
  fecha: string,
  horaInicio: string,
  horaFin: string
): Promise<TutorMatch[]> {
  // TODO: Implementar consulta a base de datos
  // Esta función debe:
  // 1. Obtener información del grupo (grado promedio de miembros)
  // 2. Buscar tutores que:
  //    - Tengan la materia en tutor_subjects
  //    - Tengan disponibilidad en tutor_availability para el día y hora
  //    - No tengan conflictos en sessions para esa fecha/hora
  //    - Tengan grado igual o superior al del grupo
  // 3. Calcular score para cada tutor
  // 4. Ordenar por score (mayor a menor)
  // 5. En caso de empate: Mayor rating promedio
  // 6. En caso de empate: Mayor número de sesiones completadas
  // 7. En caso de empate: Más reciente (última sesión)

  // Placeholder: retornar array vacío hasta implementar consulta a BD
  return [];
}

/**
 * Calcula el score de matching para un tutor
 */
function calculateScore(
  gradoScore: number,
  materiaScore: number,
  disponibilidadScore: number,
  ratingScore: number
): number {
  return (
    gradoScore * 0.3 +
    materiaScore * 0.25 +
    disponibilidadScore * 0.25 +
    ratingScore * 0.2
  );
}

