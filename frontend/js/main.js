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
    if (error.response?.status === 401) {
      // Token expirado o inválido
      authService.logout();
      if (window.location.hash !== '#/login') {
        Notification.error('Sesión expirada. Por favor, inicia sesión nuevamente');
        window.location.hash = '#/login';
      }
    } else if (error.response?.status === 403) {
      Notification.error('No tienes permisos para realizar esta acción');
    } else if (error.response?.status >= 500) {
      Notification.error('Error del servidor. Por favor, intenta más tarde');
    }

    return Promise.reject(error);
  }
);

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplicación iniciada');

  // Verificar autenticación al cargar
  if (authService.isAuthenticated()) {
    // Verificar token
    authService.verifyToken().then((isValid) => {
      if (!isValid) {
        authService.logout();
        window.location.hash = '#/login';
      } else {
        // Conectar Socket.IO
        socketService.connect();

        // Configurar listeners de Socket.IO
        socketService.on('notification', (data) => {
          Notification.info(data.data?.mensaje || 'Nueva notificación');
        });

        socketService.on('new_message', (data) => {
          Notification.info('Nuevo mensaje en grupo');
        });

        socketService.on('session_reminder', (data) => {
          Notification.warning('Recordatorio: Tienes una sesión próxima');
        });

        socketService.on('group_invitation', (data) => {
          Notification.info('Nueva invitación a grupo');
        });
      }
    });
  }

  // El router ya maneja la ruta inicial
});

// Limpiar al cerrar
window.addEventListener('beforeunload', () => {
  socketService.disconnect();
});

