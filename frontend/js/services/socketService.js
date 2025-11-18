import authService from './authService.js';

/**
 * Servicio para manejar Socket.IO
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  /**
   * Conecta al servidor Socket.IO
   */
  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = authService.getToken();
    if (!token) {
      console.warn('No hay token para conectar Socket.IO');
      return null;
    }

    const socketPath = window.SOCKET_IO_PATH || '/socket.io';
    const apiUrl = window.API_BASE_URL || 'http://localhost:3000';

    this.socket = io(apiUrl, {
      path: socketPath,
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO conectado');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket.IO desconectado');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error conectando Socket.IO:', error);
    });

    // Re-registrar listeners existentes
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });

    return this.socket;
  }

  /**
   * Desconecta del servidor
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * Escucha un evento
   */
  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Deja de escuchar un evento
   */
  off(event) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  /**
   * Emite un evento
   */
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Se une a un room de grupo
   */
  joinGroup(groupId) {
    this.emit('join_group', groupId);
  }

  /**
   * Sale de un room de grupo
   */
  leaveGroup(groupId) {
    this.emit('leave_group', groupId);
  }
}

export default new SocketService();


