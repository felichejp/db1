import { messagesAPI } from '../api/messages.js';
import socketService from '../services/socketService.js';
import authService from '../services/authService.js';
import { joinGroupRoom, leaveGroupRoom } from '../utils/socketHelpers.js';

/**
 * Componente de Chat para Grupos
 */
class Chat {
  constructor() {
    this.activeGroupId = null;
    this.messagesByGroup = new Map();
    this.userColors = new Map();
    this.currentUser = null;
  }

  /**
   * Renderizar el componente de chat
   */
  render(groups, containerId = 'chat-container') {
    this.currentUser = authService.getCurrentUser();
    
    if (!this.currentUser || !groups || groups.length === 0) {
      return '';
    }

    // Solo mostrar para Estudiante, Profesor y Tutor
    const allowedRoles = ['Estudiante', 'Profesor', 'Tutor'];
    if (!allowedRoles.includes(this.currentUser.role)) {
      return '';
    }

    // Asegurar conexión a socket
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    // Unirse a los rooms de los grupos
    groups.forEach(group => {
      joinGroupRoom(group.id);
    });

    // Escuchar mensajes nuevos
    socketService.on('new_message', (message) => {
      this.handleNewMessage(message);
    });

    return `
      <div class="chat-section mt-4">
        <h2>Chat de Grupos</h2>
        <div class="chat-container" id="${containerId}">
          <div class="chat-groups-list">
            ${groups.map((group, index) => `
              <div class="chat-group-tab ${index === 0 ? 'active' : ''}" 
                   data-group-id="${group.id}"
                   onclick="window.chatComponent.selectGroup(${group.id})">
                <div class="chat-group-tab-name">${group.nombre}</div>
              </div>
            `).join('')}
          </div>
          <div class="chat-main">
            ${groups.map((group, index) => `
              <div class="chat-window ${index === 0 ? 'active' : ''}" 
                   data-group-id="${group.id}"
                   id="chat-window-${group.id}">
                <div class="chat-header">
                  <h3 class="chat-group-title">${group.nombre}</h3>
                  <p class="chat-group-description">${group.descripcion || 'Sin descripción'}</p>
                </div>
                <div class="chat-messages" id="chat-messages-${group.id}">
                  <div class="spinner"></div>
                </div>
                <div class="chat-input-container">
                  <input 
                    type="text" 
                    class="chat-input" 
                    id="chat-input-${group.id}"
                    placeholder="Escribe un mensaje..."
                    onkeypress="if(event.key==='Enter') window.chatComponent.sendMessage(${group.id})"
                  />
                  <button 
                    class="btn btn-primary btn-sm chat-send-btn"
                    onclick="window.chatComponent.sendMessage(${group.id})"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Seleccionar un grupo
   */
  selectGroup(groupId) {
    this.activeGroupId = groupId;

    // Actualizar tabs
    document.querySelectorAll('.chat-group-tab').forEach(tab => {
      if (parseInt(tab.getAttribute('data-group-id'), 10) === groupId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Actualizar ventanas
    document.querySelectorAll('.chat-window').forEach(window => {
      if (parseInt(window.getAttribute('data-group-id'), 10) === groupId) {
        window.classList.add('active');
      } else {
        window.classList.remove('active');
      }
    });

    // Cargar mensajes si no se han cargado
    if (!this.messagesByGroup.has(groupId)) {
      this.loadMessages(groupId);
    }
  }

  /**
   * Cargar mensajes de un grupo
   */
  async loadMessages(groupId) {
    const messagesContainer = document.getElementById(`chat-messages-${groupId}`);
    
    if (!messagesContainer) return;

    try {
      const response = await messagesAPI.getByGroup(groupId);
      
      if (response.success && response.data) {
        this.messagesByGroup.set(groupId, response.data);
        this.renderMessages(groupId, response.data);
      } else {
        this.messagesByGroup.set(groupId, []);
        messagesContainer.innerHTML = '<p class="text-muted">No hay mensajes aún</p>';
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      messagesContainer.innerHTML = '<p class="text-muted">Error al cargar mensajes</p>';
    }
  }

  /**
   * Renderizar mensajes
   */
  renderMessages(groupId, messages) {
    const messagesContainer = document.getElementById(`chat-messages-${groupId}`);
    
    if (!messagesContainer) return;

    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = '<p class="text-muted">No hay mensajes aún</p>';
      return;
    }

    // Obtener colores para cada usuario
    messages.forEach(msg => {
      if (!this.userColors.has(msg.senderId)) {
        this.userColors.set(msg.senderId, this.getUserColor(msg.senderId));
      }
    });

    messagesContainer.innerHTML = messages.map(msg => {
      const isOwnMessage = msg.senderId === this.currentUser.userId;
      const senderName = msg.senderName || msg.senderEmail || 'Usuario';
      const userColor = this.userColors.get(msg.senderId);
      const messageDate = new Date(msg.createdAt);
      const timeStr = messageDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const dateStr = messageDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      
      return `
        <div class="chat-message ${isOwnMessage ? 'own-message' : ''}">
          <div class="chat-message-header" style="color: ${userColor}">
            ${senderName}
          </div>
          <div class="chat-message-body">
            ${this.escapeHtml(msg.content)}
          </div>
          <div class="chat-message-time">
            ${timeStr} ${dateStr}
          </div>
        </div>
      `;
    }).join('');

    // Scroll al final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Manejar nuevo mensaje recibido por socket
   */
  handleNewMessage(message) {
    const groupId = message.groupId;
    
    if (!this.messagesByGroup.has(groupId)) {
      this.messagesByGroup.set(groupId, []);
    }

    const messages = this.messagesByGroup.get(groupId);
    messages.push(message);
    this.messagesByGroup.set(groupId, messages);

    // Si es el grupo activo, renderizar
    if (this.activeGroupId === groupId) {
      this.renderMessages(groupId, messages);
    }
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(groupId) {
    const input = document.getElementById(`chat-input-${groupId}`);
    const content = input?.value?.trim();

    if (!content) return;

    try {
      const response = await messagesAPI.create({
        groupId: groupId,
        content: content,
        tipo: 'texto'
      });

      if (response.success) {
        input.value = '';
        // El mensaje se recibirá por socket y se renderizará automáticamente
      } else {
        console.error('Error al enviar mensaje:', response.message);
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  }

  /**
   * Obtener color único para un usuario
   */
  getUserColor(userId) {
    const colors = [
      '#4fc3f7', '#81c784', '#ffb74d', '#ba68c8', 
      '#f06292', '#4dd0e1', '#aed581', '#ffd54f',
      '#90caf9', '#ce93d8', '#ffccbc', '#b2dfdb'
    ];
    
    return colors[userId % colors.length];
  }

  /**
   * Escapar HTML para prevenir XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Limpiar listeners al destruir
   */
  destroy() {
    socketService.off('new_message');
    this.messagesByGroup.clear();
    this.userColors.clear();
  }
}

// Crear instancia global para acceso desde HTML
window.chatComponent = new Chat();

export default window.chatComponent;

