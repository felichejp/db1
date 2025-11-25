import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { messagesAPI } from '../api/messages.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';
import { joinGroupRoom, leaveGroupRoom } from '../utils/socketHelpers.js';
import socketService from '../services/socketService.js';

/**
 * Vista de Detalle de Grupo
 */
class GroupDetailView {
  constructor() {
    this.currentGroupId = null;
    this.messages = [];
    this.socketListeners = new Map();
  }

  async render() {
    // Limpiar recursos de la vista anterior si existe
    this.cleanup();

    const user = authService.getCurrentUser();
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

    // Obtener groupId de la URL
    const hash = window.location.hash;
    const match = hash.match(/#\/groups\/(\d+)/);
    if (!match) {
      Notification.error('ID de grupo no válido');
      window.location.hash = '#/dashboard';
      return;
    }

    const groupId = parseInt(match[1], 10);
    this.currentGroupId = groupId;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 class="card__title" id="group-title">Cargando grupo...</h1>
              <p class="text-muted" id="group-subtitle"></p>
            </div>
            <a href="#/dashboard" class="btn btn-secondary">
              <i class="fas fa-arrow-left"></i> Volver al Dashboard
            </a>
          </div>
        </div>
        <div class="card__body">
          <div id="group-detail-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadGroupData(groupId);
    } catch (error) {
      Notification.error('Error al cargar el grupo');
      console.error(error);
      window.location.hash = '#/dashboard';
    } finally {
      Loading.hide();
    }
  }

  async loadGroupData(groupId) {
    try {
      const [groupRes, membersRes, sessionsRes, messagesRes] = await Promise.allSettled([
        groupsAPI.getById(groupId),
        groupsAPI.getMembers(groupId),
        sessionsAPI.getAll(),
        messagesAPI.getByGroup(groupId)
      ]);

      // Manejar errores
      if (groupRes.status === 'rejected') {
        if (groupRes.reason?.response?.status === 404) {
          Notification.error('Grupo no encontrado');
          window.location.hash = '#/dashboard';
          return;
        }
        if (groupRes.reason?.response?.status === 401) {
          authService.logout();
          window.location.hash = '#/login';
          return;
        }
        throw groupRes.reason;
      }

      const group = groupRes.value.success ? groupRes.value.data : null;
      if (!group) {
        Notification.error('No se pudo cargar el grupo');
        window.location.hash = '#/dashboard';
        return;
      }

      const members = membersRes.status === 'fulfilled' && membersRes.value.success
        ? membersRes.value.data
        : [];
      
      const allSessions = sessionsRes.status === 'fulfilled' && sessionsRes.value.success
        ? sessionsRes.value.data
        : [];
      
      // Filtrar sesiones del grupo
      const groupSessions = allSessions.filter(s => s.groupId === groupId);

      const messages = messagesRes.status === 'fulfilled' && messagesRes.value.success
        ? messagesRes.value.data
        : [];

      this.messages = messages;

      // Actualizar título
      document.getElementById('group-title').textContent = group.nombre;
      document.getElementById('group-subtitle').innerHTML = `
        Estado: <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
      `;

      // Renderizar contenido
      const content = document.getElementById('group-detail-content');
      content.innerHTML = this.renderGroupDetail(group, members, groupSessions, messages);

      // Scroll al inicio de la página
      window.scrollTo(0, 0);
      const container = document.getElementById('view-container');
      if (container) {
        container.scrollTop = 0;
      }

      // Configurar Socket.IO para el chat
      this.setupChatSocketListeners(groupId);
      joinGroupRoom(groupId);

      // Configurar eventos del chat
      this.setupChatInputEvents(groupId);
    } catch (error) {
      console.error('Error al cargar datos del grupo:', error);
      throw error;
    }
  }

