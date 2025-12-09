/**
 * Validadores de formularios
 */

/**
 * Valida un email
 */
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Valida una contraseña (mínimo 8 caracteres)
 */
export function validatePassword(password) {
  return password && password.length >= 8;
}

/**
 * Valida que un campo no esté vacío
 */
export function validateRequired(value) {
  return value !== null && value !== undefined && value.toString().trim() !== '';
}

/**
 * Valida un número
 */
export function validateNumber(value, min = null, max = null) {
  const num = Number(value);
  if (isNaN(num)) return false;
  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;
  return true;
}

/**
 * Valida una fecha
 */
export function validateDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Valida una hora (HH:mm)
 */
export function validateTime(timeString) {
  const re = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return re.test(timeString);
}

/**
 * Valida un formulario completo
 */
export function validateForm(formData, rules) {
  const errors = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = formData[field];

    if (rule.required && !validateRequired(value)) {
      errors[field] = `${field} es requerido`;
      continue;
    }

    if (!value && !rule.required) {
      continue; // Campo opcional vacío, no validar
    }

    if (rule.email && !validateEmail(value)) {
      errors[field] = `${field} debe ser un email válido`;
    }

    if (rule.password && !validatePassword(value)) {
      errors[field] = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (rule.number && !validateNumber(value, rule.min, rule.max)) {
      errors[field] = `${field} debe ser un número válido`;
    }

    if (rule.date && !validateDate(value)) {
      errors[field] = `${field} debe ser una fecha válida`;
    }

    if (rule.time && !validateTime(value)) {
      errors[field] = `${field} debe ser una hora válida (HH:mm)`;
    }

    if (rule.custom && !rule.custom(value, formData)) {
      errors[field] = rule.customMessage || `${field} no es válido`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

