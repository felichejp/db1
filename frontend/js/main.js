import router from './router.js';
import authService from './services/authService.js';
import socketService from './services/socketService.js';
import Notification from './components/Notification.js';
import Chat from './components/Chat.js';

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

// Bandera global para evitar inicializaciones múltiples
let chatInitialized = false;
let chatInitializing = false;

// Función para inicializar el chat cuando hay autenticación
async function initializeChatWithAuth() {
  // Evitar inicializaciones múltiples simultáneas
  if (chatInitialized || chatInitializing) {
    console.log('Chat ya inicializado o en proceso de inicialización');
    return chatInitialized;
  }

  const token = authService.getToken();
  if (!token) {
    // Solo crear la UI del chat, pero no cargar datos
    if (!document.getElementById('chat-container')) {
      Chat.createChatUI();
    }
    return false;
  }

  chatInitializing = true;

  try {
    // Verificar token antes de inicializar chat
    const isValid = await authService.verifyToken();
    if (!isValid) {
      if (!document.getElementById('chat-container')) {
        Chat.createChatUI();
      }
      chatInitializing = false;
      return false;
    }

    // Inicializar chat con autenticación solo si no está ya inicializado
    if (!chatInitialized) {
      await Chat.init();
      chatInitialized = true;
    }
    chatInitializing = false;
    return true;
  } catch (error) {
    console.error('Error inicializando chat:', error);
    if (!document.getElementById('chat-container')) {
      Chat.createChatUI();
    }
    chatInitializing = false;
    return false;
  }
}

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplicación iniciada');

  // Crear UI del chat siempre (pero sin datos si no hay token)
  if (!document.getElementById('chat-container')) {
    Chat.createChatUI();
  }

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

        // Inicializar chat con autenticación (solo una vez)
        if (!chatInitialized) {
          initializeChatWithAuth();
        }

        // Configurar listeners de Socket.IO (solo una vez)
        if (!socketService.hasListeners) {
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
          
          socketService.hasListeners = true;
        }
      }
    });
  }

  // El router ya maneja la ruta inicial
});

// Escuchar cambios de hash para inicializar chat después del login
window.addEventListener('hashchange', async () => {
  // Resetear bandera si el usuario navega al login
  if (window.location.hash === '#/login' || window.location.hash === '#/register') {
    chatInitialized = false;
    return;
  }

  // Si el usuario navega al dashboard y está autenticado, verificar chat
  // Pero solo inicializar si no está ya inicializado
  if (window.location.hash === '#/dashboard' && authService.isAuthenticated()) {
    const token = authService.getToken();
    if (token && !chatInitialized && !chatInitializing) {
      // Pequeño delay para asegurar que el token esté disponible
      setTimeout(async () => {
        try {
          await initializeChatWithAuth();
        } catch (error) {
          console.error('Error inicializando chat después del login:', error);
        }
      }, 200);
    }
  }
});

// Limpiar al cerrar
window.addEventListener('beforeunload', () => {
  socketService.disconnect();
});

// Exponer método de depuración del chat en la consola
window.debugChat = () => {
  return Chat.debugStatus();
};