  renderGroupDetail(group, members, sessions, messages) {
    return `
      <div class="group-detail">
        <!-- Información del Grupo -->
        <div class="group-info-section">
          <h2>Información del Grupo</h2>
          <div class="group-info-card">
            <div class="info-row">
              <span class="info-label">Nombre:</span>
              <span class="info-value">${this.escapeHtml(group.nombre)}</span>
            </div>
            ${group.descripcion ? `
              <div class="info-row">
                <span class="info-label">Descripción:</span>
                <span class="info-value">${this.escapeHtml(group.descripcion)}</span>
              </div>
            ` : ''}
            ${group.profesorNombre ? `
              <div class="info-row">
                <span class="info-label">Profesor:</span>
                <span class="info-value">${this.escapeHtml(group.profesorNombre)}${group.profesorEmail ? ` (${this.escapeHtml(group.profesorEmail)})` : ''}</span>
              </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Estado:</span>
              <span class="info-value">
                <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Creado:</span>
              <span class="info-value">${formatDate(group.createdAt)}</span>
            </div>
          </div>
        </div>

        <!-- Miembros del Grupo -->
        <div class="group-members-section">
          <h2>Miembros (${members.length})</h2>
          ${members.length > 0 ? this.renderMembersList(members) : '<p class="text-muted">No hay miembros en el grupo</p>'}
        </div>

        <!-- Sesiones del Grupo -->
        <div class="group-sessions-section">
          <h2>Sesiones (${sessions.length})</h2>
          ${sessions.length > 0 ? this.renderSessionsList(sessions) : '<p class="text-muted">No hay sesiones programadas para este grupo</p>'}
        </div>

        <!-- Chat del Grupo -->
        <div class="group-chat-section">
          <h2>Chat del Grupo</h2>
          ${this.renderGroupChat(group.id, group.nombre, messages)}
        </div>
      </div>
    `;
  }

  renderMembersList(members) {
    return `
      <div class="table-container mt-2">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Grado</th>
              <th>Se unió</th>
            </tr>
          </thead>
          <tbody>
            ${members.map(member => `
              <tr>
                <td>${this.escapeHtml(member.nombre)}</td>
                <td>${this.escapeHtml(member.email)}</td>
                <td><span class="badge badge--info">${member.role}</span></td>
                <td>${member.grado || '-'}</td>
                <td>${formatDate(member.joinedAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderSessionsList(sessions) {
    return `
      <div class="table-container mt-2">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Tema</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map(session => `
              <tr>
                <td>${formatDate(session.fecha)}</td>
                <td>${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}</td>
                <td>${this.escapeHtml(session.tema || '-')}</td>
                <td><span class="badge badge--${getStatusColor(session.estado)}">${getStatusName(session.estado)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderGroupChat(groupId, groupName, messages) {
    return `
      <div class="chat-wrapper">
        <div class="chat-header">
          <div class="chat-header__info">
            <h3>Chat: ${this.escapeHtml(groupName)}</h3>
            <span class="chat-group-id">Grupo #${groupId}</span>
          </div>
        </div>
        
        <div class="chat-messages" id="chat-messages-${groupId}">
          ${messages.length === 0 ? `
            <div class="chat-empty">
              <i class="fas fa-comments"></i>
              <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
            </div>
          ` : this.renderMessages(groupId, messages)}
        </div>
        
        <div class="chat-input-container">
          <div class="chat-input-wrapper">
            <textarea 
              id="chat-input-${groupId}" 
              class="chat-input" 
              placeholder="Escribe un mensaje..."
              rows="2"
            ></textarea>
            <button 
              class="btn btn-primary chat-send-btn" 
              onclick="groupDetailView.sendChatMessage(${groupId})"
              id="chat-send-btn-${groupId}"
            >
              <i class="fas fa-paper-plane"></i> Enviar
            </button>
          </div>
          <div class="chat-input-hint">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </div>
        </div>
      </div>
    `;
  }

  renderMessages(groupId, messages) {
    const user = authService.getCurrentUser();
    if (!user) return '';

    return messages.map(message => {
      const isOwnMessage = message.senderId === user.userId || message.senderId === user.id;
      const messageTime = this.formatMessageTime(message.createdAt);
      const messageDate = this.formatMessageDate(message.createdAt);
      
      return `
        <div class="message ${isOwnMessage ? 'message--own' : 'message--other'}" data-message-id="${message.id}">
          <div class="message__content">
            <div class="message__header">
              <span class="message__sender">${this.escapeHtml(message.senderName || message.senderEmail || 'Usuario')}</span>
              <span class="message__time" title="${messageDate}">${messageTime}</span>
            </div>
            <div class="message__text">${this.escapeHtml(message.content)}</div>
          </div>
          ${isOwnMessage ? `
            <button 
              class="message__delete" 
              onclick="groupDetailView.deleteMessage(${message.id}, ${groupId})"
              title="Eliminar mensaje"
            >
              <i class="fas fa-trash"></i>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  async sendChatMessage(groupId) {
    const input = document.getElementById(`chat-input-${groupId}`);
    const sendBtn = document.getElementById(`chat-send-btn-${groupId}`);
    
    if (!input) return;
    
    const content = input.value.trim();
    if (!content) {
      Notification.warning('El mensaje no puede estar vacío');
      return;
    }
    
    sendBtn.disabled = true;
    input.disabled = true;
    
    try {
      const response = await messagesAPI.create({
        groupId: groupId,
        content: content,
        tipo: 'texto'
      });
      
      if (response.success) {
        input.value = '';
        input.style.height = 'auto';
        
        const newMessage = response.data;
        if (newMessage) {
          this.messages.push(newMessage);
          // Scroll al final cuando se envía un mensaje
          this.updateChatMessages(groupId, true);
        }
      } else {
        Notification.error(response.message || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      Notification.error('Error al enviar mensaje. Intenta nuevamente.');
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  async deleteMessage(messageId, groupId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
      return;
    }
    
    try {
      const response = await messagesAPI.delete(messageId);
      
      if (response.success) {
        this.messages = this.messages.filter(m => m.id !== messageId);
        // No hacer scroll al eliminar mensajes
        this.updateChatMessages(groupId, false);
        Notification.success('Mensaje eliminado');
      } else {
        Notification.error(response.message || 'Error al eliminar mensaje');
      }
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
      Notification.error('Error al eliminar mensaje');
    }
  }

  updateChatMessages(groupId, shouldScroll = false) {
    const messagesContainer = document.getElementById(`chat-messages-${groupId}`);
    if (messagesContainer) {
      if (this.messages.length === 0) {
        messagesContainer.innerHTML = `
          <div class="chat-empty">
            <i class="fas fa-comments"></i>
            <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
          </div>
        `;
      } else {
        messagesContainer.innerHTML = this.renderMessages(groupId, this.messages);
      }
      // Solo hacer scroll si se solicita explícitamente (nuevos mensajes en tiempo real)
      if (shouldScroll) {
        this.scrollChatToBottom(groupId);
      }
    }
  }

  setupChatSocketListeners(groupId) {
    const newMessageHandler = (message) => {
      if (message.groupId === groupId) {
        const exists = this.messages.some(m => m.id === message.id);
        if (!exists) {
          this.messages.push(message);
          // Scroll al final solo para nuevos mensajes en tiempo real
          this.updateChatMessages(groupId, true);
        }
      }
    };
    
    const deletedMessageHandler = (data) => {
      if (data.groupId === groupId || this.messages.some(m => m.id === data.messageId)) {
        this.messages = this.messages.filter(m => m.id !== data.messageId);
        // No hacer scroll al eliminar mensajes
        this.updateChatMessages(groupId, false);
      }
    };
    
    socketService.on('new_message', newMessageHandler);
    socketService.on('message_deleted', deletedMessageHandler);
    
    this.socketListeners.set('new_message', newMessageHandler);
    this.socketListeners.set('message_deleted', deletedMessageHandler);
  }

  cleanupChatListeners() {
    this.socketListeners.forEach((handler, event) => {
      socketService.off(event);
    });
    this.socketListeners.clear();
  }

  setupChatInputEvents(groupId) {
    const input = document.getElementById(`chat-input-${groupId}`);
    if (!input) return;
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendChatMessage(groupId);
      }
    });
    
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    });
    
    // No hacer focus automático ni scroll al cargar la página
    // El usuario puede hacer scroll al chat si lo desea
  }

  scrollChatToBottom(groupId) {
    const messagesContainer = document.getElementById(`chat-messages-${groupId}`);
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays === 0) {
      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    
    if (diffDays === 1) {
      return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    if (diffDays < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  formatMessageDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  cleanup() {
    // Limpiar listeners de Socket.IO
    this.cleanupChatListeners();
    
    // Salir del room del grupo
    if (this.currentGroupId) {
      leaveGroupRoom(this.currentGroupId);
    }
    
    // Limpiar datos
    this.currentGroupId = null;
    this.messages = [];
  }
}

const groupDetailView = new GroupDetailView();
// Hacer groupDetailView disponible globalmente para los onclick
window.groupDetailView = groupDetailView;

export default groupDetailView;

