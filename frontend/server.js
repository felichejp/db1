const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración del backend (ajustar según tu configuración)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// ============================================
// UTILIDADES: Validación y Sanitización
// ============================================

/**
 * Sanitiza un string eliminando caracteres peligrosos y espacios extra
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[<>]/g, '') // Eliminar tags HTML básicos
    .replace(/[\x00-\x1F\x7F]/g, '') // Eliminar caracteres de control
    .substring(0, 255); // Limitar longitud
}

/**
 * Valida formato de teléfono
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Acepta números con formato internacional, espacios, guiones y paréntesis
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,20}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Valida formato de contraseña
 */
function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  // Mínimo 8 caracteres, debe contener letras, números y caracteres especiales
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLongEnough = password.length >= 8;
  
  return hasLetter && hasNumber && hasSpecial && isLongEnough;
}

/**
 * Valida código de verificación (5 dígitos)
 */
function isValidCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^\d{5}$/.test(code.trim());
}

/**
 * Valida nombre (solo letras, espacios, números y algunos caracteres especiales)
 */
function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  // Permitir letras, números, espacios, acentos y algunos caracteres especiales
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\.,\-']+$/;
  return nameRegex.test(trimmed);
}

/**
 * Valida nombre de institución
 */
function isValidInstitution(institution) {
  if (!institution || typeof institution !== 'string') return false;
  const trimmed = institution.trim();
  if (trimmed.length < 2 || trimmed.length > 200) return false;
  // Similar a nombre pero más permisivo
  const institutionRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\.,\-'()]+$/;
  return institutionRegex.test(trimmed);
}

// ============================================
// VALIDACIÓN DE REQUEST: send-code
// ============================================

function validateSendCodeRequest(req, res, next) {
  const { phone, name, institution, contactPhone, password } = req.body;
  const errors = [];

  // Validar y sanitizar nombre
  if (!name || !isValidName(name)) {
    errors.push('El nombre es requerido y debe tener entre 2 y 100 caracteres válidos');
  } else {
    req.body.name = sanitizeString(name);
  }

  // Validar y sanitizar institución
  if (!institution || !isValidInstitution(institution)) {
    errors.push('La institución es requerida y debe tener entre 2 y 200 caracteres válidos');
  } else {
    req.body.institution = sanitizeString(institution);
  }

  // Validar teléfono de contacto
  if (!contactPhone || !isValidPhone(contactPhone)) {
    errors.push('El teléfono de contacto es requerido y debe tener un formato válido');
  } else {
    req.body.contactPhone = contactPhone.trim();
  }

  // Validar teléfono WhatsApp
  if (!phone || !isValidPhone(phone)) {
    errors.push('El teléfono WhatsApp es requerido y debe tener un formato válido');
  } else {
    req.body.phone = phone.trim();
  }

  // Validar contraseña
  if (!password || !isValidPassword(password)) {
    errors.push('La contraseña debe tener al menos 8 caracteres, incluir letras, números y caracteres especiales');
  }

  if (errors.length > 0) {
    return sendErrorResponse(res, 400, 'Error de validación', errors);
  }

  next();
}

// ============================================
// VALIDACIÓN DE REQUEST: verify-code
// ============================================

function validateVerifyCodeRequest(req, res, next) {
  const { idLead, codeEscritoPorElUsuario } = req.body;
  const errors = [];

  // Validar idLead (debe ser un número)
  if (!idLead) {
    errors.push('El idLead es requerido');
  } else if (typeof idLead !== 'number' && isNaN(Number(idLead))) {
    errors.push('El idLead debe ser un número válido');
  } else {
    req.body.idLead = Number(idLead);
  }

  // Validar código
  if (!codeEscritoPorElUsuario || !isValidCode(codeEscritoPorElUsuario)) {
    errors.push('El código de verificación debe ser de 5 dígitos');
  } else {
    req.body.codeEscritoPorElUsuario = codeEscritoPorElUsuario.trim();
  }

  if (errors.length > 0) {
    return sendErrorResponse(res, 400, 'Error de validación', errors);
  }

  next();
}

// ============================================
// MANEJO DE ERRORES CONSISTENTE
// ============================================

