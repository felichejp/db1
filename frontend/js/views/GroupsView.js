import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { messagesAPI } from '../api/messages.js';
import socketService from '../services/socketService.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime } from '../utils/helpers.js';
import { joinGroupRoom, leaveGroupRoom } from '../utils/socketHelpers.js';

/**
 * Vista de Grupos con Chat
 */
class GroupsView {
  constructor() {
    this.groups = [];
    this.messages = {}; // { groupId: [messages] }
    this.currentGroupId = null;
    this.socketListeners = new Map();
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Mis Grupos</h1>
        </div>
        <div class="card__body">
          <div id="groups-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadGroups();
    } catch (error) {
      console.error('Error cargando grupos:', error);
      Notification.error('Error al cargar grupos');
    } finally {
      Loading.hide();
    }
  }

  async loadGroups() {
    const content = document.getElementById('groups-content');
    
    try {
      const response = await groupsAPI.getAll();
      
      if (!response.success) {
        content.innerHTML = '<p class="text-muted">Error al cargar grupos</p>';
        return;
      }

      this.groups = response.data || [];
      
      if (this.groups.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">👨‍👩‍👧‍👦</div>
            <div class="empty-state__message">No perteneces a ningún grupo</div>
          </div>
        `;
        return;
      }

      // Renderizar la interfaz con pestañas
      this.renderGroupsInterface();
      
      // Cargar mensajes del primer grupo si existe
      if (this.groups.length > 0) {
        await this.switchToGroup(this.groups[0].id);
      }

      // Configurar listeners de Socket.IO
      this.setupSocketListeners();
    } catch (error) {
      console.error('Error en loadGroups:', error);
      content.innerHTML = '<p class="text-muted">Error al cargar grupos</p>';
    }
  }

  renderGroupsInterface() {
    const content = document.getElementById('groups-content');
    const viewInstance = this;
    
    content.innerHTML = `
      <div class="groups-container">
        <div class="groups-tabs">
          ${this.groups.map((group, index) => `
            <button 
              class="group-tab ${index === 0 ? 'active' : ''}" 
              data-group-id="${group.id}"
            >
              ${this.escapeHtml(group.nombre)}
            </button>
          `).join('')}
        </div>
        
        <div class="chat-container">
          <div id="chat-header" class="chat-header">
            <h3 id="chat-group-name">Selecciona un grupo</h3>
          </div>
          
          <div id="chat-messages" class="chat-messages">
            <div class="empty-state">
              <div class="empty-state__icon">💬</div>
              <div class="empty-state__message">Selecciona un grupo para ver el chat</div>
            </div>
          </div>
          
          <div id="chat-input-container" class="chat-input-container" style="display: none;">
            <form id="chat-form" class="chat-form">
              <input 
                type="text" 
                id="chat-input" 
                class="chat-input" 
                placeholder="Escribe un mensaje..."
                autocomplete="off"
              />
              <button type="submit" class="btn btn-primary chat-send-btn">
                Enviar
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    // Configurar listeners de pestañas
    document.querySelectorAll('.group-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const groupId = parseInt(tab.dataset.groupId);
        viewInstance.switchToGroup(groupId);
      });
    });

    // Configurar el formulario de envío
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        viewInstance.sendMessage();
      });
    }

    // Permitir enviar con Enter
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          viewInstance.sendMessage();
        }
      });
    }
  }

  async switchToGroup(groupId) {
    // Actualizar pestaña activa
    document.querySelectorAll('.group-tab').forEach(tab => {
      if (parseInt(tab.dataset.groupId) === groupId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Salir del grupo anterior si existe
    if (this.currentGroupId && this.currentGroupId !== groupId) {
      leaveGroupRoom(this.currentGroupId);
    }

    this.currentGroupId = groupId;
    const group = this.groups.find(g => g.id === groupId);
    
    if (!group) return;

    // Actualizar header
    const chatHeader = document.getElementById('chat-header');
    const chatGroupName = document.getElementById('chat-group-name');
    if (chatGroupName) {
      chatGroupName.textContent = group.nombre;
    }

    // Mostrar input
    const chatInputContainer = document.getElementById('chat-input-container');
    if (chatInputContainer) {
      chatInputContainer.style.display = 'block';
    }

    // Asegurar que Socket.IO esté conectado
    if (!socketService.isConnected()) {
      socketService.connect();
      // Esperar un momento para que se conecte
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Unirse al room del grupo
    await joinGroupRoom(groupId);

    // Cargar mensajes
    await this.loadMessages(groupId);

    // Enfocar el input
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.focus();
    }
  }

  async loadMessages(groupId) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    try {
      // Mostrar loading
      chatMessages.innerHTML = '<div class="spinner"></div>';

      const response = await messagesAPI.getByGroup(groupId);
      
      if (response.success) {
        this.messages[groupId] = response.data || [];
        this.renderMessages(groupId);
      } else {
        chatMessages.innerHTML = '<p class="text-muted">Error al cargar mensajes</p>';
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      chatMessages.innerHTML = '<p class="text-muted">Error al cargar mensajes</p>';
    }
  }

  renderMessages(groupId) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messages = this.messages[groupId] || [];
    const currentUser = authService.getCurrentUser();

    if (messages.length === 0) {
      chatMessages.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">💬</div>
          <div class="empty-state__message">No hay mensajes aún. ¡Sé el primero en escribir!</div>
        </div>
      `;
      return;
    }

    chatMessages.innerHTML = messages.map(message => {
      const isOwn = message.senderId === currentUser.id;
      const messageDate = new Date(message.createdAt);
      const timeStr = messageDate.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      return `
        <div class="message ${isOwn ? 'message--own' : 'message--other'}">
          <div class="message__content">
            ${!isOwn ? `<div class="message__sender">${message.senderName || 'Usuario'}</div>` : ''}
            <div class="message__text">${this.escapeHtml(message.content)}</div>
            <div class="message__time">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');

    // Scroll al final
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async sendMessage() {
    const chatInput = document.getElementById('chat-input');
    if (!chatInput || !this.currentGroupId) return;

    const content = chatInput.value.trim();
    if (!content) return;

    // Deshabilitar input mientras se envía
    chatInput.disabled = true;

    try {
      const response = await messagesAPI.create({
        groupId: this.currentGroupId,
        content: content,
        tipo: 'texto'
      });

      if (response.success) {
        // Limpiar input
        chatInput.value = '';
        
        // El mensaje llegará automáticamente por Socket.IO
        // Como fallback, si después de 1 segundo no ha llegado por Socket.IO,
        // lo agregamos desde la respuesta del servidor
        const messageId = response.data?.id;
        if (messageId) {
          setTimeout(() => {
            // Verificar si el mensaje ya fue agregado por Socket.IO
            const messages = this.messages[this.currentGroupId] || [];
            const exists = messages.some(m => m.id === messageId);
            
            // Si no existe, agregarlo como fallback
            if (!exists && response.data) {
              if (!this.messages[this.currentGroupId]) {
                this.messages[this.currentGroupId] = [];
              }
              this.messages[this.currentGroupId].push(response.data);
              this.renderMessages(this.currentGroupId);
            }
          }, 1000);
        }
      } else {
        Notification.error('Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      Notification.error('Error al enviar mensaje');
    } finally {
      chatInput.disabled = false;
      chatInput.focus();
    }
  }

  setupSocketListeners() {
    // Limpiar listeners anteriores
    this.socketListeners.forEach((callback, event) => {
      socketService.off(event);
    });
    this.socketListeners.clear();

    // Asegurar que Socket.IO esté conectado
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    // Listener para nuevos mensajes
    const newMessageHandler = (data) => {
      const message = data.data || data;
      
      // Validar que el mensaje tenga la estructura correcta
      if (!message || !message.groupId) return;
      
      // Solo procesar si el mensaje es del grupo actual
      if (message.groupId === this.currentGroupId) {
        // Agregar mensaje si no existe
        if (!this.messages[message.groupId]) {
          this.messages[message.groupId] = [];
        }
        
        // Verificar que el mensaje no esté ya en la lista
        const exists = this.messages[message.groupId].some(m => m.id === message.id);
        if (!exists) {
          this.messages[message.groupId].push(message);
          this.renderMessages(message.groupId);
        }
      } else {
        // Mensaje de otro grupo - actualizar en su lista si está cargada
        if (this.messages[message.groupId]) {
          const exists = this.messages[message.groupId].some(m => m.id === message.id);
          if (!exists) {
            this.messages[message.groupId].push(message);
          }
        }
      }
    };

    socketService.on('new_message', newMessageHandler);
    this.socketListeners.set('new_message', newMessageHandler);

    // Listener para mensajes eliminados
    const messageDeletedHandler = (data) => {
      const messageData = data.data || data;
      const messageId = messageData.messageId || messageData.id;
      
      if (!messageId) return;
      
      // Buscar y eliminar el mensaje de todos los grupos
      Object.keys(this.messages).forEach(groupId => {
        this.messages[groupId] = this.messages[groupId].filter(m => m.id !== messageId);
      });
      
      // Re-renderizar si es el grupo actual
      if (this.currentGroupId) {
        this.renderMessages(this.currentGroupId);
      }
    };

    socketService.on('message_deleted', messageDeletedHandler);
    this.socketListeners.set('message_deleted', messageDeletedHandler);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  cleanup() {
    // Limpiar listeners de Socket.IO
    this.socketListeners.forEach((callback, event) => {
      socketService.off(event);
    });
    this.socketListeners.clear();

    // Salir de todos los rooms
    if (this.currentGroupId) {
      leaveGroupRoom(this.currentGroupId);
    }
  }
}

export default new GroupsView();

