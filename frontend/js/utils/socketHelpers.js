import socketService from '../services/socketService.js';

/**
 * Utilidad para unirse automáticamente a rooms de grupos
 * Úsalo en las vistas que muestren grupos para recibir eventos en tiempo real
 */
export async function joinGroupRooms(groups) {
  if (!Array.isArray(groups)) {
    console.warn('joinGroupRooms: groups debe ser un array');
    return;
  }

  if (!socketService.isConnected()) {
    console.warn('Socket.IO no está conectado. Intentando conectar...');
    socketService.connect();
    
    // Esperar a que se conecte
    return new Promise((resolve) => {
      const checkConnection = setInterval(() => {
        if (socketService.isConnected()) {
          clearInterval(checkConnection);
          joinGroups();
          resolve();
        }
      }, 100);

      // Timeout después de 5 segundos
      setTimeout(() => {
        clearInterval(checkConnection);
        console.error('No se pudo conectar a Socket.IO');
        resolve();
      }, 5000);
    });
  }

  joinGroups();

  function joinGroups() {
    groups.forEach(group => {
      if (group && group.id) {
        socketService.joinGroup(group.id);
        console.log(`Unido al room del grupo ${group.id}`);
      }
    });
  }
}

/**
 * Salir de rooms de grupos
 */
export function leaveGroupRooms(groups) {
  if (!Array.isArray(groups)) {
    return;
  }

  groups.forEach(group => {
    if (group && group.id) {
      socketService.leaveGroup(group.id);
      console.log(`Salido del room del grupo ${group.id}`);
    }
  });
}

/**
 * Unirse a un solo grupo
 */
export function joinGroupRoom(groupId) {
  if (!groupId) {
    console.warn('joinGroupRoom: groupId es requerido');
    return;
  }

  if (!socketService.isConnected()) {
    socketService.connect();
    // Esperar a que se conecte y luego unirse
    setTimeout(() => {
      if (socketService.isConnected()) {
        socketService.joinGroup(groupId);
      }
    }, 500);
    return;
  }

  socketService.joinGroup(groupId);
}

/**
 * Salir de un solo grupo
 */
export function leaveGroupRoom(groupId) {
  if (!groupId) {
    return;
  }

  socketService.leaveGroup(groupId);
}

/**
 * Unirse automáticamente a todos los grupos del usuario
 * Útil para el dashboard o vista principal
 */
export async function joinAllUserGroups() {
  try {
    const response = await axios.get(`${window.API_BASE_URL}/api/groups`);
    if (response.data.success && response.data.data) {
      await joinGroupRooms(response.data.data);
    }
  } catch (error) {
    console.error('Error al obtener grupos para unirse a rooms:', error);
  }
}

