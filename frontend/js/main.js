import router from './router.js';
import authService from './services/authService.js';
import socketService from './services/socketService.js';
import Notification from './components/Notification.js';

// Configurar API base URL
window.API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
window.SOCKET_IO_PATH = window.SOCKET_IO_PATH || '/socket.io';

// Configurar interceptor de axios
axios.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuestas para manejar errores
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // No cerrar sesión si estamos en la ruta de login o register
    const currentHash = window.location.hash;
    const isAuthRoute = currentHash === '#/login' || currentHash === '#/register';
    
    if (error.response?.status === 401) {
      // Token expirado o inválido
      // Solo cerrar sesión si no estamos en una ruta de autenticación
      if (!isAuthRoute) {
        authService.logout();
        Notification.error('Sesión expirada. Por favor, inicia sesión nuevamente');
        window.location.hash = '#/login';
      }
    } else if (error.response?.status === 403) {
      Notification.error('No tienes permisos para realizar esta acción');
    } else if (error.response?.status >= 500) {
      Notification.error('Error del servidor. Por favor, intenta más tarde');
    } else if (!error.response) {
      // Error de red (sin respuesta del servidor)
      // No mostrar error si es un error de red común, solo loguear
      console.warn('Error de red:', error.message);
    }

    return Promise.reject(error);
  }
);

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Aplicación iniciada');

  // Verificar autenticación al cargar
  if (authService.isAuthenticated()) {
    try {
      // Verificar token y refrescar información del usuario
      const isValid = await authService.verifyToken();
      
      if (!isValid) {
        // Si el token no es válido, intentar refrescar el usuario
        const refreshed = await authService.refreshUser();
        
        if (!refreshed) {
          // Si tampoco funciona, cerrar sesión
          authService.logout();
          if (window.location.hash !== '#/login' && window.location.hash !== '#/register') {
            window.location.hash = '#/login';
          }
          return;
        }
      } else {
        // Si el token es válido, refrescar información del usuario para asegurar que esté actualizada
        await authService.refreshUser();
      }

      // Conectar Socket.IO
      socketService.connect();

      // Configurar listeners de Socket.IO
      socketService.on('notification', (data) => {
        const notificationData = data.data || data;
        Notification.info(notificationData.mensaje || notificationData.message || 'Nueva notificación');
      });

      socketService.on('new_message', (data) => {
        // Solo mostrar notificación si no estás en la vista del grupo
        const currentHash = window.location.hash;
        if (!currentHash.includes('/groups/')) {
          Notification.info('Nuevo mensaje en grupo');
        }
      });

      socketService.on('session_reminder', (data) => {
        Notification.warning('Recordatorio: Tienes una sesión próxima');
      });

      socketService.on('group_invitation', (data) => {
        Notification.info('Nueva invitación a grupo');
      });
    } catch (error) {
      console.error('Error inicializando aplicación:', error);
      // Si hay un error de red, mantener la sesión local si existe
      // Solo cerrar sesión si es un error 401
      if (error.response?.status === 401) {
        authService.logout();
        if (window.location.hash !== '#/login' && window.location.hash !== '#/register') {
          window.location.hash = '#/login';
        }
      }
    }
  }

  // El router ya maneja la ruta inicial
});

// Limpiar al cerrar
window.addEventListener('beforeunload', () => {
  socketService.disconnect();
});