/**
 * Envía respuesta de error estandarizada
 */
function sendErrorResponse(res, statusCode, message, details = null) {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  // Incluir detalles solo si no estamos en producción (para seguridad)
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = Array.isArray(details) ? details : [details];
  }

  return res.status(statusCode).json(response);
}

/**
 * Maneja errores de axios de forma consistente
 */
function handleAxiosError(error, defaultMessage) {
  if (error.response) {
    // El servidor respondió con un código de estado fuera del rango 2xx
    return {
      status: error.response.status,
      message: error.response.data?.error || error.response.data?.message || defaultMessage,
      details: error.response.data
    };
  } else if (error.request) {
    // La petición fue hecha pero no se recibió respuesta
    return {
      status: 503,
      message: 'El backend no está disponible',
      details: 'Servicio temporalmente no disponible'
    };
  } else {
    // Algo pasó al configurar la petición
    return {
      status: 500,
      message: defaultMessage,
      details: error.message
    };
  }
}

/**
 * Logging consistente de errores
 */
function logError(context, error, additionalInfo = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    context,
    error: error.message || error,
    ...additionalInfo
  };

  if (error.stack && process.env.NODE_ENV !== 'production') {
    logData.stack = error.stack;
  }

  console.error(`[ERROR] ${context}:`, JSON.stringify(logData, null, 2));
}

// ============================================
// FUNCIONES DE BACKEND
// ============================================

