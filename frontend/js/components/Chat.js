import { messagesAPI } from '../api/messages.js';
import socketService from '../services/socketService.js';
import authService from '../services/authService.js';
import Notification from './Notification.js';
import { joinGroupRoom, leaveGroupRoom } from '../utils/socketHelpers.js';
import { formatDate, formatTime } from '../utils/helpers.js';

/**
 * Componente de Chat para Grupos
 * Permite chatear con los miembros de un grupo
 */
class Chat {
  constructor() {
    this.currentGroupId = null;
    this.messages = [];
    this.groups = [];
    this.messageListeners = [];
  }

  /**
   * Renderiza el componente de chat
   * @param {Array} groups - Lista de grupos del usuario
   * @param {string} containerId - ID del contenedor donde se renderizará
   */
  async render(groups = [], containerId = 'chat-container') {
    this.groups = groups || [];
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Chat: Contenedor con ID "${containerId}" no encontrado`);
      return;
    }

    console.log('Chat: Renderizando con grupos', this.groups.length);

    // Si no hay grupos, mostrar mensaje
    if (this.groups.length === 0) {
      container.innerHTML = `
        <div class="chat-empty">
          <p class="text-muted">No estás en ningún grupo. Únete a un grupo para comenzar a chatear.</p>
        </div>
      `;
      return;
    }

    // Validar que los grupos tengan ID
    const validGroups = this.groups.filter(g => g && g.id);
    if (validGroups.length === 0) {
      container.innerHTML = `
        <div class="chat-error">
          <p class="text-danger">Error: Los grupos no tienen IDs válidos</p>
        </div>
      `;
      console.error('Chat: Grupos sin IDs válidos', this.groups);
      return;
    }

    this.groups = validGroups;

    // Seleccionar el primer grupo por defecto
    const defaultGroup = this.groups[0];
    this.currentGroupId = defaultGroup.id;

    console.log('Chat: Grupo seleccionado', this.currentGroupId, defaultGroup.nombre);

    // Renderizar el HTML del chat
    container.innerHTML = this.getChatHTML();

    // Configurar eventos
    this.setupEventListeners();

    // Cargar mensajes del grupo seleccionado
    await this.loadMessages(this.currentGroupId);

    // Unirse al room de Socket.IO para recibir mensajes en tiempo real
    this.setupSocketListeners();
    joinGroupRoom(this.currentGroupId);
  }

  /**
   * Genera el HTML del chat
   */
  getChatHTML() {
    const currentGroup = this.groups.find(g => g.id === this.currentGroupId);
    
    return `
      <div class="chat-wrapper">
        <!-- Selector de grupos (si hay más de uno) -->
        ${this.groups.length > 1 ? `
          <div class="chat-group-selector">
            <label for="chat-group-select">Grupo:</label>
            <select id="chat-group-select" class="form-select">
              ${this.groups.map(group => `
                <option value="${group.id}" ${group.id === this.currentGroupId ? 'selected' : ''}>
                  ${group.nombre}
                </option>
              `).join('')}
            </select>
          </div>
        ` : ''}
        
        <!-- Área de mensajes -->
        <div class="chat-messages" id="chat-messages-container">
          <div class="chat-loading">
            <div class="spinner"></div>
            <p>Cargando mensajes...</p>
          </div>
        </div>
        
        <!-- Área de envío de mensajes -->
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <input 
              type="text" 
              id="chat-message-input" 
              class="form-input chat-input" 
              placeholder="Escribe un mensaje..."
              maxlength="500"
            />
            <button id="chat-send-btn" class="btn btn-primary">
              Enviar
            </button>
          </div>
          <small class="text-muted">Grupo: ${currentGroup?.nombre || 'N/A'}</small>
        </div>
      </div>
    `;
  }

  /**
   * Configura los event listeners del chat
   */
  setupEventListeners() {
    // Selector de grupos
    const groupSelect = document.getElementById('chat-group-select');
    if (groupSelect) {
      groupSelect.addEventListener('change', async (e) => {
        const newGroupId = parseInt(e.target.value, 10);
        await this.switchGroup(newGroupId);
      });
    }

    // Botón de enviar
    const sendBtn = document.getElementById('chat-send-btn');
    const messageInput = document.getElementById('chat-message-input');

    if (sendBtn && messageInput) {
      // Enviar con botón
      sendBtn.addEventListener('click', () => this.sendMessage());

      // Enviar con Enter
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  }

  /**
   * Cambia de grupo y carga sus mensajes
   */
  async switchGroup(newGroupId) {
    if (this.currentGroupId === newGroupId) return;

    // Salir del room anterior
    if (this.currentGroupId) {
      leaveGroupRoom(this.currentGroupId);
    }

    // Actualizar grupo actual
    this.currentGroupId = newGroupId;

    // Unirse al nuevo room
    joinGroupRoom(newGroupId);

    // Cargar mensajes del nuevo grupo
    await this.loadMessages(newGroupId);

    // Actualizar el selector visualmente
    const groupSelect = document.getElementById('chat-group-select');
    if (groupSelect) {
      groupSelect.value = newGroupId;
    }

    // Actualizar el nombre del grupo en el input
    const currentGroup = this.groups.find(g => g.id === newGroupId);
    const smallText = document.querySelector('.chat-input-area small');
    if (smallText && currentGroup) {
      smallText.textContent = `Grupo: ${currentGroup.nombre}`;
    }
  }

  /**
   * Carga los mensajes de un grupo
   */
  async loadMessages(groupId) {
    const messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) {
      console.error('Chat: Contenedor de mensajes no encontrado');
      return;
    }

    if (!groupId) {
      console.error('Chat: groupId no válido', groupId);
      messagesContainer.innerHTML = `
        <div class="chat-error">
          <p class="text-danger">Error: ID de grupo no válido</p>
        </div>
      `;
      return;
    }

    try {
      // Mostrar loading
      messagesContainer.innerHTML = `
        <div class="chat-loading">
          <div class="spinner"></div>
          <p>Cargando mensajes...</p>
        </div>
      `;

      console.log('Chat: Cargando mensajes del grupo', groupId);
      
      // Obtener mensajes del API
      const response = await messagesAPI.getByGroup(groupId);
      
      console.log('Chat: Respuesta del API', response);
      
      if (response && response.success) {
        this.messages = response.data || [];
        console.log('Chat: Mensajes cargados', this.messages.length);
        this.renderMessages();
      } else {
        const errorMessage = response?.message || 'Error al cargar mensajes';
        console.error('Chat: Error en respuesta', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Chat: Error al cargar mensajes:', error);
      
      let errorMessage = 'Error al cargar mensajes';
      
      // Mensajes de error más específicos
      if (error.response) {
        // Error de respuesta HTTP
        const status = error.response.status;
        if (status === 401) {
          errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente.';
        } else if (status === 403) {
          errorMessage = 'No tienes acceso a este grupo.';
        } else if (status === 404) {
          errorMessage = 'Grupo no encontrado.';
        } else if (status === 500) {
          errorMessage = 'Error del servidor. Intenta más tarde.';
        } else {
          errorMessage = error.response.data?.message || `Error ${status}: ${error.response.statusText}`;
        }
      } else if (error.request) {
        // Error de red
        errorMessage = 'Error de conexión. Verifica tu internet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      messagesContainer.innerHTML = `
        <div class="chat-error">
          <p class="text-danger">${errorMessage}</p>
          <button class="btn btn-secondary btn-sm mt-2" onclick="location.reload()">Recargar página</button>
        </div>
      `;
      
      Notification.error(errorMessage);
    }
  }

  /**
   * Renderiza los mensajes en el contenedor
   */
  renderMessages() {
    const messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) return;

    if (this.messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="chat-empty">
          <p class="text-muted">No hay mensajes aún. ¡Sé el primero en escribir!</p>
        </div>
      `;
      return;
    }

