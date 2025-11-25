import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { messagesAPI } from '../api/messages.js';
import socketService from '../services/socketService.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, getStatusName, getStatusColor } from '../utils/helpers.js';

/**
 * Vista de Grupo con Chat
 */
class GroupView {
  constructor() {
    this.currentGroupId = null;
    this.messages = [];
    this.members = [];
    this.currentUser = null;
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

    this.currentUser = user;
    const hash = window.location.hash;
    const match = hash.match(/#\/groups\/(\d+)/);
    
    if (!match || !match[1]) {
      Notification.error('ID de grupo inválido');
      window.location.hash = '#/dashboard';
      return;
    }

    this.currentGroupId = parseInt(match[1], 10);
    
    if (isNaN(this.currentGroupId) || this.currentGroupId <= 0) {
      Notification.error('ID de grupo inválido');
      window.location.hash = '#/dashboard';
      return;
    }
    
    console.log('ID de grupo extraído:', this.currentGroupId);

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title" id="group-title">Cargando grupo...</h1>
        </div>
        <div class="card__body">
          <div id="group-content">
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
      console.error('Error en render:', error);
      let errorMessage = 'Error al cargar el grupo';
      
      if (error.response) {
        // Error de respuesta del servidor
        errorMessage = error.response.data?.message || error.response.statusText || errorMessage;
        console.error('Detalles del error:', {
          status: error.response.status,
          data: error.response.data,
          message: errorMessage
        });
      } else if (error.request) {
        // Error de red
        errorMessage = 'Error de conexión. Verifica que el servidor esté corriendo.';
        console.error('Error de red:', error.request);
      } else {
        // Otro tipo de error
        errorMessage = error.message || errorMessage;
        console.error('Error:', error);
      }
      
      Notification.error(errorMessage);
      window.location.hash = '#/dashboard';
    } finally {
      Loading.hide();
    }
  }

