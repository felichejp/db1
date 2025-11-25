import authService from '../services/authService.js';
import socketService from '../services/socketService.js';
import { conversationsAPI } from '../api/conversations.js';
import { usersAPI } from '../api/users.js';
import { groupsAPI } from '../api/groups.js';
import { messagesAPI } from '../api/messages.js';
import { joinGroupRooms } from '../utils/socketHelpers.js';
import Notification from './Notification.js';

/**
 * Componente de Chat tipo WhatsApp
 * Solo visible para Profesores y Estudiantes
 */
class ChatWidget {
  constructor() {
    this.isOpen = false;
    this.currentChat = null;
    this.currentChatType = null; // 'private' o 'group'
    this.conversations = [];
    this.groups = [];
    this.contacts = [];
    this.messages = {};
    this.container = null;
    this.user = null;
  }

  init() {
    const user = authService.getCurrentUser();
    if (!user) {
      console.log('ChatWidget: Usuario no autenticado');
      return;
    }

    // Solo mostrar para Profesores y Estudiantes
    if (user.role !== 'Profesor' && user.role !== 'Estudiante') {
      console.log('ChatWidget: Usuario no es Profesor ni Estudiante', user.role);
      return;
    }

    console.log('ChatWidget: Inicializando para', user.role, user.nombre);
    this.user = user;
    
    // Si el contenedor ya existe, limpiarlo primero
    const existingContainer = document.getElementById('chat-widget-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    this.render();
    this.loadGroups();
    this.loadConversations();
    this.loadContacts();
    this.setupSocketListeners();
  }

  render() {
    // Crear contenedor del chat si no existe
    if (!document.getElementById('chat-widget-container')) {
      const container = document.createElement('div');
      container.id = 'chat-widget-container';
      document.body.appendChild(container);
      this.container = container;
    } else {
      this.container = document.getElementById('chat-widget-container');
    }

    this.container.innerHTML = `
      <div class="chat-widget ${this.isOpen ? 'chat-widget--open' : ''}">
        <!-- Botón flotante -->
        <button class="chat-widget__toggle" id="chat-toggle">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span class="chat-widget__badge" id="chat-badge" style="display: none;">0</span>
        </button>

        <!-- Panel del chat -->
        <div class="chat-widget__panel">
          <div class="chat-widget__header">
            <h3>Mensajes</h3>
            <button class="chat-widget__close" id="chat-close">×</button>
          </div>

          <div class="chat-widget__content">
            <!-- Lista de conversaciones -->
            <div class="chat-widget__conversations" id="chat-conversations">
              <div class="chat-widget__search">
                <input type="text" placeholder="Buscar conversación..." id="chat-search">
              </div>
              <div class="chat-widget__list" id="chat-list">
                <div class="chat-widget__empty">Cargando conversaciones...</div>
              </div>
            </div>

            <!-- Vista de chat individual -->
            <div class="chat-widget__chat" id="chat-messages-view" style="display: none;">
              <div class="chat-widget__chat-header" id="chat-header">
                <button class="chat-widget__back" id="chat-back">←</button>
                <div class="chat-widget__user-info">
                  <div class="chat-widget__user-name" id="chat-user-name"></div>
                  <div class="chat-widget__user-role" id="chat-user-role"></div>
                </div>
              </div>
              <div class="chat-widget__messages" id="chat-messages">
                <!-- Mensajes se cargan aquí -->
              </div>
              <div class="chat-widget__input-container">
                <input 
                  type="text" 
                  class="chat-widget__input" 
                  id="chat-input" 
                  placeholder="Escribe un mensaje..."
                  maxlength="1000"
                >
                <button class="chat-widget__send" id="chat-send">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    // Toggle chat
    const toggleBtn = document.getElementById('chat-toggle');
    const closeBtn = document.getElementById('chat-close');
    const backBtn = document.getElementById('chat-back');
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');
    const searchInput = document.getElementById('chat-search');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => this.showConversations());
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterConversations(e.target.value);
      });
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const widget = this.container.querySelector('.chat-widget');
    if (widget) {
      if (this.isOpen) {
        widget.classList.add('chat-widget--open');
      } else {
        widget.classList.remove('chat-widget--open');
      }
    }
  }

  close() {
    this.isOpen = false;
    const widget = this.container.querySelector('.chat-widget');
    if (widget) {
      widget.classList.remove('chat-widget--open');
    }
    this.showConversations();
  }

  async loadGroups() {
    try {
      const response = await groupsAPI.getAll();
      if (response.success) {
        this.groups = response.data || [];
        this.renderConversations();
        await joinGroupRooms(this.groups);
      }
    } catch (error) {
      console.error('Error cargando grupos:', error);
    }
  }

  async loadConversations() {
    try {
      const response = await conversationsAPI.getAll();
      if (response.success) {
        this.conversations = response.data || [];
        this.renderConversations();
        this.updateBadge();
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    }
  }

  async loadContacts() {
    try {
      const response = await usersAPI.getChatUsers();
      if (response.success) {
        this.contacts = response.data || [];
      }
    } catch (error) {
      console.error('Error cargando contactos:', error);
    }
  }

  renderConversations() {
    const list = document.getElementById('chat-list');
    if (!list) return;

    // Combinar grupos y conversaciones privadas
    const allChats = [];
    
    // Agregar grupos primero
    this.groups.forEach(group => {
      allChats.push({
        id: group.id,
        nombre: group.nombre,
        type: 'group',
        lastMessage: null,
        lastMessageAt: group.updatedAt || group.createdAt,
        unreadCount: 0
      });
    });
    
    // Agregar conversaciones privadas
    this.conversations.forEach(conv => {
      allChats.push({
        id: conv.id,
        nombre: conv.nombre,
        type: 'private',
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.unreadCount || 0
      });
    });

    if (allChats.length === 0) {
      list.innerHTML = `
        <div class="chat-widget__empty">
          <p>No tienes conversaciones</p>
          <p class="text-muted">Los grupos aparecerán aquí automáticamente</p>
        </div>
      `;
      return;
    }

    // Ordenar por última actividad
    allChats.sort((a, b) => {
      const dateA = new Date(a.lastMessageAt || 0);
      const dateB = new Date(b.lastMessageAt || 0);
      return dateB - dateA;
    });

    list.innerHTML = allChats.map(chat => {
      const unreadCount = chat.unreadCount || 0;
      const lastMessage = chat.lastMessage || 'Sin mensajes';
      const lastMessagePreview = lastMessage.length > 50 
        ? lastMessage.substring(0, 50) + '...' 
        : lastMessage;
      const icon = chat.type === 'group' ? '👥' : '💬';
      
      return `
        <div class="chat-widget__conversation ${unreadCount > 0 ? 'chat-widget__conversation--unread' : ''}" 
             data-chat-id="${chat.id}" data-chat-type="${chat.type}">
          <div class="chat-widget__conversation-avatar">
            ${chat.type === 'group' ? icon : chat.nombre.charAt(0).toUpperCase()}
          </div>
          <div class="chat-widget__conversation-info">
            <div class="chat-widget__conversation-header">
              <span class="chat-widget__conversation-name">${chat.nombre} ${chat.type === 'group' ? '(Grupo)' : ''}</span>
              <span class="chat-widget__conversation-time">${this.formatTime(chat.lastMessageAt)}</span>
            </div>
            <div class="chat-widget__conversation-preview">
              <span>${chat.type === 'group' ? 'Chat de grupo' : lastMessagePreview}</span>
              ${unreadCount > 0 ? `<span class="chat-widget__unread-badge">${unreadCount}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Agregar event listeners
    list.querySelectorAll('.chat-widget__conversation').forEach(item => {
      item.addEventListener('click', () => {
        const chatId = parseInt(item.dataset.chatId);
        const chatType = item.dataset.chatType;
        if (chatType === 'group') {
          this.openGroupChat(chatId);
        } else {
          this.openChat(chatId);
        }
      });
    });
  }

  filterConversations(searchTerm) {
    const list = document.getElementById('chat-list');
    if (!list) return;

    const term = searchTerm.toLowerCase();
    const items = list.querySelectorAll('.chat-widget__conversation');
    
    items.forEach(item => {
      const name = item.querySelector('.chat-widget__conversation-name')?.textContent.toLowerCase() || '';
      if (name.includes(term)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  async openGroupChat(groupId) {
    this.currentChat = groupId;
    this.currentChatType = 'group';
    
    // Obtener información del grupo
    const group = this.groups.find(g => g.id === groupId);
    
    if (!group) {
      try {
        const response = await groupsAPI.getById(groupId);
        if (response.success) {
          this.currentChatGroup = response.data;
        }
      } catch (error) {
        Notification.error('Error al cargar grupo');
        return;
      }
    } else {
      this.currentChatGroup = group;
    }

    // Unirse al room del grupo en Socket.IO
    socketService.joinGroup(groupId);

    // Mostrar vista de chat
    const conversationsView = document.getElementById('chat-conversations');
    const messagesView = document.getElementById('chat-messages-view');
    
    if (conversationsView) conversationsView.style.display = 'none';
    if (messagesView) messagesView.style.display = 'flex';

    // Actualizar header
    const userName = document.getElementById('chat-user-name');
    const userRole = document.getElementById('chat-user-role');
    
    if (userName) userName.textContent = this.currentChatGroup.nombre;
    if (userRole) userRole.textContent = 'Grupo';

    // Cargar mensajes del grupo
    await this.loadGroupMessages(groupId);
  }

  async openChat(userId) {
    this.currentChat = userId;
    this.currentChatType = 'private';
    
    // Obtener información del usuario
    const user = this.conversations.find(c => c.id === userId) || 
                 this.contacts.find(c => c.id === userId);
    
    if (!user) {
      // Si no está en conversaciones, buscar en contactos
      try {
        const response = await usersAPI.getById(userId);
        if (response.success) {
          this.currentChatUser = response.data;
        }
      } catch (error) {
        Notification.error('Error al cargar usuario');
        return;
      }
    } else {
      this.currentChatUser = user;
    }

    // Mostrar vista de chat
    const conversationsView = document.getElementById('chat-conversations');
    const messagesView = document.getElementById('chat-messages-view');
    
    if (conversationsView) conversationsView.style.display = 'none';
    if (messagesView) messagesView.style.display = 'flex';

    // Actualizar header
    const userName = document.getElementById('chat-user-name');
    const userRole = document.getElementById('chat-user-role');
    
    if (userName) userName.textContent = this.currentChatUser.nombre;
    if (userRole) userRole.textContent = this.currentChatUser.role;

    // Cargar mensajes
    await this.loadMessages(userId);
  }

  async loadGroupMessages(groupId) {
    try {
      const response = await messagesAPI.getByGroup(groupId);
      if (response.success) {
        const key = `group_${groupId}`;
        this.messages[key] = response.data || [];
        this.renderMessages(key, 'group');
      }
    } catch (error) {
      console.error('Error cargando mensajes del grupo:', error);
      Notification.error('Error al cargar mensajes del grupo');
    }
  }

  async loadMessages(userId) {
    try {
      const response = await conversationsAPI.getMessages(userId);
      if (response.success) {
        const key = `private_${userId}`;
        this.messages[key] = response.data || [];
        this.renderMessages(key, 'private');
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      Notification.error('Error al cargar mensajes');
    }
  }

  renderMessages(key, type) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const messages = this.messages[key] || [];
    
    if (messages.length === 0) {
      container.innerHTML = `
        <div class="chat-widget__empty-messages">
          <p>No hay mensajes aún</p>
          <p class="text-muted">${type === 'group' ? 'Envía el primer mensaje al grupo' : 'Envía el primer mensaje'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = messages.map(msg => {
      const currentUserId = Number(this.user?.id);
      const senderId = Number(msg.senderId);
      const isOwn = (!Number.isNaN(currentUserId) && !Number.isNaN(senderId))
        ? senderId === currentUserId
        : String(msg.senderId) === String(this.user?.id);
      const messageClass = `chat-widget__message ${isOwn ? 'chat-widget__message--own' : 'chat-widget__message--incoming'}`;
      const senderName = msg.senderName ||
        (isOwn
          ? (this.user?.nombre || 'Tú')
          : (type === 'group'
              ? 'Miembro del grupo'
              : this.currentChatUser?.nombre || 'Usuario'));
      return `
        <div class="${messageClass}">
          <div class="chat-widget__message-sender ${isOwn ? 'chat-widget__message-sender--own' : ''}">
            ${isOwn ? 'Tú' : senderName}
          </div>
          <div class="chat-widget__message-content">
            ${this.escapeHtml(msg.content)}
          </div>
          <div class="chat-widget__message-time">
            ${this.formatTime(msg.createdAt)}
          </div>
        </div>
      `;
    }).join('');

    // Scroll al final
    container.scrollTop = container.scrollHeight;
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input || !this.currentChat) return;

    const content = input.value.trim();
    if (!content) return;

    try {
      if (this.currentChatType === 'group') {
        // Enviar mensaje a grupo
        await messagesAPI.create({
          groupId: this.currentChat,
          content: content,
          tipo: 'texto'
        });
        input.value = '';
        
        // Recargar mensajes del grupo
        await this.loadGroupMessages(this.currentChat);
      } else {
        // Enviar mensaje privado
        await conversationsAPI.sendMessage(this.currentChat, content);
        input.value = '';
        
        // Recargar mensajes
        await this.loadMessages(this.currentChat);
      }
      
      // Recargar conversaciones
      await this.loadConversations();
      await this.loadGroups();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      Notification.error('Error al enviar mensaje');
    }
  }

  showConversations() {
    this.currentChat = null;
    this.currentChatType = null;
    const conversationsView = document.getElementById('chat-conversations');
    const messagesView = document.getElementById('chat-messages-view');
    
    if (conversationsView) conversationsView.style.display = 'block';
    if (messagesView) messagesView.style.display = 'none';
  }

  setupSocketListeners() {
    // Escuchar mensajes privados
    socketService.on('private_message', (data) => {
      const message = data.data || data;
      
      // Si el chat está abierto con este usuario, agregar el mensaje
      if (this.currentChatType === 'private' && this.currentChat === message.senderId) {
        const key = `private_${message.senderId}`;
        if (!this.messages[key]) {
          this.messages[key] = [];
        }
        this.messages[key].push(message);
        this.renderMessages(key, 'private');
      }
      
      // Recargar conversaciones
      this.loadConversations();
    });

    // Escuchar mensajes de grupo
    socketService.on('new_message', (data) => {
      const message = data.data || data;
      
      // Si el chat está abierto con este grupo, agregar el mensaje
      if (this.currentChatType === 'group' && this.currentChat === message.groupId) {
        const key = `group_${message.groupId}`;
        if (!this.messages[key]) {
          this.messages[key] = [];
        }
        this.messages[key].push(message);
        this.renderMessages(key, 'group');
      }
      
      // Recargar conversaciones si es un grupo que tenemos
      if (this.groups.find(g => g.id === message.groupId)) {
        this.loadGroups();
        this.loadConversations();
      }
    });
  }

  updateBadge() {
    const badge = document.getElementById('chat-badge');
    if (!badge) return;

    const totalUnread = this.conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    
    if (totalUnread > 0) {
      badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Método público para abrir chat desde fuera
  openChatWithUser(userId) {
    this.toggle();
    setTimeout(() => {
      this.openChat(userId);
    }, 100);
  }
}

export default new ChatWidget();

