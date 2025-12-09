import { messagesAPI } from '../api/messages.js';
import { usersAPI } from '../api/users.js';
import authService from '../services/authService.js';
import Notification from './Notification.js';
import { formatDate, formatTime } from '../utils/helpers.js';

/**
 * Widget de chat con conversaciones directas
 */
class ChatWidget {
  constructor() {
    this.launcher = null;
    this.panel = null;
    this.closeButton = null;
    this.initialized = false;
    this.isOpen = false;
    this.currentConversationId = null;
    this.conversations = [];
    this.messages = [];
    this.searchResults = [];
    this.searchTimeout = null;
  }

  init() {
    if (this.initialized) return;
    this.createLauncher();
    this.createPanel();
    this.initialized = true;
    this.loadConversations();
  }

  createLauncher() {
    this.launcher = document.createElement('button');
    this.launcher.type = 'button';
    this.launcher.className = 'chat-widget__launcher chat-widget__launcher--hidden';
    this.launcher.setAttribute('aria-label', 'Abrir chat');
    this.launcher.innerHTML = `
      <span class="chat-widget__launcher-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" focusable="false">
          <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.382a1 1 0 0 0-.707.293L11.5 19.707a1 1 0 0 1-1.707-.707V18H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="currentColor"/>
        </svg>
      </span>
      <span class="chat-widget__launcher-text">Chat</span>
    `;

    this.launcher.addEventListener('click', () => {
      if (this.isOpen) {
        this.closePanel();
      } else {
        this.openPanel();
      }
    });

    document.body.appendChild(this.launcher);
  }