    const currentUser = authService.getCurrentUser();
    const currentUserId = currentUser?.id;

    // Renderizar mensajes
    messagesContainer.innerHTML = this.messages.map(message => {
      const isOwnMessage = message.senderId === currentUserId;
      const messageDate = new Date(message.createdAt);
      const isToday = messageDate.toDateString() === new Date().toDateString();
      
      return `
        <div class="chat-message ${isOwnMessage ? 'chat-message--own' : ''}">
          <div class="chat-message__header">
            <span class="chat-message__sender">${message.senderName || 'Usuario'}</span>
            <span class="chat-message__time">
              ${isToday ? formatTime(messageDate) : formatDate(messageDate) + ' ' + formatTime(messageDate)}
            </span>
          </div>
          <div class="chat-message__content">
            ${this.escapeHtml(message.content)}
          </div>
        </div>
      `;
    }).join('');

    // Hacer scroll al final
    this.scrollToBottom();
  }

  /**
   * Envía un mensaje
   */
  async sendMessage() {
    const messageInput = document.getElementById('chat-message-input');
    if (!messageInput || !this.currentGroupId) return;

    const content = messageInput.value.trim();
    if (!content) return;

    // Deshabilitar input mientras se envía
    messageInput.disabled = true;
    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const response = await messagesAPI.create({
        groupId: this.currentGroupId,
        content: content,
        tipo: 'texto'
      });

      if (response.success) {
        // Limpiar input
        messageInput.value = '';
        // El mensaje se agregará automáticamente vía Socket.IO
      } else {
        throw new Error(response.message || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      Notification.error('Error al enviar mensaje. Intenta nuevamente.');
    } finally {
      // Rehabilitar input
      messageInput.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      messageInput.focus();
    }
  }

  /**
   * Configura los listeners de Socket.IO para recibir mensajes en tiempo real
   */
  setupSocketListeners() {
    // Remover listeners anteriores si existen
    this.messageListeners.forEach(listener => {
      socketService.off('new_message');
    });
    this.messageListeners = [];

    // Listener para nuevos mensajes
    const newMessageListener = (message) => {
      // Solo agregar si es del grupo actual
      if (message.groupId === this.currentGroupId) {
        this.addMessage(message);
      }
    };

    socketService.on('new_message', newMessageListener);
    this.messageListeners.push({ event: 'new_message', listener: newMessageListener });

    // Listener para mensajes eliminados
    const deletedMessageListener = (data) => {
      if (data.groupId === this.currentGroupId) {
        this.removeMessage(data.messageId);
      }
    };

    socketService.on('message_deleted', deletedMessageListener);
    this.messageListeners.push({ event: 'message_deleted', listener: deletedMessageListener });
  }

  /**
   * Agrega un mensaje nuevo a la lista (desde Socket.IO)
   */
  addMessage(message) {
    // Verificar si el mensaje ya existe (evitar duplicados)
    const exists = this.messages.some(m => m.id === message.id);
    if (exists) return;

    this.messages.push(message);
    this.renderMessages();
  }

  /**
   * Elimina un mensaje de la lista
   */
  removeMessage(messageId) {
    this.messages = this.messages.filter(m => m.id !== messageId);
    this.renderMessages();
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
   * Escapa HTML para prevenir XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Limpia el componente (remueve listeners, etc.)
   */
  destroy() {
    // Salir de todos los rooms
    if (this.currentGroupId) {
      leaveGroupRoom(this.currentGroupId);
    }

    // Remover listeners de Socket.IO
    this.messageListeners.forEach(({ event, listener }) => {
      socketService.off(event);
    });
    this.messageListeners = [];

    // Limpiar datos
    this.currentGroupId = null;
    this.messages = [];
  }
}

export default new Chat();

