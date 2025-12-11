import router from './router.js';
import authService from './services/authService.js';
import socketService from './services/socketService.js';
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { messagesAPI } from './api/messages.js';
import { groupsAPI } from './api/groups.js';
>>>>>>> origin/Juan_Nambo
=======
import { messagesAPI } from './api/messages.js';
import { groupsAPI } from './api/groups.js';
>>>>>>> origin/Juan_Nambo
import Notification from './components/Notification.js';

// Configurar API base URL
window.API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
window.SOCKET_IO_PATH = window.SOCKET_IO_PATH || '/socket.io';

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> origin/Juan_Nambo
// Exponer servicios globalmente para debugging (solo en desarrollo)
if (window.API_BASE_URL.includes('localhost')) {
  window.authService = authService;
  window.socketService = socketService;
  window.messagesAPI = messagesAPI;
  window.groupsAPI = groupsAPI;
  console.log('🔧 Servicios expuestos para debugging:');
  console.log('   - window.authService');
  console.log('   - window.socketService');
  console.log('   - window.messagesAPI');
  console.log('   - window.groupsAPI');
}

<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
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
<<<<<<< HEAD
<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', () => {
=======
document.addEventListener('DOMContentLoaded', async () => {
>>>>>>> origin/Juan_Nambo
=======
document.addEventListener('DOMContentLoaded', async () => {
>>>>>>> origin/Juan_Nambo
  console.log('Aplicación iniciada');

  // Verificar autenticación al cargar
  if (authService.isAuthenticated()) {
    // Verificar token
<<<<<<< HEAD
<<<<<<< HEAD
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

=======
=======
>>>>>>> origin/Juan_Nambo
    const isValid = await authService.verifyToken();
    if (!isValid) {
      console.log('Token inválido, cerrando sesión');
      authService.logout();
      window.location.hash = '#/login';
    } else {
      console.log('Token válido, conectando Socket.IO...');
      // Conectar Socket.IO
      socketService.connect();

        // Configurar listeners de Socket.IO
        
        // Manejo de errores
        socketService.on('error', (error) => {
          if (error.type === 'authorization_error') {
            Notification.error(error.message || 'No tienes acceso a este recurso');
          } else if (error.type === 'validation_error') {
            Notification.error(error.message || 'Datos inválidos');
          } else if (error.type === 'server_error') {
            Notification.error(error.message || 'Error del servidor');
          } else {
            Notification.error(error.message || 'Error en la conexión');
          }
        });

        // Notificaciones
        socketService.on('notification', (data) => {
          const notification = data.data || data;
          const message = notification.mensaje || notification.titulo || 'Nueva notificación';
          
          // Diferentes tipos de notificación según el tipo
          switch (notification.tipo) {
            case 'sesion_programada':
              Notification.info(`Sesión programada: ${message}`);
              break;
            case 'invitacion_grupo':
              Notification.info(`Invitación a grupo: ${message}`);
              break;
            case 'mensaje_nuevo':
              Notification.info(`Nuevo mensaje: ${message}`);
              break;
            case 'evaluacion_pendiente':
              Notification.warning(`Evaluación pendiente: ${message}`);
              break;
            default:
              Notification.info(message);
          }
        });

        // Mensajes
        socketService.on('new_message', (data) => {
          const message = data.data || data;
          Notification.info(`Nuevo mensaje de ${message.senderName || 'usuario'}`);
          // TODO: Actualizar vista de mensajes si está abierta
        });

        socketService.on('message_deleted', (data) => {
          // TODO: Actualizar vista de mensajes si está abierta
          console.log('Mensaje eliminado:', data);
        });

        // Sesiones
        socketService.on('session_updated', (data) => {
          const session = data.data || data;
          Notification.info(`Sesión actualizada: ${session.tema || 'Sin tema'}`);
          // TODO: Actualizar vista de sesiones si está abierta
        });

        socketService.on('session_deleted', (data) => {
          Notification.warning('Una sesión ha sido cancelada');
          // TODO: Actualizar vista de sesiones si está abierta
        });

        socketService.on('session_reminder', (data) => {
          const session = data.data || data;
          Notification.warning(`Recordatorio: Sesión próxima - ${session.tema || 'Sin tema'}`);
        });

        socketService.on('session_cancelled', (data) => {
          Notification.warning('Una sesión ha sido cancelada');
        });

        // Grupos
        socketService.on('group_updated', (data) => {
          const group = data.data || data;
          Notification.info(`Grupo actualizado: ${group.nombre || 'Grupo'}`);
          // TODO: Actualizar vista de grupos si está abierta
        });

        socketService.on('group_invitation', (data) => {
          const invitation = data.data || data;
          if (invitation.accepted) {
            Notification.success('Invitación aceptada');
          } else {
            Notification.info('Nueva invitación a grupo');
          }
          // TODO: Actualizar vista de invitaciones si está abierta
        });

        socketService.on('member_added', (data) => {
          const memberData = data.data || data;
          Notification.info('Nuevo miembro agregado al grupo');
          // TODO: Actualizar vista de miembros si está abierta
        });

        socketService.on('member_removed', (data) => {
          const memberData = data.data || data;
          Notification.warning('Un miembro ha sido eliminado del grupo');
          // TODO: Actualizar vista de miembros si está abierta
        });

        socketService.on('removed_from_group', (data) => {
          const removalData = data.data || data;
          Notification.error(`Has sido eliminado del grupo "${removalData.groupName || 'grupo'}"`);
          // TODO: Redirigir o actualizar vista
        });

        // Estado de conexión
        socketService.onConnectionChange((state) => {
          if (state === 'connected') {
            console.log('Socket.IO conectado');
          } else if (state === 'disconnected') {
            console.log('Socket.IO desconectado');
          } else if (state === 'error') {
            console.error('Error en Socket.IO');
          }
        });
      }
    } else {
      console.log('Usuario no autenticado');
    }
  
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
  // El router ya maneja la ruta inicial
});

// Limpiar al cerrar
window.addEventListener('beforeunload', () => {
  socketService.disconnect();
});

