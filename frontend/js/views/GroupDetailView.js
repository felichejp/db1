import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { messagesAPI } from '../api/messages.js';
import socketService from '../services/socketService.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { getStatusName, getStatusColor, formatDate, formatDateTime } from '../utils/helpers.js';

/**
 * Vista de Detalle de Grupo con Chat
 */
class GroupDetailView {
  constructor() {
    this.groupId = null;
    this.currentGroup = null;
    this.messages = [];
    this.members = [];
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    // Obtener ID del grupo de la URL
    const hash = window.location.hash;
    const match = hash.match(/#\/groups\/(\d+)/);
    
    if (!match) {
      Notification.error('ID de grupo inválido');
      window.location.hash = '#/groups';
      return;
    }

    this.groupId = parseInt(match[1], 10);
    const container = document.getElementById('view-container');

    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 class="card__title" id="group-title">Cargando...</h1>
              <p class="text-muted" id="group-status"></p>
            </div>
            <a href="#/groups" class="btn btn-secondary">← Volver</a>
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
      await this.loadGroupData();
      this.setupSocketListeners();
    } catch (error) {
      Notification.error('Error al cargar el grupo');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadGroupData() {
    try {
      // Cargar datos del grupo, miembros y mensajes en paralelo
      const [groupRes, membersRes, messagesRes] = await Promise.allSettled([
        groupsAPI.getById(this.groupId),
        groupsAPI.getMembers(this.groupId),
        messagesAPI.getByGroup(this.groupId)
      ]);

      // Manejar respuesta del grupo
      if (groupRes.status === 'rejected') {
        console.error('Error al cargar grupo:', groupRes.reason);
        Notification.error('Error al conectar con el servidor. Verifica que el backend esté corriendo.');
        return;
      }

      const groupData = groupRes.value;
      if (!groupData.success) {
        Notification.error(groupData.message || 'Grupo no encontrado');
        window.location.hash = '#/groups';
        return;
      }

      // Manejar respuesta de miembros
      let members = [];
      if (membersRes.status === 'fulfilled' && membersRes.value.success) {
        members = membersRes.value.data || [];
      } else if (membersRes.status === 'rejected') {
        console.warn('Error al cargar miembros:', membersRes.reason);
      }

      // Manejar respuesta de mensajes
      let messages = [];
      if (messagesRes.status === 'fulfilled' && messagesRes.value.success) {
        messages = messagesRes.value.data || [];
      } else if (messagesRes.status === 'rejected') {
        console.warn('Error al cargar mensajes:', messagesRes.reason);
      }

      this.currentGroup = groupData.data;
      this.members = members;
      this.messages = messages;

      this.renderGroupDetail();
      this.renderChat();
    } catch (error) {
      console.error('Error loading group data:', error);
      let errorMessage = 'Error al cargar datos del grupo';
      
      if (error.response) {
        // Error de respuesta HTTP
        errorMessage = error.response.data?.message || `Error ${error.response.status}`;
      } else if (error.request) {
        // Error de red (no hay respuesta)
        errorMessage = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
      } else {
        // Otro tipo de error
        errorMessage = error.message || errorMessage;
      }
      
      Notification.error(errorMessage);
    }
  }

  renderGroupDetail() {
    const group = this.currentGroup;
    if (!group) {
      console.error('No hay datos del grupo para renderizar');
      return;
    }
    
    const user = authService.getCurrentUser();
    const currentUserId = user?.id || user?.userId;
    const canEdit = user?.role === 'Admin' || (user?.role === 'Profesor' && group.profesorId === currentUserId);

    // Actualizar título
    document.getElementById('group-title').textContent = group.nombre || 'Sin nombre';
    document.getElementById('group-status').innerHTML = `
      <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
    `;

    const content = document.getElementById('group-detail-content');
    content.innerHTML = `
      <div class="group-detail-layout">
        <div class="group-info-section">
          <div class="card">
            <div class="card__header">
              <h2>Información del Grupo</h2>
            </div>
            <div class="card__body">
              <div class="form-group">
                <label><strong>Descripción:</strong></label>
                <p>${group.descripcion || 'Sin descripción'}</p>
              </div>
              <div class="form-group">
                <label><strong>Creado:</strong></label>
                <p>${group.createdAt ? formatDate(group.createdAt) : '-'}</p>
              </div>
            </div>
          </div>

          <div class="card mt-3">
            <div class="card__header">
              <h2>Miembros (${this.members.length}/5)</h2>
            </div>
            <div class="card__body">
              <div class="members-list">
                ${this.members.length > 0 ? 
                  this.members.map(member => `
                    <div class="member-item">
                      <div>
                        <strong>${member.nombre}</strong>
                        <span class="badge badge--info" style="margin-left: 8px;">${member.role}</span>
                      </div>
                      <small class="text-muted">${member.email}</small>
                    </div>
                  `).join('') :
                  '<p class="text-muted">No hay miembros en el grupo</p>'
                }
              </div>
            </div>
          </div>
        </div>

        <div class="chat-section">
          <div class="card" style="height: 100%; display: flex; flex-direction: column;">
            <div class="card__header">
              <h2>Chat del Grupo</h2>
            </div>
            <div class="card__body" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
              <div id="chat-messages" class="chat-messages">
                ${this.renderMessages()}
              </div>
              <div class="chat-input-container">
                <form id="chat-form" style="display: flex; gap: 8px;">
                  <input 
                    type="text" 
                    id="chat-input" 
                    class="form-control" 
                    placeholder="Escribe un mensaje..." 
                    autocomplete="off"
                    required
                  />
                  <button type="submit" class="btn btn-primary">Enviar</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Scroll al final del chat
    this.scrollChatToBottom();

    // Event listener para el formulario de chat
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }

    // Unirse al room del grupo en Socket.IO
    socketService.connect();
    socketService.joinGroup(this.groupId);
  }

  renderMessages() {
    if (this.messages.length === 0) {
      return '<p class="text-muted text-center" style="padding: 20px;">No hay mensajes aún. ¡Sé el primero en escribir!</p>';
    }

    const user = authService.getCurrentUser();
    // El usuario puede tener 'id' o 'userId', verificar ambos
    const currentUserId = user?.id || user?.userId;
    
    return this.messages.map(message => {
      const isOwnMessage = message.senderId === currentUserId;
      const messageDate = new Date(message.createdAt);
      const timeStr = messageDate.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      return `
        <div class="chat-message ${isOwnMessage ? 'chat-message--own' : ''}">
          <div class="chat-message__header">
            <strong>${message.senderName || 'Usuario'}</strong>
            <span class="text-muted" style="font-size: 0.85em; margin-left: 8px;">${timeStr}</span>
          </div>
          <div class="chat-message__content">
            ${this.escapeHtml(message.content)}
          </div>
        </div>
      `;
    }).join('');
  }

  renderChat() {
    // El chat ya está renderizado en renderGroupDetail
    // Este método puede usarse para actualizar solo el chat si es necesario
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = this.renderMessages();
      this.scrollChatToBottom();
    }
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();

    if (!content) return;

    try {
      const response = await messagesAPI.create({
        groupId: this.groupId,
        content: content,
        tipo: 'texto'
      });

      if (response.success) {
        input.value = '';
        // El mensaje se agregará automáticamente vía Socket.IO
      } else {
        Notification.error(response.message || 'Error al enviar mensaje');
      }
    } catch (error) {
      Notification.error('Error al enviar mensaje');
      console.error(error);
    }
  }

  setupSocketListeners() {
    // Escuchar nuevos mensajes
    socketService.on('new_message', (eventData) => {
      // El backend envuelve los datos en un objeto con type, data, timestamp
      const message = eventData.data || eventData;
      
      if (message.groupId === this.groupId) {
        // Verificar si el mensaje ya existe para evitar duplicados
        if (!this.messages.find(m => m.id === message.id)) {
          // Obtener información del sender si no está incluida
          if (!message.senderName) {
            const member = this.members.find(m => m.id === message.senderId);
            if (member) {
              message.senderName = member.nombre;
            }
          }
          this.messages.push(message);
          this.renderChat();
        }
      }
    });

    // Escuchar actualizaciones del grupo
    socketService.on('group_updated', (eventData) => {
      const group = eventData.data || eventData;
      if (group.id === this.groupId) {
        this.currentGroup = group;
        this.renderGroupDetail();
      }
    });
  }

  scrollChatToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  cleanup() {
    // Salir del room cuando se abandona la vista
    if (this.groupId) {
      socketService.leaveGroup(this.groupId);
    }
    socketService.off('new_message');
    socketService.off('group_updated');
  }
}

export default new GroupDetailView();