  async loadGroupData() {
    try {
      console.log('Cargando datos del grupo:', this.currentGroupId);
      
      // Verificar que el ID sea válido antes de hacer las peticiones
      if (!this.currentGroupId || isNaN(this.currentGroupId)) {
        throw new Error('ID de grupo inválido');
      }
      
      const [groupRes, membersRes, messagesRes] = await Promise.all([
        groupsAPI.getById(this.currentGroupId),
        groupsAPI.getMembers(this.currentGroupId),
        messagesAPI.getByGroup(this.currentGroupId)
      ]);

      console.log('Respuestas recibidas:', { groupRes, membersRes, messagesRes });

      if (!groupRes.success) {
        throw new Error('Grupo no encontrado');
      }

      const group = groupRes.data;
      this.members = membersRes.success ? membersRes.data : [];
      this.messages = messagesRes.success ? messagesRes.data : [];

      console.log('Grupo:', group);
      console.log('Miembros:', this.members);
      console.log('Mensajes:', this.messages);

      // Si hay un profesor, agregarlo a la lista de miembros si no está
      if (group.profesorId) {
        const profesorInMembers = this.members.some(m => m.id === group.profesorId);
        if (!profesorInMembers) {
          // Intentar obtener información del profesor
          try {
            const profesorRes = await groupsAPI.getById(this.currentGroupId);
            if (profesorRes.success && profesorRes.data.profesorId) {
              // El profesor ya está en el grupo, solo necesitamos agregarlo visualmente
              // O podemos hacer una consulta adicional si es necesario
            }
          } catch (e) {
            console.warn('No se pudo obtener información del profesor:', e);
          }
        }
      }

      // Verificar que el usuario es miembro del grupo
      const isMember = this.members.some(m => m.id === this.currentUser.id) ||
                      group.profesorId === this.currentUser.id ||
                      this.currentUser.role === 'Admin';

      if (!isMember) {
        Notification.error('No tienes acceso a este grupo');
        window.location.hash = '#/dashboard';
        return;
      }

      this.renderGroupContent(group);
      this.scrollToBottom();
    } catch (error) {
      console.error('Error cargando datos del grupo:', error);
      
      let errorMessage = 'Error desconocido';
      if (error.response) {
        errorMessage = error.response.data?.message || `Error ${error.response.status}: ${error.response.statusText}`;
        console.error('Detalles del error del servidor:', {
          status: error.response.status,
          data: error.response.data
        });
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Notification.error(`Error: ${errorMessage}`);
      throw error;
    }
  }

  renderGroupContent(group) {
    console.log('Renderizando contenido del grupo:', group);
    const titleEl = document.getElementById('group-title');
    if (!titleEl) {
      console.error('No se encontró el elemento group-title');
      return;
    }
    
    titleEl.textContent = group.nombre;

    const content = document.getElementById('group-content');
    if (!content) {
      console.error('No se encontró el elemento group-content');
      return;
    }

    // Separar alumnos del profesor
    const alumnos = this.members.filter(m => m.role !== 'Profesor');
    const profesor = this.members.find(m => m.role === 'Profesor') || 
                     (group.profesorId ? {
                       id: group.profesorId,
                       nombre: group.profesorNombre || 'Sin asignar',
                       email: group.profesorEmail || '',
                       role: 'Profesor'
                     } : null);

    // Preparar lista de todos los miembros para el sidebar
    let allMembers = [...this.members];
    if (profesor && !allMembers.some(m => m.id === profesor.id)) {
      allMembers.push(profesor);
    }

    // Formatear fecha de creación
    const fechaCreacion = group.createdAt ? formatDate(group.createdAt) : 'No disponible';
    
    // Formatear fecha de actualización
    const fechaActualizacion = group.updatedAt ? formatDate(group.updatedAt) : 'No disponible';

    const messagesHtml = this.renderMessages();
    console.log('HTML de mensajes generado:', messagesHtml);

    content.innerHTML = `
      <!-- Información del Grupo -->
      <div class="group-info-section">
        <div class="group-info__card">
          <h3 class="group-info__title">Información del Grupo</h3>
          <div class="group-info__grid">
            <div class="group-info__item">
              <span class="group-info__label">Estado:</span>
              <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Profesor/Maestro:</span>
              <span class="group-info__value">${profesor ? profesor.nombre : 'Sin asignar'}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Cantidad de Alumnos:</span>
              <span class="group-info__value">${alumnos.length}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Fecha de Creación:</span>
              <span class="group-info__value">${fechaCreacion}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Última Actualización:</span>
              <span class="group-info__value">${fechaActualizacion}</span>
            </div>
            ${group.descripcion ? `
            <div class="group-info__item group-info__item--full">
              <span class="group-info__label">Descripción:</span>
              <span class="group-info__value">${this.escapeHtml(group.descripcion)}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Lista de Alumnos -->
        <div class="group-info__card">
          <h3 class="group-info__title">Alumnos del Grupo (${alumnos.length})</h3>
          ${alumnos.length > 0 ? `
            <ul class="group-students-list">
              ${alumnos.map(alumno => `
                <li class="group-students__item">
                  <span class="group-students__name">${this.escapeHtml(alumno.nombre || 'Sin nombre')}</span>
                  ${alumno.grado ? `<span class="group-students__grade">Grado ${alumno.grado}</span>` : ''}
                </li>
              `).join('')}
            </ul>
          ` : '<p class="text-muted">No hay alumnos en este grupo</p>'}
        </div>
      </div>

      <!-- Chat del Grupo -->
      <div class="group-chat-container">
        <div class="group-chat__sidebar">
          <div class="group-chat__members">
            <h3>Miembros (${allMembers.length})</h3>
            <ul class="member-list">
              ${allMembers.map(member => `
                <li class="member-item">
                  <span class="member-name">${this.escapeHtml(member.nombre || 'Sin nombre')}</span>
                  <span class="member-role">${member.role || 'Sin rol'}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
        <div class="group-chat__main">
          <div class="chat-messages" id="chat-messages">
            ${messagesHtml}
          </div>
          <div class="chat-input-container">
            <form id="chat-form" class="chat-form">
              <input 
                type="text" 
                id="message-input" 
                class="chat-input" 
                placeholder="Escribe un mensaje..." 
                autocomplete="off"
                required
              />
              <button type="submit" class="btn btn-primary chat-send-btn">
                Enviar
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    // Configurar evento de envío
    const form = document.getElementById('chat-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSendMessage(e));
    } else {
      console.error('No se encontró el formulario de chat');
    }

    // Unirse al room del grupo en Socket.IO
    const socket = socketService.connect();
    if (socket) {
      socketService.joinGroup(this.currentGroupId);
      console.log('Unido al grupo de Socket.IO:', this.currentGroupId);
    } else {
      console.warn('No se pudo conectar a Socket.IO');
    }
  }

  renderMessages() {
    console.log('Renderizando mensajes. Total:', this.messages.length);
    if (this.messages.length === 0) {
      return '<div class="chat-empty">No hay mensajes aún. ¡Sé el primero en escribir!</div>';
    }

    return this.messages.map(message => {
      const isOwn = message.senderId === this.currentUser.id;
      const senderName = message.senderName || 'Usuario';
      let timeStr = '';
      
      try {
        const messageDate = new Date(message.createdAt);
        timeStr = messageDate.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } catch (e) {
        console.warn('Error formateando fecha:', e);
        timeStr = 'Ahora';
      }

      return `
        <div class="chat-message ${isOwn ? 'chat-message--own' : ''}">
          <div class="chat-message__content">
            ${!isOwn ? `<div class="chat-message__sender">${this.escapeHtml(senderName)}</div>` : ''}
            <div class="chat-message__text">${this.escapeHtml(message.content || '')}</div>
            <div class="chat-message__time">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  async handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('message-input');
    if (!input) {
      console.error('No se encontró el input de mensaje');
      return;
    }

    const content = input.value.trim();

    if (!content) return;

    console.log('Enviando mensaje:', { groupId: this.currentGroupId, content });

    try {
      input.disabled = true;
      const response = await messagesAPI.create({
        groupId: this.currentGroupId,
        content: content,
        tipo: 'texto'
      });

      console.log('Respuesta del servidor:', response);

      if (response.success) {
        input.value = '';
        
        // Agregar mensaje inmediatamente si no existe ya (evitar duplicados)
        const message = response.data;
        console.log('Mensaje recibido:', message);
        
        if (!message) {
          console.error('El mensaje no está en la respuesta');
          Notification.error('Error: No se recibió el mensaje');
          return;
        }

        const exists = this.messages.some(m => m.id === message.id);
        if (!exists) {
          // Asegurar que tenga el nombre del remitente
          if (!message.senderName) {
            message.senderName = this.currentUser.nombre || this.currentUser.email;
          }
          this.messages.push(message);
          console.log('Mensaje agregado. Total de mensajes:', this.messages.length);
          this.updateMessagesDisplay();
          this.scrollToBottom();
        } else {
          console.log('El mensaje ya existe, no se agregará duplicado');
        }
      } else {
        console.error('Error en la respuesta:', response);
        Notification.error(response.message || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      Notification.error(`Error al enviar mensaje: ${error.message || 'Error desconocido'}`);
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  setupSocketListeners() {
    console.log('Configurando listeners de Socket.IO');
    
    // Escuchar nuevos mensajes
    socketService.on('new_message', (data) => {
      console.log('Evento new_message recibido:', data);
      if (data && data.data && data.data.groupId === this.currentGroupId) {
        // Obtener información del remitente si no está incluida
        const message = data.data;
        console.log('Procesando nuevo mensaje:', message);
        
        if (!message.senderName) {
          const sender = this.members.find(m => m.id === message.senderId);
          if (sender) {
            message.senderName = sender.nombre;
          } else if (message.senderId === this.currentUser.id) {
            message.senderName = this.currentUser.nombre || this.currentUser.email;
          }
        }
        
        // Evitar duplicados
        const exists = this.messages.some(m => m.id === message.id);
        if (!exists) {
          console.log('Agregando nuevo mensaje vía Socket.IO');
          this.messages.push(message);
          this.updateMessagesDisplay();
          
          // Scroll automático solo si el usuario está al final del chat
          const messagesContainer = document.getElementById('chat-messages');
          if (messagesContainer) {
            const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 100;
            if (isAtBottom) {
              this.scrollToBottom();
            }
          }
        } else {
          console.log('Mensaje duplicado ignorado');
        }
      } else {
        console.log('Mensaje no es para este grupo o formato incorrecto');
      }
    });

    // Escuchar notificaciones de mensajes nuevos
    socketService.on('message_notification', (data) => {
      console.log('Evento message_notification recibido:', data);
      if (data && data.data && data.data.groupId === this.currentGroupId) {
        // Solo mostrar notificación si no es el usuario actual quien envió el mensaje
        if (data.data.senderId !== this.currentUser.id) {
          const senderName = data.data.senderName || 'Alguien';
          Notification.info(`Nuevo mensaje de ${senderName} en ${data.data.groupName || 'el grupo'}`);
        }
      }
    });
  }

  updateMessagesDisplay() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = this.renderMessages();
    }
  }

  scrollToBottom() {
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

  // Limpiar listeners al salir de la vista
  cleanup() {
    if (this.currentGroupId) {
      socketService.leaveGroup(this.currentGroupId);
    }
    socketService.off('new_message');
    socketService.off('message_notification');
  }
}

export default new GroupView();

