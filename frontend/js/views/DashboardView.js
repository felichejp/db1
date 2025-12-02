import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { messagesAPI } from '../api/messages.js';
import { sessionsAPI } from '../api/sessions.js';
import { tutorsAPI } from '../api/tutors.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { joinGroupRooms } from '../utils/socketHelpers.js';
import socketService from '../services/socketService.js';

/**
 * Vista de Dashboard con Grupos y Chat
 */
class DashboardView {
  constructor() {
    this.selectedGroupId = null;
    this.messages = [];
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user) {
      console.error('No hay usuario autenticado');
      window.location.hash = '#/login';
      return;
    }

    const container = document.getElementById('view-container');
    if (!container) {
      console.error('view-container no encontrado');
      return;
    }

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Sidebar de Grupos (se mostrará solo si hay grupos) -->
        <aside class="groups-sidebar" id="groups-sidebar" style="display: none;">
          <h2 class="groups-sidebar__title">Mis Grupos</h2>
          <div id="groups-list" class="groups-list">
            <div class="spinner"></div>
          </div>
        </aside>
        
        <!-- Área de Chat -->
        <main class="chat-area" id="chat-area">
          <div id="chat-container" class="chat-container">
            <div class="chat-empty">
              <p class="text-muted">Cargando grupos...</p>
            </div>
          </div>
        </main>
      </div>
    `;

    try {
      Loading.show();
      await this.loadGroups(user);
    } catch (error) {
      console.error('Error en render del dashboard:', error);
      const chatContainer = document.getElementById('chat-container');
      if (chatContainer) {
        chatContainer.innerHTML = `
          <div class="chat-empty">
            <div class="empty-state">
              <p class="text-muted" style="font-size: 1.2rem;">Error al cargar el dashboard</p>
              <p class="text-muted" style="margin-top: var(--spacing-md);">Por favor, recarga la página</p>
            </div>
          </div>
        `;
      }
      Notification.error('Error al cargar los grupos');
    } finally {
      Loading.hide();
    }
  }

  async loadGroups(user) {
    const groupsList = document.getElementById('groups-list');
    const groupsSidebar = document.getElementById('groups-sidebar');
    const chatArea = document.getElementById('chat-area');
    const chatContainer = document.getElementById('chat-container');
    
    try {
      console.log('Cargando grupos...');
      const groupsRes = await groupsAPI.getAll();
      console.log('Respuesta de grupos:', groupsRes);
      
      // Manejar errores de conexión
      if (!groupsRes) {
        console.error('No se recibió respuesta del servidor');
        if (groupsSidebar) groupsSidebar.style.display = 'none';
        if (chatArea) {
          chatArea.style.width = '100%';
          chatArea.style.margin = '0 auto';
        }
        if (chatContainer) {
          chatContainer.innerHTML = `
            <div class="chat-empty">
              <div class="empty-state">
                <p class="text-muted" style="font-size: 1.2rem;">No se pudo conectar al servidor</p>
                <p class="text-muted" style="margin-top: var(--spacing-md);">Verifica que el backend esté corriendo en ${window.API_BASE_URL || 'http://localhost:3000'}</p>
              </div>
            </div>
          `;
        }
        return;
      }

      // Manejar errores 401
      if (groupsRes?.error?.response?.status === 401 || 
          (groupsRes instanceof Error && groupsRes.response?.status === 401)) {
        authService.logout();
        window.location.hash = '#/login';
        return;
      }

      // El backend puede devolver { success: true, data: [...] } o directamente [...]
      let groups = [];
      if (groupsRes.success && groupsRes.data) {
        groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];
      } else if (Array.isArray(groupsRes)) {
        groups = groupsRes;
      } else if (groupsRes.data && Array.isArray(groupsRes.data)) {
        groups = groupsRes.data;
      } else if (!groupsRes.success) {
        // Error del backend
        console.error('Error del backend:', groupsRes);
        if (groupsSidebar) groupsSidebar.style.display = 'none';
        if (chatArea) {
          chatArea.style.width = '100%';
          chatArea.style.margin = '0 auto';
        }
        if (chatContainer) {
          chatContainer.innerHTML = `
            <div class="chat-empty">
              <div class="empty-state">
                <p class="text-muted" style="font-size: 1.2rem;">Error al cargar grupos</p>
                <p class="text-muted" style="margin-top: var(--spacing-md);">${groupsRes?.message || groupsRes?.error || 'Intenta recargar la página'}</p>
              </div>
            </div>
          `;
        }
        return;
      }

      console.log('Grupos encontrados:', groups.length);

      // Si no hay grupos, mostrar mensaje pero mantener el sidebar visible
      if (groups.length === 0) {
        if (groupsSidebar) {
          groupsSidebar.style.display = 'block';
        }
        if (groupsList) {
          groupsList.innerHTML = `
            <div class="empty-groups-message">
              <p class="text-muted" style="text-align: center; padding: var(--spacing-lg);">
                No hay grupos disponibles
              </p>
              <p class="text-muted" style="text-align: center; font-size: 0.9rem; padding: 0 var(--spacing-md) var(--spacing-md);">
                Los grupos aparecerán aquí cuando sean creados
              </p>
            </div>
          `;
        }
        if (chatArea) {
          chatArea.style.width = '';
          chatArea.style.margin = '';
        }
        if (chatContainer) {
          chatContainer.innerHTML = `
            <div class="chat-empty">
              <div class="empty-state">
                <p class="text-muted" style="font-size: 1.2rem;">No hay grupos disponibles</p>
                <p class="text-muted" style="margin-top: var(--spacing-md);">Los grupos aparecerán aquí cuando sean creados en el sistema</p>
              </div>
            </div>
          `;
        }
        return;
      }

      // Si hay grupos, mostrar el sidebar
      if (groupsSidebar) {
        groupsSidebar.style.display = 'block';
      }
      if (chatArea) {
        chatArea.style.width = '';
        chatArea.style.margin = '';
      }
      
      if (!groupsList) {
        console.error('groups-list element not found');
        return;
      }

      // Unirse a rooms de grupos para recibir mensajes en tiempo real
      if (groups.length > 0) {
        await joinGroupRooms(groups);
        this.setupSocketListeners();
      }

      // Renderizar grupos con información básica
      groupsList.innerHTML = groups.map(group => {
        const materia = group.nombre || `Materia id ${group.id}`;
        return `
          <div class="group-item" id="group-${group.id}">
            <div class="group-item__header">
              <div class="group-item__materia">${materia}</div>
              <div class="group-item__menu">
                <button class="group-menu-btn" data-group-id="${group.id}" type="button">
                  <span>⋮</span>
                </button>
                <div class="group-menu-dropdown" id="menu-${group.id}" style="display: none;">
                  <button class="group-menu-item" data-action="details" data-group-id="${group.id}">
                    Ver detalles
                  </button>
                  <button class="group-menu-item" data-action="chat" data-group-id="${group.id}">
                    Abrir chat
                  </button>
                </div>
              </div>
            </div>
            <div class="group-item__info">
              <div class="group-item__field">
                <strong>Responsable:</strong> <span class="group-field-value">Cargando...</span>
              </div>
              <div class="group-item__field">
                <strong>Asesor:</strong> <span class="group-field-value">Cargando...</span>
              </div>
              <div class="group-item__field">
                <strong>Integrantes:</strong> <span class="group-field-value">Cargando...</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      // Agregar event listeners a los menús desplegables
      document.querySelectorAll('.group-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const groupId = btn.getAttribute('data-group-id');
          const menu = document.getElementById(`menu-${groupId}`);
          const isOpen = menu.style.display !== 'none';
          
          // Cerrar todos los menús
          document.querySelectorAll('.group-menu-dropdown').forEach(m => {
            m.style.display = 'none';
          });
          
          // Abrir/cerrar el menú actual
          if (!isOpen) {
            menu.style.display = 'block';
          }
        });
      });

      // Cerrar menús al hacer clic fuera
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.group-item__menu')) {
          document.querySelectorAll('.group-menu-dropdown').forEach(m => {
            m.style.display = 'none';
          });
        }
      });

      // Event listeners para las opciones del menú
      document.querySelectorAll('.group-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = item.getAttribute('data-action');
          const groupId = item.getAttribute('data-group-id');
          const group = groups.find(g => g.id === parseInt(groupId));
          
          if (action === 'details') {
            window.location.hash = `#/group/${groupId}`;
          } else if (action === 'chat') {
            this.selectGroup(parseInt(groupId), group);
          }
          
          // Cerrar el menú
          document.querySelectorAll('.group-menu-dropdown').forEach(m => {
            m.style.display = 'none';
          });
        });
      });

      // Agregar event listeners para seleccionar grupo (para chat)
      groups.forEach(group => {
        const groupElement = document.getElementById(`group-${group.id}`);
        if (groupElement) {
          // Hacer clickeable todo el grupo excepto el botón
          groupElement.style.cursor = 'pointer';
          groupElement.addEventListener('click', (e) => {
            // Solo seleccionar si no se hizo clic en el botón
            if (!e.target.closest('.group-details-btn')) {
              this.selectGroup(group.id, group);
            }
          });
        }
      });

      // Cargar detalles de cada grupo
      groups.forEach(async (group) => {
        await this.loadGroupDetails(group);
      });

      // Seleccionar el primer grupo por defecto para mostrar su chat
      if (groups.length > 0) {
        this.selectGroup(groups[0].id, groups[0]);
      }
    } catch (error) {
      console.error('Error cargando grupos:', error);
      groupsList.innerHTML = '<p class="text-muted">Error al cargar los grupos</p>';
    }
  }

  async loadGroupDetails(group) {
    let responsableNombre = 'Sin asignar';
    let tutorNombre = 'Sin asignar';
    let miembrosCount = 0;

    try {
      // Obtener sesiones del grupo para encontrar el tutor responsable
      const sessionsRes = await sessionsAPI.getAll();
      if (sessionsRes.success && sessionsRes.data) {
        const groupSessions = sessionsRes.data.filter(s => {
          const sessionGroupId = parseInt(s.groupId || s.group_id || 0);
          return sessionGroupId === parseInt(group.id);
        });
        
        // Obtener el tutor de la primera sesión (o de cualquier sesión)
        if (groupSessions.length > 0 && groupSessions[0].tutorId) {
          try {
            const tutorRes = await tutorsAPI.getById(groupSessions[0].tutorId);
            if (tutorRes.success && tutorRes.data) {
              responsableNombre = tutorRes.data.nombre || 'Sin asignar';
            }
          } catch (error) {
            console.warn('Error obteniendo tutor:', error);
          }
        }
      }

      // Obtener detalles completos del grupo
      const groupDetails = await groupsAPI.getById(group.id);
      if (groupDetails.success) {
        const details = groupDetails.data;
        // El profesor es el responsable del grupo
        const profesorNombre = details.profesor?.nombre || details.profesorNombre || group.profesor?.nombre;
        if (profesorNombre) {
          responsableNombre = profesorNombre;
        }
        
        // Obtener miembros
        const membersRes = await groupsAPI.getMembers(group.id);
        if (membersRes.success) {
          miembrosCount = membersRes.data?.length || 0;
        } else if (group.members) {
          miembrosCount = Array.isArray(group.members) ? group.members.length : 0;
        }
      } else {
        // Si falla, intentar con datos básicos
        if (group.profesor) {
          responsableNombre = typeof group.profesor === 'string' ? group.profesor : group.profesor.nombre;
        }
        if (group.members) {
          miembrosCount = Array.isArray(group.members) ? group.members.length : 0;
        }
      }
    } catch (error) {
      console.warn('Error obteniendo detalles del grupo:', error);
      // Usar datos básicos del grupo si están disponibles
      if (group.profesor) {
        responsableNombre = typeof group.profesor === 'string' ? group.profesor : group.profesor.nombre;
      }
      if (group.members) {
        miembrosCount = Array.isArray(group.members) ? group.members.length : 0;
      }
    }

    // Actualizar el elemento del grupo
    const groupElement = document.getElementById(`group-${group.id}`);
    if (groupElement) {
      const fields = groupElement.querySelectorAll('.group-field-value');
      if (fields.length >= 3) {
        fields[0].textContent = responsableNombre;
        fields[1].textContent = tutorNombre || 'Sin asignar';
        fields[2].textContent = `${miembrosCount} de 1 a 5 estudiantes máximo`;
      }
    }
  }

  async selectGroup(groupId, group) {
    this.selectedGroupId = groupId;
    
    // Actualizar estado visual de los grupos
    document.querySelectorAll('.group-item').forEach(item => {
      item.classList.remove('active');
    });
    const selectedItem = document.getElementById(`group-${groupId}`);
    if (selectedItem) {
      selectedItem.classList.add('active');
    }

    // Cargar mensajes del grupo
    await this.loadMessages(groupId);
    
    // Unirse al room del grupo para recibir mensajes en tiempo real
    socketService.joinGroup(groupId);
  }

  async loadMessages(groupId) {
    const chatContainer = document.getElementById('chat-container');
    
    try {
      const response = await messagesAPI.getByGroup(groupId);
      this.messages = response.success ? response.data : [];
      
      // Obtener nombre del grupo
      let groupName = `Grupo ${groupId}`;
      try {
        const groupRes = await groupsAPI.getById(groupId);
        if (groupRes.success && groupRes.data) {
          groupName = groupRes.data.nombre || groupName;
        } else if (groupRes.data) {
          groupName = groupRes.data.nombre || groupName;
        }
      } catch (error) {
        console.warn('Error obteniendo nombre del grupo:', error);
      }
      
      chatContainer.innerHTML = `
        <div class="chat-header">
          <div class="chat-header__left">
            <button class="btn btn-secondary btn-sm" id="back-to-dashboard-btn" title="Volver al inicio">
              ← Inicio
            </button>
            <h3>Chat del grupo: ${groupName}</h3>
          </div>
          <div class="chat-header__right">
            <button class="btn btn-primary btn-sm" id="view-group-details-btn" data-group-id="${groupId}" title="Ver detalles del grupo">
              Ver detalles
            </button>
          </div>
        </div>
        <div class="chat-messages" id="chat-messages">
          ${this.messages.map(msg => this.renderMessage(msg)).join('')}
        </div>
        <div class="chat-input-container">
          <input 
            type="text" 
            id="message-input" 
            class="chat-input" 
            placeholder="Escribe un mensaje"
          />
          <button id="send-message-btn" class="btn btn-primary">enviar</button>
        </div>
      `;

      // Event listener para el botón de volver
      const backBtn = document.getElementById('back-to-dashboard-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          // Deseleccionar el grupo actual
          this.selectedGroupId = null;
          document.querySelectorAll('.group-item').forEach(item => {
            item.classList.remove('active');
          });
          
          // Mostrar estado vacío del chat
          const chatContainer = document.getElementById('chat-container');
          if (chatContainer) {
            chatContainer.innerHTML = `
              <div class="chat-empty">
                <div class="empty-state">
                  <p class="text-muted" style="font-size: 1.2rem;">Selecciona un grupo para ver su chat</p>
                  <p class="text-muted" style="margin-top: var(--spacing-md);">Haz clic en un grupo de la lista para comenzar a chatear</p>
                </div>
              </div>
            `;
          }
        });
      }

      // Event listener para el botón de ver detalles
      const detailsBtn = document.getElementById('view-group-details-btn');
      if (detailsBtn) {
        detailsBtn.addEventListener('click', () => {
          window.location.hash = `#/group/${groupId}`;
        });
      }

      // Scroll al final de los mensajes
      const messagesDiv = document.getElementById('chat-messages');
      if (messagesDiv) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }

      // Event listeners para enviar mensaje
      const messageInput = document.getElementById('message-input');
      const sendBtn = document.getElementById('send-message-btn');
      
      const sendMessage = async () => {
        const content = messageInput.value.trim();
        if (!content) return;

        try {
          const response = await messagesAPI.create({
            groupId: parseInt(groupId),
            content: content
          });
          
          if (response.success || response.id) {
            messageInput.value = '';
            // Recargar mensajes
            await this.loadMessages(groupId);
          } else {
            Notification.error(response.message || 'Error al enviar mensaje');
          }
        } catch (error) {
          console.error('Error completo al enviar mensaje:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Error al enviar mensaje';
          Notification.error(errorMessage);
        }
      };

      sendBtn.addEventListener('click', sendMessage);
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      chatContainer.innerHTML = '<p class="text-muted">Error al cargar los mensajes</p>';
    }
  }

  renderMessage(message) {
    const user = authService.getCurrentUser();
    const isOwnMessage = message.userId === user.id;
    const messageDate = new Date(message.createdAt || message.created_at);
    const timeStr = messageDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="message ${isOwnMessage ? 'message--own' : 'message--other'}">
        <div class="message__content">
          ${message.contenido || message.content}
        </div>
        <div class="message__time">${timeStr}</div>
      </div>
    `;
  }

  setupSocketListeners() {
    // Escuchar nuevos mensajes
    socketService.on('new_message', (data) => {
      if (data.groupId === this.selectedGroupId) {
        this.messages.push(data);
        this.updateChatMessages();
      }
    });
  }

  updateChatMessages() {
    const messagesDiv = document.getElementById('chat-messages');
    if (messagesDiv) {
      messagesDiv.innerHTML = this.messages.map(msg => this.renderMessage(msg)).join('');
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }
}

export default new DashboardView();


