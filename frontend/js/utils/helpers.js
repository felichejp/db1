/**
 * Funciones auxiliares
 */

/**
 * Formatea una fecha
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formatea una fecha y hora
 */
export function formatDateTime(dateString, timeString) {
  const date = new Date(`${dateString}T${timeString}`);
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatea una hora
 * Acepta string (HH:mm) o objeto Date
 */
export function formatTime(timeStringOrDate) {
  // Si es un objeto Date, formatearlo
  if (timeStringOrDate instanceof Date) {
    return timeStringOrDate.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  
  // Si es un string, verificar que sea válido
  if (typeof timeStringOrDate === 'string') {
    // Si es un string de fecha/hora completo, extraer solo la hora
    if (timeStringOrDate.includes('T') || timeStringOrDate.includes(' ')) {
      const date = new Date(timeStringOrDate);
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    // Si ya es formato HH:mm, devolver los primeros 5 caracteres
    return timeStringOrDate.substring(0, 5);
  }
  
  // Si no es ni Date ni string, intentar convertirlo
  try {
    const date = new Date(timeStringOrDate);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  } catch (e) {
    console.error('Error formateando hora:', timeStringOrDate, e);
  }
  
  return '--:--';
}

/**
 * Debounce para funciones
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle para funciones
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Capitaliza la primera letra
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Trunca un texto
 */
export function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Obtiene el nombre del rol en español
 */
export function getRoleName(role) {
  const roles = {
    'Admin': 'Administrador',
    'Profesor': 'Profesor',
    'Tutor': 'Tutor',
    'Estudiante': 'Estudiante'
  };
  return roles[role] || role;
}

/**
 * Obtiene el nombre del estado en español
 */
export function getStatusName(status) {
  const statuses = {
    'activo': 'Activo',
    'inactivo': 'Inactivo',
    'completado': 'Completado',
    'programada': 'Programada',
    'en_curso': 'En Curso',
    'completada': 'Completada',
    'cancelada': 'Cancelada',
    'pendiente': 'Pendiente',
    'aceptada': 'Aceptada',
    'rechazada': 'Rechazada',
    'expirada': 'Expirada'
  };
  return statuses[status] || status;
}

/**
 * Obtiene el color del estado
 */
export function getStatusColor(status) {
  const colors = {
    'activo': 'success',
    'completado': 'success',
    'completada': 'success',
    'aceptada': 'success',
    'inactivo': 'warning',
    'en_curso': 'info',
    'programada': 'info',
    'pendiente': 'warning',
    'cancelada': 'error',
    'rechazada': 'error',
    'expirada': 'error'
  };
  return colors[status] || 'info';
}


