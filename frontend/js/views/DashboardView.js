import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { messagesAPI } from '../api/messages.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';
import { joinGroupRooms } from '../utils/socketHelpers.js';
import socketService from '../services/socketService.js';

/**
 * Vista de Dashboard
 */
class DashboardView {
  constructor() {
    this.selectedGroupId = null;
    this.messages = [];
    this.socketListeners = [];
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Bienvenido, ${user.nombre}</h1>
          <p class="text-muted">Rol: ${user.role}</p>
        </div>
        <div class="card__body">
          <div id="dashboard-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadDashboardContent(user);
    } catch (error) {
      Notification.error('Error al cargar el dashboard');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadDashboardContent(user) {
    const content = document.getElementById('dashboard-content');
    
    try {
      const [groupsRes, sessionsRes] = await Promise.allSettled([
        groupsAPI.getAll(),
        sessionsAPI.getAll()
      ]);

      // Manejar resultados (pueden ser errores 401)
      const groups = groupsRes.status === 'fulfilled' && groupsRes.value.success 
        ? groupsRes.value.data 
        : [];
      const sessions = sessionsRes.status === 'fulfilled' && sessionsRes.value.success 
        ? sessionsRes.value.data 
        : [];

      // Si hay errores 401, redirigir a login
      if (groupsRes.status === 'rejected' && groupsRes.reason?.response?.status === 401) {
        authService.logout();
        window.location.hash = '#/login';
        return;
      }

      // Unirse automáticamente a rooms de grupos para recibir eventos en tiempo real
      if (groups.length > 0) {
        await joinGroupRooms(groups);
      }
      
      // Configurar listeners de socket siempre (para recibir mensajes cuando se seleccione un grupo)
      this.setupSocketListeners();

      let html = '';

      if (user.role === 'Admin') {
        html = this.renderAdminDashboard(groups, sessions);
      } else if (user.role === 'Profesor') {
        html = this.renderProfesorDashboard(groups, sessions);
      } else if (user.role === 'Tutor') {
        html = this.renderTutorDashboard(groups, sessions);
      } else {
        html = this.renderEstudianteDashboard(groups, sessions);
      }

      // Agregar panel de chat siempre
      html += this.renderChatPanel(groups);

      content.innerHTML = html;

      // Inicializar chat siempre
      this.initializeChat();
    } catch (error) {
      content.innerHTML = '<p class="text-muted">Error al cargar datos</p>';
    }
  }

  renderAdminDashboard(groups, sessions) {
    return `
      <div>
        <h2>Estadísticas</h2>
        <p>Grupos: ${groups.length}</p>
        <p>Sesiones: ${sessions.length}</p>
      </div>
    `;
  }

  renderProfesorDashboard(groups, sessions) {
    return `
      <div>
        <h2>Mis Grupos (${groups.length})</h2>
        ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No tienes grupos asignados</p>'}
        <h2 class="mt-3">Próximas Sesiones</h2>
        ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No hay sesiones programadas</p>'}
      </div>
    `;
  }

  renderTutorDashboard(groups, sessions) {
    return `
      <div>
        <h2>Mis Sesiones (${sessions.length})</h2>
        ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No tienes sesiones asignadas</p>'}
      </div>
    `;
  }

  renderEstudianteDashboard(groups, sessions) {
    return `
      <div>
        <h2>Mis Grupos (${groups.length})</h2>
        ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No estás en ningún grupo</p>'}
        <h2 class="mt-3">Próximas Sesiones</h2>
        ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No hay sesiones programadas</p>'}
      </div>
    `;
  }

  renderChatPanel(groups) {
    return `
      <div class="chat-panel mt-4">
        <div class="chat-panel__header">
          <h2>💬 Chat de Grupos</h2>
        </div>
        <div class="chat-panel__body">
          <div class="chat-panel__sidebar">
            <h3>Selecciona un grupo</h3>
            ${groups.length > 0 ? `
              <div class="chat-groups-list">
                ${groups.map(group => `
                  <div class="chat-group-item" data-group-id="${group.id}">
                    <strong>${group.nombre}</strong>
                    <span class="text-muted">${getStatusName(group.estado)}</span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="chat-empty-state">
                <p>No tienes grupos disponibles</p>
              </div>
            `}
          </div>
          <div class="chat-panel__main">
            <div id="chat-messages-container" class="chat-messages">
              <div class="chat-empty-state">
                <p>${groups.length > 0 ? 'Selecciona un grupo para comenzar a chatear' : 'No hay grupos disponibles para chatear'}</p>
              </div>
            </div>
            <div class="chat-input-container" id="chat-input-container">
              <input type="text" id="chat-message-input" class="chat-input" placeholder="Selecciona un grupo para enviar mensajes..." disabled />
              <button id="chat-send-btn" class="btn btn-primary" disabled>Enviar</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  initializeChat() {
    // Esperar un momento para que el DOM esté listo
    setTimeout(() => {
      // Event listeners para seleccionar grupo
      const groupItems = document.querySelectorAll('.chat-group-item');
      if (groupItems.length > 0) {
        groupItems.forEach(item => {
          // Remover listeners anteriores si existen
          const newItem = item.cloneNode(true);
          item.parentNode.replaceChild(newItem, item);
          
          newItem.addEventListener('click', async () => {
            const groupId = parseInt(newItem.dataset.groupId, 10);
            await this.selectGroup(groupId);
          });
        });
      }

      this.setupSendButtonListeners();
    }, 100);
  }

  async selectGroup(groupId) {
    this.selectedGroupId = groupId;
    this.messages = [];

    document.querySelectorAll('.chat-group-item').forEach(item => {
      item.classList.remove('active');
      if (parseInt(item.dataset.groupId, 10) === groupId) {
        item.classList.add('active');
      }
    });

    const messagesContainer = document.getElementById('chat-messages-container');
    const messageInput = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('chat-send-btn');
    
    // Mostrar spinner mientras carga
    messagesContainer.innerHTML = '<div class="spinner"></div>';
    
    // Deshabilitar campo de entrada y botón mientras carga
    if (messageInput) {
      messageInput.disabled = true;
      messageInput.placeholder = 'Cargando mensajes...';
    }
    if (sendBtn) {
      sendBtn.disabled = true;
    }

    try {
      // Cargar mensajes del grupo
      const response = await messagesAPI.getByGroup(groupId);
      
      if (response.success) {
        this.messages = response.data || [];
        this.renderMessages();
        
        // Habilitar campo de entrada y botón después de cargar los mensajes
        if (messageInput) {
          messageInput.disabled = false;
          messageInput.placeholder = 'Escribe un mensaje...';
          setTimeout(() => {
            messageInput.focus();
          }, 100);
        }
        if (sendBtn) {
          sendBtn.disabled = false;
        }
        
        // Reconfigurar event listeners para el botón de enviar
        this.setupSendButtonListeners();
      } else {
        messagesContainer.innerHTML = '<p class="text-muted">Error al cargar mensajes</p>';
        if (messageInput) {
          messageInput.disabled = false;
          messageInput.placeholder = 'Escribe un mensaje...';
        }
        if (sendBtn) {
          sendBtn.disabled = false;
        }
      }
    } catch (error) {
      messagesContainer.innerHTML = '<p class="text-muted">Error al cargar mensajes</p>';
      console.error(error);
      if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = 'Escribe un mensaje...';
      }
      if (sendBtn) {
        sendBtn.disabled = false;
      }
    }
  }

  setupSendButtonListeners() {
    const sendBtn = document.getElementById('chat-send-btn');
    const messageInput = document.getElementById('chat-message-input');
    
    if (!sendBtn || !messageInput) {
      return;
    }

    // Remover listeners anteriores si existen
    const newSendBtn = sendBtn.cloneNode(true);
    const newMessageInput = messageInput.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
    messageInput.parentNode.replaceChild(newMessageInput, messageInput);
    
    const sendMessage = async () => {
      const content = newMessageInput.value.trim();
      if (!content || !this.selectedGroupId) {
        if (!this.selectedGroupId) {
          Notification.warning('Por favor selecciona un grupo primero');
        }
        return;
      }

      try {
        Loading.show();
        const response = await messagesAPI.create({
          groupId: this.selectedGroupId,
          content: content,
          tipo: 'texto'
        });
        
        if (response.success) {
          newMessageInput.value = '';
          newMessageInput.focus();
        } else {
          Notification.error(response.message || 'Error al enviar mensaje');
        }
      } catch (error) {
        Notification.error('Error al enviar mensaje');
        console.error(error);
      } finally {
        Loading.hide();
      }
    };

    newSendBtn.addEventListener('click', sendMessage);
    newMessageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  renderMessages() {
    const messagesContainer = document.getElementById('chat-messages-container');
    const user = authService.getCurrentUser();

    if (this.messages.length === 0) {
      messagesContainer.innerHTML = '<div class="chat-empty-state"><p>No hay mensajes aún. ¡Sé el primero en escribir!</p></div>';
      return;
    }

    messagesContainer.innerHTML = this.messages.map(message => {
      const isOwn = message.senderId === user.userId;
      const time = new Date(message.createdAt).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      return `
        <div class="chat-message ${isOwn ? 'chat-message--own' : ''}">
          <div class="chat-message__header">
            <strong>${message.senderName || message.senderEmail || 'Usuario'}</strong>
            <span class="text-muted">${time}</span>
          </div>
          <div class="chat-message__content">${this.escapeHtml(message.content)}</div>
        </div>
      `;
    }).join('');

    // Scroll al final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  setupSocketListeners() {
    // Limpiar listeners anteriores
    this.socketListeners.forEach(({ event, callback }) => {
      socketService.off(event);
    });
    this.socketListeners = [];

    // Listener para nuevos mensajes
    const newMessageHandler = (eventData) => {
      // El evento puede venir envuelto en { type, data, timestamp } o directamente como mensaje
      const message = eventData.data || eventData;
      
      // El mensaje puede venir con groupId como número o string
      const messageGroupId = typeof message.groupId === 'string' 
        ? parseInt(message.groupId, 10) 
        : message.groupId;
      
      if (messageGroupId === this.selectedGroupId) {
        // Verificar que el mensaje no esté ya en la lista
        if (!this.messages.find(m => m.id === message.id)) {
          this.messages.push(message);
          this.renderMessages();
        }
      }
    };

    socketService.on('new_message', newMessageHandler);
    this.socketListeners.push({ event: 'new_message', callback: newMessageHandler });

    // Listener para mensajes eliminados
    const deletedMessageHandler = (eventData) => {
      // El evento puede venir envuelto en { type, data, timestamp } o directamente como data
      const data = eventData.data || eventData;
      const messageId = data.messageId || data.id;
      const dataGroupId = typeof data.groupId === 'string' 
        ? parseInt(data.groupId, 10) 
        : data.groupId;
      
      if (dataGroupId === this.selectedGroupId && messageId) {
        this.messages = this.messages.filter(m => m.id !== messageId);
        this.renderMessages();
      }
    };

    socketService.on('message_deleted', deletedMessageHandler);
    this.socketListeners.push({ event: 'message_deleted', callback: deletedMessageHandler });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  renderGroupsList(groups) {
    return `
      <div class="table-container mt-2">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${groups.map(group => `
              <tr>
                <td>${group.nombre}</td>
                <td><span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span></td>
                <td><a href="#/groups/${group.id}" class="btn btn-secondary btn-sm">Ver</a></td>
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
                <td>${session.tema || '-'}</td>
                <td><span class="badge badge--${getStatusColor(session.estado)}">${getStatusName(session.estado)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

export default new DashboardView();


