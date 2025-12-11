import authService from './authService.js';

/**
 * Servicio para manejar Socket.IO
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
<<<<<<< HEAD
=======
    this.connectionState = 'disconnected';
    this.connectionCallbacks = [];
>>>>>>> origin/Juan_Nambo
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
<<<<<<< HEAD
    });

    this.socket.on('disconnect', () => {
      console.log('Socket.IO desconectado');
=======
      this.connectionState = 'connected';
      this.notifyConnectionChange('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO desconectado:', reason);
      this.connectionState = 'disconnected';
      this.notifyConnectionChange('disconnected');
      
      // Intentar reconectar si fue desconexión inesperada
      if (reason === 'io server disconnect') {
        // El servidor forzó la desconexión, no reconectar
        return;
      }
      // Otras desconexiones pueden reconectar automáticamente
>>>>>>> origin/Juan_Nambo
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error conectando Socket.IO:', error);
<<<<<<< HEAD
=======
      this.connectionState = 'error';
      this.notifyConnectionChange('error');
    });

    // Manejar errores del servidor
    this.socket.on('error', (error) => {
      console.error('Error en Socket.IO:', error);
      if (error.type === 'authorization_error') {
        console.warn('Error de autorización en Socket.IO');
      }
    });

    // Eventos de confirmación
    this.socket.on('joined_group', (data) => {
      console.log('Unido al grupo:', data.groupId);
    });

    this.socket.on('left_group', (data) => {
      console.log('Salido del grupo:', data.groupId);
>>>>>>> origin/Juan_Nambo
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
<<<<<<< HEAD
=======

  /**
   * Obtiene el estado de la conexión
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Verifica si está conectado
   */
  isConnected() {
    return this.socket?.connected || false;
  }

  /**
   * Registra un callback para cambios de estado de conexión
   */
  onConnectionChange(callback) {
    this.connectionCallbacks.push(callback);
    // Llamar inmediatamente con el estado actual
    callback(this.connectionState);
  }

  /**
   * Notifica a todos los callbacks de cambio de estado
   */
  notifyConnectionChange(state) {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error en callback de conexión:', error);
      }
    });
  }
>>>>>>> origin/Juan_Nambo
}

export default new SocketService();