  createPanel() {
    this.panel = document.createElement('section');
    this.panel.className = 'chat-widget__panel chat-widget__panel--hidden';
    this.panel.innerHTML = `
      <header class="chat-widget__header">
        <div>
          <h2 class="chat-widget__title">Mensajes</h2>
          <p class="chat-widget__subtitle">Comunícate con profesores y alumnos</p>
        </div>
        <button class="chat-widget__close" aria-label="Cerrar chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>
      <div class="chat-widget__search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chat-widget__search-icon">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input
          type="text"
          class="chat-widget__search-input"
          placeholder="Buscar usuarios..."
          aria-label="Buscar usuarios"
          id="chat-search-input"
        />
        <div class="chat-widget__search-results" id="chat-search-results"></div>
      </div>
      <div class="chat-widget__content">
        <aside class="chat-widget__conversations" aria-label="Lista de conversaciones">
          <div id="chat-conversations-list">
            <div class="chat-widget__empty">
              <p>Cargando conversaciones...</p>
            </div>
          </div>
        </aside>
        <div class="chat-widget__conversation-area" aria-label="Área de conversación">
          <div class="chat-widget__placeholder" id="chat-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.3; margin-bottom: 1rem;">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p>Inicia una conversación</p>
            <small>Selecciona un chat de la lista o busca un usuario para comenzar</small>
          </div>
          <div class="chat-widget__messages" id="chat-messages" style="display: none;"></div>
          <div class="chat-widget__composer" id="chat-composer" style="display: none;" aria-label="Enviar mensaje">
            <textarea
              class="chat-widget__input"
              placeholder="Escribe un mensaje..."
              id="chat-message-input"
              rows="3"
            ></textarea>
            <button class="chat-widget__send" type="button" id="chat-send-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    this.closeButton = this.panel.querySelector('.chat-widget__close');
    this.closeButton.addEventListener('click', () => this.closePanel());

    // Buscador
    const searchInput = this.panel.querySelector('#chat-search-input');
    searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    searchInput.addEventListener('focus', () => {
      if (this.searchResults.length > 0) {
        this.showSearchResults();
      }
    });

    // Enviar mensaje
    const sendBtn = this.panel.querySelector('#chat-send-btn');
    const messageInput = this.panel.querySelector('#chat-message-input');
    
    sendBtn.addEventListener('click', () => this.sendMessage());
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    document.body.appendChild(this.panel);
  }

  async handleSearch(query) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!query || query.length < 2) {
      this.searchResults = [];
      this.hideSearchResults();
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      try {
        const response = await usersAPI.search(query);
        if (response.success) {
          this.searchResults = response.data || [];
          this.showSearchResults();
        } else {
          this.searchResults = [];
          this.showSearchResults();
        }
      } catch (error) {
        console.error('Error buscando usuarios:', error);
        this.searchResults = [];
        this.showSearchResults();
      }
    }, 300);
  }

  showSearchResults() {
    const resultsContainer = this.panel.querySelector('#chat-search-results');
    if (this.searchResults.length === 0) {
      resultsContainer.innerHTML = '<div class="chat-widget__search-item">No se encontraron usuarios</div>';
    } else {
      resultsContainer.innerHTML = this.searchResults.map(user => `
        <div class="chat-widget__search-item" data-user-id="${user.id}">
          <div class="chat-widget__user-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="chat-widget__user-info">
            <strong>${user.nombre}</strong>
            <small>${user.email} • ${user.role}</small>
          </div>
        </div>
      `).join('');

      // Agregar event listeners
      resultsContainer.querySelectorAll('.chat-widget__search-item').forEach(item => {
        item.addEventListener('click', () => {
          const userId = parseInt(item.getAttribute('data-user-id'));
          this.startConversation(userId);
          this.hideSearchResults();
          this.panel.querySelector('#chat-search-input').value = '';
        });
      });
    }
    resultsContainer.style.display = 'block';
  }

  hideSearchResults() {
    const resultsContainer = this.panel.querySelector('#chat-search-results');
    resultsContainer.style.display = 'none';
  }

  async loadConversations() {
    try {
      const response = await messagesAPI.getConversations();
      if (response.success) {
        this.conversations = response.data || [];
        this.renderConversations();
      } else {
        console.error('Error en respuesta:', response);
        this.conversations = [];
        this.renderConversations();
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
      // No mostrar error si es 404 o si simplemente no hay conversaciones
      if (error.response?.status !== 404) {
        Notification.error('Error al cargar conversaciones');
      }
      this.conversations = [];
      this.renderConversations();
    }
  }

  renderConversations() {
    const container = this.panel.querySelector('#chat-conversations-list');
    
    if (this.conversations.length === 0) {
      container.innerHTML = `
        <div class="chat-widget__empty">
          <p>No tienes conversaciones aún</p>
          <small>Busca un usuario para comenzar</small>
        </div>
      `;
      return;
    }

    container.innerHTML = this.conversations.map(conv => {
      const unreadCount = conv.unreadCount || 0;
      const lastMessage = conv.lastMessage || 'Sin mensajes';
      const lastMessageTime = conv.lastMessageTime 
        ? this.formatMessageTime(conv.lastMessageTime) 
        : '';

      return `
        <div class="chat-widget__conversation-item ${this.currentConversationId === conv.id ? 'active' : ''}" 
             data-user-id="${conv.id}">
          <div class="chat-widget__user-avatar">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="chat-widget__conversation-info">
            <div class="chat-widget__conversation-header">
              <strong>${conv.nombre}</strong>
              ${lastMessageTime ? `<span class="chat-widget__conversation-time">${lastMessageTime}</span>` : ''}
            </div>
            <div class="chat-widget__conversation-preview">
              <span>${lastMessage.substring(0, 50)}${lastMessage.length > 50 ? '...' : ''}</span>
              ${unreadCount > 0 ? `<span class="chat-widget__unread-badge">${unreadCount}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Agregar event listeners
    container.querySelectorAll('.chat-widget__conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId = parseInt(item.getAttribute('data-user-id'));
        this.openConversation(userId);
      });
    });
  }

  async startConversation(userId) {
    // Verificar si ya existe una conversación
    const existingConv = this.conversations.find(c => c.id === userId);
    if (existingConv) {
      this.openConversation(userId);
      return;
    }

    // Obtener información del usuario
    try {
      const userResponse = await usersAPI.getById(userId);
      if (userResponse.success) {
        const user = userResponse.data;
        // Agregar a conversaciones
        this.conversations.unshift({
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          role: user.role,
          lastMessage: null,
          lastMessageTime: null,
          unreadCount: 0
        });
        this.renderConversations();
        this.openConversation(userId);
      }
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      Notification.error('Error al iniciar conversación');
    }
  }

  async openConversation(userId) {
    this.currentConversationId = userId;
    this.renderConversations(); // Actualizar estado activo

    // Ocultar placeholder y mostrar mensajes
    this.panel.querySelector('#chat-placeholder').style.display = 'none';
    this.panel.querySelector('#chat-messages').style.display = 'flex';
    this.panel.querySelector('#chat-composer').style.display = 'flex';

    // Cargar mensajes
    try {
      const response = await messagesAPI.getDirectMessages(userId);
      if (response.success) {
        this.messages = response.data || [];
        this.renderMessages();
        // Recargar conversaciones para actualizar contadores
        this.loadConversations();
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      Notification.error('Error al cargar mensajes');
    }
  }

  renderMessages() {
    const container = this.panel.querySelector('#chat-messages');
    const currentUser = authService.getCurrentUser();

    if (this.messages.length === 0) {
      container.innerHTML = `
        <div class="chat-widget__empty-messages">
          <p>No hay mensajes aún</p>
          <small>Envía el primer mensaje</small>
        </div>
      `;
      return;
    }

    container.innerHTML = this.messages.map(msg => {
      const isOwn = msg.senderId === currentUser.id;
      const messageTime = this.formatMessageTime(msg.createdAt);
      
      return `
        <div class="chat-widget__message ${isOwn ? 'own' : ''}">
          <div class="chat-widget__message-content">
            ${!isOwn ? `<div class="chat-widget__message-sender">${msg.senderName || 'Usuario'}</div>` : ''}
            <div class="chat-widget__message-text">${this.escapeHtml(msg.content)}</div>
            <div class="chat-widget__message-time">${messageTime}</div>
          </div>
        </div>
      `;
    }).join('');

    // Scroll al final
    container.scrollTop = container.scrollHeight;
  }

  async sendMessage() {
    const input = this.panel.querySelector('#chat-message-input');
    const content = input.value.trim();

    if (!content || !this.currentConversationId) {
      return;
    }

    try {
      const response = await messagesAPI.createDirectMessage(this.currentConversationId, content);
      if (response.success) {
        input.value = '';
        // Agregar mensaje a la lista localmente
        const currentUser = authService.getCurrentUser();
        this.messages.push({
          ...response.data,
          senderName: currentUser.nombre,
          senderEmail: currentUser.email
        });
        this.renderMessages();
        // Recargar conversaciones
        this.loadConversations();
      } else {
        Notification.error(response.message || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      Notification.error('Error al enviar mensaje');
    }
  }

  formatMessageTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return formatDate(date);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  openPanel() {
    this.isOpen = true;
    this.panel?.classList.remove('chat-widget__panel--hidden');
    this.launcher?.classList.add('chat-widget__launcher--active');
    document.addEventListener('keydown', this.handleKeydown);
    this.loadConversations();
  }

  closePanel() {
    this.isOpen = false;
    this.panel?.classList.add('chat-widget__panel--hidden');
    this.launcher?.classList.remove('chat-widget__launcher--active');
    document.removeEventListener('keydown', this.handleKeydown);
    this.currentConversationId = null;
    this.hideSearchResults();
  }

  handleKeydown = (event) => {
    if (event.key === 'Escape') {
      this.closePanel();
    }
  };

  updateVisibility(isAuthenticated) {
    if (!isAuthenticated) {
      if (this.launcher) {
        this.launcher.classList.add('chat-widget__launcher--hidden');
      }
      if (this.panel) {
        this.closePanel();
      }
      return;
    }

    if (!this.initialized) {
      this.init();
    }

    requestAnimationFrame(() => {
      this.launcher?.classList.remove('chat-widget__launcher--hidden');
    });
  }
}

export default new ChatWidget();