// Función para verificar si el backend está disponible
async function checkBackendHealth() {
  try {
    await axios.get(`${BACKEND_URL}/health`, { timeout: 2000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Función para simular respuesta de envío de código (modo desarrollo)
function simulateSendCode() {
  return {
    success: true,
    message: 'Código enviado exitosamente (modo desarrollo)',
    code: '12345' // Código fijo para pruebas
  };
}

// Función para simular verificación de código (modo desarrollo)
function simulateVerifyCode(code, phone) {
  if (code === '12345') {
    return {
      success: true,
      message: 'Código verificado exitosamente (modo desarrollo)',
      user: {
        name: 'Usuario de Prueba',
        phone: phone
      }
    };
  } else {
    return {
      success: false,
      error: 'Código incorrecto'
    };
  }
}

// ============================================
// RUTAS API
// ============================================

app.post('/api/send-code', validateSendCodeRequest, async (req, res) => {
  try {
    const { phone, name, institution, contactPhone, password } = req.body;

    console.log('phone', phone);
    console.log('name', name);
    console.log('institution', institution);
    console.log('contactPhone', contactPhone);
    console.log('password', password);
    
    // Verificar si el backend está disponible
    const backendAvailable = await checkBackendHealth();
    
    if (!backendAvailable) {
      logError('send-code', new Error('Backend no disponible'), { mode: 'development' });
      return res.json(simulateSendCode());
    }
    
    // Datos sanitizados ya están en req.body gracias al middleware
    const response = await axios.post(`${BACKEND_URL}/api/send-code`, {
      phone,
      name,
      institution,
      contactPhone,
      password // El backend debe manejar el hash
    }, {
      timeout: 20000,
      validateStatus: (status) => status >= 200 && status < 600 // Aceptar todos los códigos de respuesta
    });

    // Si la respuesta es exitosa (2xx), responder normalmente
    if (response.status >= 200 && response.status < 300) {
      return res.json(response.data);
    }
    
    // Si es un error del cliente (4xx), pasar la respuesta al frontend
    if (response.status >= 400 && response.status < 500) {
      return res.status(response.status).json(response.data);
    }
    
    // Si es un error del servidor (5xx), loguear y responder con error apropiado
    if (response.status >= 500) {
      logError('send-code', new Error(`Backend error ${response.status}`), { 
        backendError: true, 
        backendStatus: response.status,
        backendData: response.data,
        requestBody: { phone, name: name?.substring(0, 10) + '...' } 
      });
      
      return sendErrorResponse(
        res, 
        502, // Bad Gateway - el backend tiene un problema
        response.data?.error || response.data?.message || 'Error interno del backend',
        response.data
      );
    }
  } catch (error) {
    const errorInfo = handleAxiosError(error, 'Error al enviar código');
    
    // Si es error de conexión, simular respuesta para desarrollo
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      logError('send-code', error, { mode: 'development', action: 'simulating' });
      return res.json(simulateSendCode());
    }

    // Acceder a los valores desde req.body ya que pueden no estar disponibles en el catch
    const phone = req.body?.phone;
    const name = req.body?.name;
    logError('send-code', error, { requestBody: { phone, name: name?.substring(0, 10) + '...' } });
    sendErrorResponse(res, errorInfo.status || 500, errorInfo.message, errorInfo.details);
  }
});

app.post('/api/verify-code', validateVerifyCodeRequest, async (req, res) => {
  try {
    const { idLead, codeEscritoPorElUsuario } = req.body;
    
    // Verificar si el backend está disponible
    const backendAvailable = await checkBackendHealth();
    
    if (!backendAvailable) {
      logError('verify-code', new Error('Backend no disponible'), { mode: 'development' });
      // Simular verificación para desarrollo
      const result = {
        status: 'ok',
        message: 'Código verificado exitosamente (modo desarrollo)',
        verified: codeEscritoPorElUsuario === '12345'
      };
      
      if (result.verified) {
        return res.json(result);
      } else {
        return sendErrorResponse(res, 200, 'Código incorrecto', {
          status: 'error',
          message: 'Código incorrecto',
          verified: false
        });
      }
    }
    
    // Datos sanitizados ya están en req.body gracias al middleware
    const response = await axios.post(`${BACKEND_URL}/api/verify-code`, {
      idLead,
      codeEscritoPorElUsuario
    }, {
      timeout: 20000,
      validateStatus: (status) => status >= 200 && status < 600 // Aceptar todos los códigos de respuesta
    });

    // Si la respuesta es exitosa (2xx), responder normalmente
    if (response.status >= 200 && response.status < 300) {
      return res.json(response.data);
    }
    
    // Si es un error del cliente (4xx), pasar la respuesta al frontend
    if (response.status >= 400 && response.status < 500) {
      return res.status(response.status).json(response.data);
    }
    
    // Si es un error del servidor (5xx), loguear y responder con error apropiado
    if (response.status >= 500) {
      logError('verify-code', new Error(`Backend error ${response.status}`), { 
        backendError: true, 
        backendStatus: response.status,
        backendData: response.data,
        requestBody: { phone, code: '***' } 
      });
      
      return sendErrorResponse(
        res, 
        502, // Bad Gateway - el backend tiene un problema
        response.data?.error || response.data?.message || 'Error interno del backend',
        response.data
      );
    }
  } catch (error) {
    const errorInfo = handleAxiosError(error, 'Error al verificar código');
    
    // Si es error de conexión, simular respuesta para desarrollo
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      logError('verify-code', error, { mode: 'development', action: 'simulating' });
      const code = req.body?.codeEscritoPorElUsuario;
      const result = {
        status: 'ok',
        message: 'Código verificado exitosamente (modo desarrollo)',
        verified: code === '12345'
      };
      
      if (result.verified) {
        return res.json(result);
      } else {
        return sendErrorResponse(res, 200, 'Código incorrecto', {
          status: 'error',
          message: 'Código incorrecto',
          verified: false
        });
      }
    }

    // Acceder a los valores desde req.body ya que pueden no estar disponibles en el catch
    const idLead = req.body?.idLead;
    const code = req.body?.codeEscritoPorElUsuario;
    logError('verify-code', error, { requestBody: { idLead, code: '***' } });
    sendErrorResponse(res, errorInfo.status || 500, errorInfo.message, errorInfo.details);
  }
});

// Ruta de estado del servidor
app.get('/api/status', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor frontend funcionando correctamente',
    timestamp: new Date().toISOString(),
    backend_url: BACKEND_URL,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Servir la aplicación SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
  logError('global-error-handler', err, { path: req.path, method: req.method });
  sendErrorResponse(res, 500, 'Error interno del servidor');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor frontend ejecutándose en http://localhost:${PORT}`);
  console.log(`📡 Backend configurado en: ${BACKEND_URL}`);
  console.log(`📊 Estado del servidor: http://localhost:${PORT}/api/status`);
  console.log(`🔒 Validación y sanitización activadas`);
});
