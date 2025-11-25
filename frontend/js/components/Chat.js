import { messagesAPI } from '../api/messages.js';
import socketService from '../services/socketService.js';
import authService from '../services/authService.js';
import Loading from './Loading.js';
import Notification from './Notification.js';
import { formatDateTime, formatTime } from '../utils/helpers.js';

/**
 * Componente Chat reutilizable
 */
class Chat {
  constructor() {
    this.container = null;
    this.groupId = null;
    this.messages = [];
    this.isInitialized = false;
  }

  /**
   * Inicializa el chat para un grupo
   */
  async init(containerId, groupId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container con ID "${containerId}" no encontrado`);
      return;
    }

    this.groupId = groupId;
    this.messages = [];
    this.isInitialized = true;

    // Renderizar estructura del chat
    this.render();

    // Cargar mensajes existentes
    await this.loadMessages();

    // Configurar Socket.IO para recibir mensajes en tiempo real
    this.setupSocketListeners();

    // Unirse al room del grupo
    if (socketService.isConnected()) {
      socketService.joinGroup(groupId);
    } else {
      socketService.connect();
      // Esperar a que se conecte y luego unirse
      socketService.onConnectionChange((state) => {
        if (state === 'connected' && this.groupId) {
          socketService.joinGroup(this.groupId);
        }
      });
    }

    // Configurar event listeners
    this.attachEventListeners();
  }

  /**
   * Renderiza la estructura del chat
   */
  render() {
    const user = authService.getCurrentUser();
    
    this.container.innerHTML = `
      <div class="chat-container">
        <div class="chat-header">
          <h3 class="chat-title">💬 Chat del Grupo</h3>
          <div class="chat-status" id="chat-status">
            <span class="status-indicator" id="status-indicator"></span>
            <span id="status-text">Conectando...</span>
          </div>
        </div>
        
        <div class="chat-messages" id="chat-messages-container">
          <div class="chat-loading">
            <div class="spinner"></div>
            <p>Cargando mensajes...</p>
          </div>
        </div>
        
        <div class="chat-input-container">
          <form id="chat-form" class="chat-form">
            <input 
              type="text" 
              id="chat-message-input" 
              class="chat-input" 
              placeholder="Escribe un mensaje..." 
              autocomplete="off"
              maxlength="500"
            />
            <button type="submit" class="chat-send-btn" id="chat-send-btn">
              <span>📤</span> Enviar
            </button>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Carga los mensajes del grupo
   */
  async loadMessages() {
    if (!this.groupId) return;

    try {
      const response = await messagesAPI.getByGroup(this.groupId);
      
      if (response.success && response.data) {
        this.messages = Array.isArray(response.data) ? response.data : [];
        this.renderMessages();
      } else {
        this.messages = [];
        this.renderMessages();
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      this.messages = [];
      this.renderMessages();
      if (error.response?.status === 401) {
        authService.logout();
        window.location.hash = '#/login';
      }
    }
  }

  /**
   * Renderiza los mensajes
   */
  renderMessages() {
    const messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) return;

    if (this.messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="chat-empty">
          <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
        </div>
      `;
      return;
    }

    const user = authService.getCurrentUser();
    const messagesHTML = this.messages.map(message => {
      const isOwnMessage = message.remitenteId === user.id || message.usuarioId === user.id;
      const senderName = message.remitente?.nombre || message.usuario?.nombre || 'Usuario';
      const timestamp = message.fechaCreacion || message.createdAt;
      
      return `
        <div class="chat-message ${isOwnMessage ? 'chat-message--own' : ''}">
          <div class="chat-message__content">
            ${!isOwnMessage ? `
              <div class="chat-message__sender">${senderName}</div>
            ` : ''}
            <div class="chat-message__text">${this.escapeHtml(message.contenido || message.texto || '')}</div>
            <div class="chat-message__time">${this.formatMessageTime(timestamp)}</div>
          </div>
        </div>
      `;
    }).join('');

    messagesContainer.innerHTML = messagesHTML;
    
    // Scroll al final
    this.scrollToBottom();
  }

  /**
   * Formatea el tiempo del mensaje
   */
  formatMessageTime(timestamp) {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      
      return formatTime(date.toTimeString());
    } catch (error) {
      return '';
    }
  }

  /**
   * Escapa HTML para prevenir XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Configura los listeners de Socket.IO
   */
  setupSocketListeners() {
    // Escuchar nuevos mensajes
    socketService.on('new_message', (data) => {
      if (data.groupId === this.groupId) {
        this.addMessage(data);
      }
    });

    // Escuchar actualizaciones de estado de conexión
    socketService.onConnectionChange((state) => {
      this.updateConnectionStatus(state);
    });
  }

  /**
   * Agrega un mensaje al chat
   */
  addMessage(message) {
    // Verificar si el mensaje ya existe (evitar duplicados)
    const exists = this.messages.some(m => 
      m.id === message.id || 
      (m.contenido === message.contenido && m.fechaCreacion === message.fechaCreacion)
    );

    if (!exists) {
      this.messages.push(message);
      this.renderMessages();
    }
  }

  /**
   * Actualiza el estado de conexión
   */
  updateConnectionStatus(state) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    if (!statusIndicator || !statusText) return;

    switch (state) {
      case 'connected':
        statusIndicator.className = 'status-indicator status-indicator--online';
        statusText.textContent = 'En línea';
        break;
      case 'disconnected':
        statusIndicator.className = 'status-indicator status-indicator--offline';
        statusText.textContent = 'Desconectado';
        break;
      case 'error':
        statusIndicator.className = 'status-indicator status-indicator--error';
        statusText.textContent = 'Error de conexión';
        break;
      default:
        statusIndicator.className = 'status-indicator status-indicator--connecting';
        statusText.textContent = 'Conectando...';
    }
  }

  /**
   * Configura los event listeners del formulario
   */
  attachEventListeners() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-message-input');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.sendMessage();
      });
    }

    if (input) {
      // Enviar con Enter, nueva línea con Shift+Enter
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Auto-resize del textarea si fuera necesario
      input.addEventListener('input', () => {
        // Puedes agregar lógica de auto-resize aquí si cambias a textarea
      });
    }
  }

  /**
   * Envía un mensaje
   */
  async sendMessage() {
    const input = document.getElementById('chat-message-input');
    if (!input || !this.groupId) return;

    const content = input.value.trim();
    if (!content) return;

    // Deshabilitar input mientras se envía
    input.disabled = true;
    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const messageData = {
        grupoId: this.groupId,
        contenido: content
      };

      const response = await messagesAPI.create(messageData);

      if (response.success) {
        // Limpiar input
        input.value = '';
        
        // El mensaje se agregará automáticamente vía Socket.IO
        // Pero también lo agregamos localmente para feedback inmediato
        if (response.data) {
          this.addMessage(response.data);
        }
      } else {
        Notification.error(response.message || 'Error al enviar el mensaje');
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      Notification.error('Error al enviar el mensaje');
      
      if (error.response?.status === 401) {
        authService.logout();
        window.location.hash = '#/login';
      }
    } finally {
      // Rehabilitar input
      input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    }
  }

  /**
   * Hace scroll al final del chat
   */
  scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Limpia el chat (al salir de la vista)
   */
  cleanup() {
    if (this.groupId && socketService.isConnected()) {
      socketService.leaveGroup(this.groupId);
    }
    
    // Remover listeners de Socket.IO
    socketService.off('new_message');
    
    this.groupId = null;
    this.messages = [];
    this.isInitialized = false;
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

export default new Chat();

