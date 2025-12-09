import { TutorMatch } from '../types/global';
import { query } from '../config/database';

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

  
  // PASO 1: Obtener información del grupo (grado máximo de los miembros)
  // Necesitamos saber qué grado mínimo debe tener el tutor para poder ayudar al grupo
  const groupResult = await query(
    `SELECT MAX(u.grado) AS grado_requerido
     FROM groups g
     JOIN group_members gm ON gm."groupId" = g.id
     JOIN users u ON u.id = gm."userId"
     WHERE g.id = $1`,
    [groupId]
  );

  // Si el grupo no existe o no tiene miembros, retornar array vacío
  if (groupResult.rows.length === 0 || !groupResult.rows[0].grado_requerido) {
    return [];
  }

  const gradoRequerido = groupResult.rows[0].grado_requerido;

  // PASO 2: Obtener el día de la semana de la fecha solicitada
  // PostgreSQL: 0=Domingo, 1=Lunes, ..., 6=Sábado
  // Usamos EXTRACT(DOW FROM fecha) para obtener el día de la semana
  const fechaDate = new Date(fecha);
  const diaSemana = fechaDate.getDay(); // JavaScript: 0=Domingo, 6=Sábado

  // PASO 3: Buscar tutores candidatos que cumplan los criterios básicos
  // - Tengan la materia en tutor_subjects
  // - Tengan grado igual o superior al requerido
  // - Tengan disponibilidad activa configurada
  const tutorsResult = await query(
    `SELECT DISTINCT
       t.id AS tutor_id,
       t."userId",
       u.grado AS tutor_grado,
       t."ratingPromedio",
       t."totalSesiones",
       MAX(s.fecha) FILTER (WHERE s.estado = 'completada') AS ultima_sesion
     FROM tutors t
     JOIN users u ON u.id = t."userId"
     JOIN tutor_subjects subj ON subj."tutorId" = t.id
     JOIN tutor_availability avail ON avail."tutorId" = t.id AND avail.activo = TRUE
     LEFT JOIN sessions s ON s."tutorId" = t.id
     WHERE subj.materia = $1
       AND u.grado >= $2
       AND avail."diaSemana" = $3
       AND avail."horaInicio" <= $4
       AND avail."horaFin" >= $5
     GROUP BY t.id, t."userId", u.grado, t."ratingPromedio", t."totalSesiones`,
    [materia, gradoRequerido, diaSemana, horaInicio, horaFin]
  );

  // PASO 4: Filtrar tutores que tengan conflictos de horario
  // Un tutor tiene conflicto si ya tiene una sesión programada/en_curso
  // que se traslape con el horario solicitado
  const tutorsSinConflicto: any[] = [];

  for (const tutor of tutorsResult.rows) {
    // Verificar si el tutor tiene una sesión que se traslape con el horario solicitado
    const conflictResult = await query(
      `SELECT 1
       FROM sessions s
       WHERE s."tutorId" = $1
         AND s.fecha = $2
         AND s.estado IN ('programada', 'en_curso')
         AND (
           (s."horaInicio" <= $3 AND s."horaFin" > $3) OR
           (s."horaInicio" < $4 AND s."horaFin" >= $4) OR
           (s."horaInicio" >= $3 AND s."horaFin" <= $4)
         )`,
      [tutor.tutor_id, fecha, horaInicio, horaFin]
    );

    // Si no hay conflictos, agregar el tutor a la lista de candidatos
    if (conflictResult.rows.length === 0) {
      tutorsSinConflicto.push(tutor);
    }
  }

  // PASO 5: Calcular el score para cada tutor candidato
  const tutorsConScore: TutorMatch[] = tutorsSinConflicto.map((tutor) => {
    // 5.1: Calcular gradoScore (30% del score total)
    // 100 puntos si es el mismo grado, 80 si es superior
    let gradoScore = 0;
    if (tutor.tutor_grado === gradoRequerido) {
      gradoScore = 100; // Mismo grado = mejor match
    } else if (tutor.tutor_grado > gradoRequerido) {
      gradoScore = 80; // Grado superior = buen match pero no ideal
    }

    // 5.2: Calcular materiaScore (25% del score total)
    // Como ya filtramos por materia, todos tienen 100 puntos
    const materiaScore = 100;

    // 5.3: Calcular disponibilidadScore (25% del score total)
    // Como ya verificamos disponibilidad, todos tienen 100 puntos
    const disponibilidadScore = 100;

    // 5.4: Calcular ratingScore (20% del score total)
    // Escalar el rating de 0-5 a 0-100 puntos
    const ratingPromedio = parseFloat(tutor.ratingPromedio) || 0;
    const ratingScore = (ratingPromedio / 5) * 100;

    // 5.5: Calcular el score total usando la función calculateScore
    const scoreTotal = calculateScore(
      gradoScore,
      materiaScore,
      disponibilidadScore,
      ratingScore
    );

    // Retornar el objeto TutorMatch con todos los datos necesarios
    return {
      tutorId: tutor.tutor_id,
      userId: tutor.userId,
      score: Math.round(scoreTotal * 100) / 100, // Redondear a 2 decimales
      ratingPromedio: ratingPromedio,
      totalSesiones: tutor.totalSesiones || 0,
      // Agregar campo auxiliar para ordenamiento (no está en el tipo pero lo usamos internamente)
      ultimaSesion: tutor.ultima_sesion || null
    } as TutorMatch & { ultimaSesion?: string | null };
  });

  // PASO 6: Ordenar los tutores según los criterios de priorización
  tutorsConScore.sort((a, b) => {
    // 6.1: Primero por score total (mayor a menor)
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // 6.2: En caso de empate: Mayor rating promedio
    const aRating = (a as any).ratingPromedio || 0;
    const bRating = (b as any).ratingPromedio || 0;
    if (bRating !== aRating) {
      return bRating - aRating;
    }

    // 6.3: En caso de empate: Mayor número de sesiones completadas
    const aSesiones = a.totalSesiones || 0;
    const bSesiones = b.totalSesiones || 0;
    if (bSesiones !== aSesiones) {
      return bSesiones - aSesiones;
    }

    // 6.4: En caso de empate: Más reciente (última sesión)
    // El tutor con sesión más reciente tiene prioridad
    const aUltima = (a as any).ultimaSesion || null;
    const bUltima = (b as any).ultimaSesion || null;
    if (aUltima && bUltima) {
      return new Date(bUltima).getTime() - new Date(aUltima).getTime();
    }
    if (aUltima) return -1; // a tiene sesión, b no
    if (bUltima) return 1;  // b tiene sesión, a no
    return 0; // Ninguno tiene sesión
  });

  // PASO 7: Limpiar campos auxiliares y retornar solo TutorMatch
  return tutorsConScore.map((tutor) => {
    const { ultimaSesion, ...tutorMatch } = tutor as any;
    return tutorMatch as TutorMatch;
  });
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

