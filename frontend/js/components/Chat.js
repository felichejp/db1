import socketService from '../services/socketService.js';
import authService from '../services/authService.js';
import { messagesAPI } from '../api/messages.js';

/**
 * Componente de Chat flotante estilo Roblox
 * Permite chatear con otros estudiantes
 */
class Chat {
  constructor() {
    this.isOpen = false;
    this.isMinimized = false;
    this.currentChatId = null;
    this.messages = [];
    this.onlineUsers = [];
    this.currentUser = null;
    this.container = null;
    this.chatContainer = null;
    this.messagesContainer = null;
    this.inputContainer = null;
    this.usersList = null;
    this.initialized = false;
    this.initializing = false;
  }

  /**
   * Inicializa el componente de chat
   */
  async init() {
    // Evitar inicializaciones múltiples
    if (this.initialized) {
      console.log('Chat ya inicializado, omitiendo...');
      return;
    }
    
    if (this.initializing) {
      console.log('Chat en proceso de inicialización, esperando...');
      return;
    }

    this.initializing = true;
    console.log('Inicializando chat...');
    
    // Crear UI primero (siempre visible)
    this.createChatUI();
    
    // Obtener usuario actual
    const token = authService.getToken();
    if (!token) {
      console.log('No hay token, chat deshabilitado');
      this.showNotAuthenticated();
      this.initializing = false;
      return;
    }

    try {
      // Asegurar que el token se envíe en la petición
      const response = await axios.get(`${window.API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      this.currentUser = response.data.data;
      console.log('Usuario obtenido:', this.currentUser);
      
      // Solo estudiantes pueden usar el chat
      if (this.currentUser.role !== 'Estudiante') {
        console.log('El chat solo está disponible para estudiantes');
        this.showNotAvailable();
        this.initializing = false;
        return;
      }
      
      this.setupSocketListeners();
      
      // Asegurar que usersList esté disponible antes de cargar
      if (!this.usersList) {
        this.usersList = this.container?.querySelector('#chat-users-list');
      }
      
      if (this.usersList) {
        await this.loadOnlineUsers();
      } else {
        console.error('No se pudo encontrar usersList, reintentando...');
        // Reintentar después de un pequeño delay
        setTimeout(async () => {
          this.usersList = this.container?.querySelector('#chat-users-list');
          if (this.usersList) {
            await this.loadOnlineUsers();
          } else {
            console.error('usersList aún no disponible');
            this.showError('Error al inicializar el chat. Por favor, recarga la página.');
          }
        }, 100);
      }
      
      this.initialized = true;
      this.initializing = false;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      
      // Si es un error 401, mostrar mensaje de autenticación
      if (error.response?.status === 401) {
        this.showNotAuthenticated();
      } else {
        this.showError('Error al cargar el chat. Por favor, recarga la página.');
      }
      
      this.initializing = false;
    }
  }

  /**
   * Crea la interfaz del chat
   */
  createChatUI() {
    // Evitar crear duplicados
    if (document.getElementById('chat-container')) {
      console.log('Chat ya existe, actualizando referencias');
      this.container = document.getElementById('chat-container');
      
      // Actualizar referencias a elementos
      this.chatContainer = this.container.querySelector('.chat-body');
      this.messagesContainer = this.container.querySelector('#chat-messages-container');
      this.inputContainer = this.container.querySelector('#chat-input-container');
      this.usersList = this.container.querySelector('#chat-users-list');
      
      console.log('Referencias actualizadas:', {
        container: !!this.container,
        chatContainer: !!this.chatContainer,
        messagesContainer: !!this.messagesContainer,
        inputContainer: !!this.inputContainer,
        usersList: !!this.usersList
      });
      
      return;
    }

    // Contenedor principal del chat
    this.container = document.createElement('div');
    this.container.id = 'chat-container';
    this.container.className = 'chat-container';
    this.container.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-content">
          <h3 class="chat-title">💬 Chat</h3>
          <div class="chat-header-actions">
            <button class="chat-btn-minimize" title="Minimizar">
              <span>−</span>
            </button>
            <button class="chat-btn-close" title="Cerrar">
              <span>×</span>
            </button>
          </div>
        </div>
      </div>
      
      <div class="chat-body">
        <div class="chat-users-panel" id="chat-users-panel">
          <div class="chat-users-header">
            <h4>Estudiantes</h4>
            <span class="chat-online-indicator" id="chat-online-count">0 online</span>
          </div>
          <div class="chat-users-list" id="chat-users-list">
            <div class="chat-users-empty">Cargando estudiantes...</div>
          </div>
        </div>
        
        <div class="chat-messages-panel" id="chat-messages-panel">
          <div class="chat-messages-header">
            <h4 id="chat-current-user-name">Selecciona un estudiante</h4>
          </div>
          <div class="chat-messages-container" id="chat-messages-container">
            <div class="chat-messages-empty">
              <p>Selecciona un estudiante para comenzar a chatear</p>
            </div>
          </div>
          <div class="chat-input-container" id="chat-input-container">
            <input 
              type="text" 
              class="chat-input" 
              id="chat-input" 
              placeholder="Escribe un mensaje..." 
              disabled
            />
            <button class="chat-send-btn" id="chat-send-btn" disabled>
              <span>➤</span>
            </button>
          </div>
        </div>
      </div>
      
      <button class="chat-toggle-btn" id="chat-toggle-btn" title="Abrir chat">
        <span class="chat-toggle-icon">💬</span>
        <span class="chat-toggle-badge" id="chat-toggle-badge" style="display: none;">0</span>
      </button>
    `;

    document.body.appendChild(this.container);

    // Referencias a elementos
    this.chatContainer = this.container.querySelector('.chat-body');
    this.messagesContainer = this.container.querySelector('#chat-messages-container');
    this.inputContainer = this.container.querySelector('#chat-input-container');
    this.usersList = this.container.querySelector('#chat-users-list');
    const chatInput = this.container.querySelector('#chat-input');
    const sendBtn = this.container.querySelector('#chat-send-btn');
    const toggleBtn = this.container.querySelector('#chat-toggle-btn');
    const minimizeBtn = this.container.querySelector('.chat-btn-minimize');
    const closeBtn = this.container.querySelector('.chat-btn-close');

    // Event listeners
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
      // Asegurar que el botón sea visible
      toggleBtn.style.display = 'flex';
    }
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
    
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // Inicialmente cerrado (pero el botón visible)
    this.close();
    
    console.log('Chat UI creada correctamente');
  }

  /**
   * Configura los listeners de Socket.IO
   */
  setupSocketListeners() {
    // Escuchar nuevos mensajes de grupo
    socketService.on('new_message', (data) => {
      if (data.data && data.data.senderId !== this.currentUser.id) {
        this.handleNewMessage(data.data);
      }
    });

    // Escuchar mensajes directos
    socketService.on('new_direct_message', (data) => {
      // Verificar si el mensaje es para el chat actual
      const isForCurrentChat = 
        (data.senderId === this.currentChatId && data.recipientId === this.currentUser.id) ||
        (data.recipientId === this.currentChatId && data.senderId === this.currentUser.id);

      if (isForCurrentChat && this.currentChatId) {
        // Solo agregar si no es nuestro propio mensaje (ya lo agregamos localmente)
        if (data.senderId !== this.currentUser.id) {
          const message = {
            ...data,
            senderName: this.onlineUsers.find(u => u.id === data.senderId)?.nombre || 'Usuario',
            createdAt: data.timestamp || new Date()
          };
          this.messages.push(message);
          this.renderMessages();
        }
      } else if (data.senderId !== this.currentUser.id) {
        // Mostrar notificación si el chat no está abierto o es de otro usuario
        this.showNewMessageNotification(data);
      }
    });

    // Escuchar usuarios conectados/desconectados
    socketService.on('user_online', (data) => {
      this.updateOnlineUsers(data.data);
    });

    socketService.on('user_offline', (data) => {
      this.removeOnlineUser(data.data.userId);
    });
  }

  /**
   * Carga la lista de estudiantes disponibles
   */
  async loadOnlineUsers() {
    console.log('loadOnlineUsers: Iniciando carga de estudiantes...');
    
    // Asegurar que usersList esté disponible
    if (!this.usersList) {
      this.usersList = document.querySelector('#chat-users-list');
      if (!this.usersList) {
        console.error('usersList no encontrado en el DOM');
        return;
      }
    }

    // Mostrar mensaje de carga
    this.usersList.innerHTML = `
      <div class="chat-users-empty">
        <p>Cargando estudiantes...</p>
      </div>
    `;

    try {
      // Obtener token para asegurar que se envíe
      const token = authService.getToken();
      if (!token) {
        console.error('No hay token disponible para cargar estudiantes');
        this.showNotAuthenticated();
        return;
      }

      console.log('loadOnlineUsers: Token encontrado, haciendo petición...');
      console.log('loadOnlineUsers: URL:', `${window.API_BASE_URL}/api/users/students`);
      
      // Obtener estudiantes disponibles con timeout
      const response = await Promise.race([
        axios.get(`${window.API_BASE_URL}/api/users/students`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: La petición tardó demasiado')), 10000)
        )
      ]);
      
      console.log('loadOnlineUsers: Respuesta completa:', response);
      console.log('loadOnlineUsers: response.status:', response.status);
      console.log('loadOnlineUsers: response.data:', response.data);
      console.log('loadOnlineUsers: response.data.success:', response.data?.success);
      console.log('loadOnlineUsers: response.data.data:', response.data?.data);
      console.log('loadOnlineUsers: Tipo de response.data.data:', typeof response.data?.data);
      console.log('loadOnlineUsers: Es array?', Array.isArray(response.data?.data));
      
      // Verificar estructura de respuesta
      let students = [];
      
      // El backend usa sendSuccess que devuelve { success: true, data: [...] }
      if (response.data) {
        if (response.data.success !== undefined) {
          // Estructura estándar del backend: { success: true, data: [...] }
          if (response.data.data) {
            students = Array.isArray(response.data.data) ? response.data.data : [];
            console.log('loadOnlineUsers: Usando estructura response.data.data');
          } else {
            console.warn('loadOnlineUsers: response.data.data es undefined o null');
          }
        } else if (Array.isArray(response.data)) {
          // Si response.data es directamente un array
          students = response.data;
          console.log('loadOnlineUsers: Usando response.data como array directo');
        } else {
          console.warn('loadOnlineUsers: Estructura de respuesta no reconocida:', response.data);
        }
      } else {
        console.error('loadOnlineUsers: response.data es undefined');
      }
      
      console.log('loadOnlineUsers: Estudiantes obtenidos:', students.length);
      console.log('loadOnlineUsers: Lista de estudiantes:', students);
      
      // Si students está vacío pero la respuesta fue exitosa, puede que no haya otros estudiantes
      if (students.length === 0 && response.status === 200) {
        console.log('loadOnlineUsers: ⚠️ Respuesta exitosa pero sin estudiantes. Posibles razones:');
        console.log('   1. No hay otros estudiantes en la base de datos');
        console.log('   2. Solo estás tú registrado como estudiante');
        console.log('   3. La consulta excluye al usuario actual (id != $1)');
      }
      
      // Si no hay estudiantes, mostrar mensaje apropiado
      if (students.length === 0) {
        console.log('loadOnlineUsers: No hay estudiantes disponibles');
        this.onlineUsers = [];
        if (this.usersList) {
          this.usersList.innerHTML = `
            <div class="chat-users-empty">
              <p>No hay otros estudiantes disponibles</p>
              <p class="chat-users-hint">Invita a otros estudiantes a unirse</p>
            </div>
          `;
        }
        return;
      }
      
      this.onlineUsers = students;
      
      // Asegurar que usersList esté disponible antes de renderizar
      if (!this.usersList) {
        this.usersList = this.container?.querySelector('#chat-users-list');
      }
      
      if (this.usersList) {
        this.renderUsersList();
      } else {
        console.error('usersList no disponible para renderizar');
      }
    } catch (error) {
      console.error('Error cargando estudiantes:', error);
      console.error('Error completo:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });
      
      // Si es un error 401, mostrar mensaje de autenticación
      if (error.response?.status === 401) {
        console.log('loadOnlineUsers: Error 401, mostrando mensaje de autenticación');
        this.showNotAuthenticated();
        return;
      }
      
      // Si es un timeout
      if (error.message && error.message.includes('Timeout')) {
        console.error('loadOnlineUsers: Timeout en la petición');
        if (this.usersList) {
          this.usersList.innerHTML = `
            <div class="chat-users-empty">
              <p>La petición tardó demasiado</p>
              <p class="chat-users-hint">Por favor, verifica tu conexión y recarga la página</p>
            </div>
          `;
        }
        return;
      }
      
      // Mostrar error en la lista de usuarios
      if (this.usersList) {
        const errorMessage = error.response?.data?.message || 
                            error.message || 
                            'Error desconocido al cargar estudiantes';
        this.usersList.innerHTML = `
          <div class="chat-users-empty">
            <p>Error al cargar estudiantes</p>
            <p class="chat-users-hint">${errorMessage}</p>
            <button class="btn btn-secondary btn-sm mt-2" onclick="Chat.loadOnlineUsers()">
              Reintentar
            </button>
          </div>
        `;
      }
    }
  }

  /**
   * Renderiza la lista de usuarios
   */
  renderUsersList() {
    // Asegurar que usersList esté disponible
    if (!this.usersList) {
      this.usersList = this.container?.querySelector('#chat-users-list');
      if (!this.usersList) {
        console.error('renderUsersList: usersList no encontrado');
        return;
      }
    }

    console.log('renderUsersList: Renderizando', this.onlineUsers.length, 'estudiantes');
    console.log('renderUsersList: onlineUsers:', this.onlineUsers);
    
    if (this.onlineUsers.length === 0) {
      console.log('renderUsersList: No hay estudiantes, mostrando mensaje vacío');
      this.usersList.innerHTML = `
        <div class="chat-users-empty">
          <p>No hay estudiantes disponibles</p>
        </div>
      `;
      return;
    }

    // Renderizar lista de usuarios
    const usersHTML = this.onlineUsers.map(user => {
      console.log('renderUsersList: Procesando usuario:', user);
      const nombre = user.nombre || 'Sin nombre';
      const grado = user.grado || 'N/A';
      const userId = user.id;
      
      return `
        <div class="chat-user-item" data-user-id="${userId}">
          <div class="chat-user-avatar">
            ${nombre.charAt(0).toUpperCase()}
          </div>
          <div class="chat-user-info">
            <div class="chat-user-name">${nombre}</div>
            <div class="chat-user-role">Grado ${grado}</div>
          </div>
          <div class="chat-user-status online"></div>
        </div>
      `;
    }).join('');

    console.log('renderUsersList: HTML generado:', usersHTML.substring(0, 200) + '...');
    
    this.usersList.innerHTML = usersHTML;

    // Agregar event listeners a los items
    const userItems = this.usersList.querySelectorAll('.chat-user-item');
    console.log('renderUsersList: Items encontrados en DOM:', userItems.length);
    
    userItems.forEach(item => {
      item.addEventListener('click', () => {
        const userId = parseInt(item.dataset.userId);
        console.log('renderUsersList: Usuario seleccionado:', userId);
        this.selectUser(userId);
      });
    });

    // Actualizar contador
    const countEl = this.container?.querySelector('#chat-online-count');
    if (countEl) {
      countEl.textContent = `${this.onlineUsers.length} online`;
      console.log('renderUsersList: Contador actualizado a', this.onlineUsers.length);
    } else {
      console.warn('renderUsersList: No se encontró el elemento de contador');
    }
    
    console.log('renderUsersList: Renderizado completado');
  }

  /**
   * Selecciona un usuario para chatear
   */
  async selectUser(userId) {
    this.currentChatId = userId;
    const user = this.onlineUsers.find(u => u.id === userId);
    
    if (!user) return;

    // Actualizar UI
    const nameEl = this.container.querySelector('#chat-current-user-name');
    if (nameEl) {
      nameEl.textContent = user.nombre;
    }

    // Habilitar input
    const chatInput = this.container.querySelector('#chat-input');
    const sendBtn = this.container.querySelector('#chat-send-btn');
    if (chatInput) chatInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;

    // Cargar mensajes (si hay un sistema de mensajes directos)
    // Por ahora, inicializamos con array vacío
    this.messages = [];
    this.renderMessages();

    // Unirse al room de chat directo (si existe)
    // Por ahora usamos un room simple
    socketService.emit('join_direct_chat', { userId });
  }

  /**
   * Renderiza los mensajes
   */
  renderMessages() {
    if (this.messages.length === 0) {
      this.messagesContainer.innerHTML = `
        <div class="chat-messages-empty">
          <p>No hay mensajes aún. ¡Comienza la conversación!</p>
        </div>
      `;
      return;
    }

    this.messagesContainer.innerHTML = this.messages.map(msg => {
      const isOwn = msg.senderId === this.currentUser.id;
      const senderName = isOwn ? 'Tú' : (msg.senderName || 'Usuario');
      const time = new Date(msg.createdAt || msg.timestamp).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="chat-message ${isOwn ? 'chat-message-own' : ''}">
          <div class="chat-message-content">
            <div class="chat-message-header">
              <span class="chat-message-sender">${senderName}</span>
              <span class="chat-message-time">${time}</span>
            </div>
            <div class="chat-message-text">${this.escapeHtml(msg.content)}</div>
          </div>
        </div>
      `;
    }).join('');

    // Scroll al final
    this.scrollToBottom();
  }

  /**
   * Maneja un nuevo mensaje recibido
   */
  handleNewMessage(message) {
    // Solo agregar si es del chat actual
    if (message.senderId === this.currentChatId || 
        (message.recipientId && message.recipientId === this.currentUser.id)) {
      this.messages.push(message);
      this.renderMessages();
    } else {
      // Mostrar notificación de nuevo mensaje
      this.showNewMessageNotification(message);
    }
  }

  /**
   * Envía un mensaje
   */
  async sendMessage() {
    const chatInput = this.container.querySelector('#chat-input');
    const message = chatInput.value.trim();

    if (!message || !this.currentChatId) return;

    try {
      // Enviar mensaje directo vía Socket.IO
      socketService.emit('direct_message', {
        recipientId: this.currentChatId,
        content: message
      });

      // Agregar mensaje localmente (se agregará también cuando llegue la confirmación)
      const newMessage = {
        senderId: this.currentUser.id,
        recipientId: this.currentChatId,
        content: message,
        senderName: this.currentUser.nombre,
        createdAt: new Date()
      };
      
      this.messages.push(newMessage);
      this.renderMessages();

      // Limpiar input
      chatInput.value = '';
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      alert('Error al enviar el mensaje. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Muestra notificación de nuevo mensaje
   */
  showNewMessageNotification(message) {
    const badge = this.container.querySelector('#chat-toggle-badge');
    if (badge) {
      const currentCount = parseInt(badge.textContent) || 0;
      badge.textContent = currentCount + 1;
      badge.style.display = 'block';
    }
  }

  /**
   * Actualiza la lista de usuarios online
   */
  updateOnlineUsers(users) {
    this.onlineUsers = users.filter(u => u.id !== this.currentUser.id);
    this.renderUsersList();
  }

  /**
   * Remueve un usuario de la lista
   */
  removeOnlineUser(userId) {
    this.onlineUsers = this.onlineUsers.filter(u => u.id !== userId);
    this.renderUsersList();
  }

  /**
   * Scroll al final de los mensajes
   */
  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  toggleMinimize() {
    if (this.isMinimized) {
      // Maximizar: volver a full open
      this.isMinimized = false;
      this.container.classList.add('chat-open');
      this.container.classList.remove('chat-minimized');
    } else {
      // Minimizar
      this.isMinimized = true;
      this.container.classList.add('chat-minimized');
      this.container.classList.remove('chat-open');  // Remover open para que el CSS minimizado aplique
    }
  }

  /**
   * Abre el chat
   */
  open() {
    this.isOpen = true;
    this.isMinimized = false;
    this.container.classList.add('chat-open');
    this.container.classList.remove('chat-closed', 'chat-minimized');
    
    // Limpiar badge
  const badge = this.container.querySelector('#chat-toggle-badge');
  if (badge) {
    badge.style.display = 'none';
    badge.textContent = '0';
  }

  // NUEVO: Limpiar cualquier estilo inline previo en el botón para que el CSS funcione
  const toggleButton = this.container?.querySelector('#chat-toggle-btn');
  if (toggleButton) {
    toggleButton.removeAttribute('style');  // Remueve todo el atributo style (incluyendo display)
  }
  }

  /**
   * Cierra el chat
   */
  close() {
    this.isOpen = false;
    this.isMinimized = false;
    this.container.classList.add('chat-closed');
    this.container.classList.remove('chat-open', 'chat-minimized');
    
    
  }

  /**
   * Minimiza el chat
   */
  minimize() {
    this.isMinimized = true;
    this.container.classList.add('chat-minimized');
    this.container.classList.remove('chat-open');
  }

  /**
   * Toggle del chat (abrir/cerrar)
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
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
   * Muestra mensaje cuando no está autenticado
   */
  showNotAuthenticated() {
    if (this.usersList) {
      this.usersList.innerHTML = `
        <div class="chat-users-empty">
          <p>Inicia sesión para usar el chat</p>
        </div>
      `;
    }
    const chatInput = this.container?.querySelector('#chat-input');
    const sendBtn = this.container?.querySelector('#chat-send-btn');
    if (chatInput) chatInput.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
  }

  /**
   * Muestra mensaje cuando el chat no está disponible
   */
  showNotAvailable() {
    if (this.usersList) {
      this.usersList.innerHTML = `
        <div class="chat-users-empty">
          <p>El chat solo está disponible para estudiantes</p>
        </div>
      `;
    }
    const chatInput = this.container?.querySelector('#chat-input');
    const sendBtn = this.container?.querySelector('#chat-send-btn');
    if (chatInput) chatInput.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
  }

  /**
   * Muestra mensaje de error
   */
  showError(message) {
    if (this.usersList) {
      this.usersList.innerHTML = `
        <div class="chat-users-empty">
          <p>${message}</p>
        </div>
      `;
    }
  }

  /**
   * Método de depuración: verifica el estado del chat
   */
  debugStatus() {
    console.log('=== Estado del Chat ===');
    console.log('Inicializado:', this.initialized);
    console.log('Inicializando:', this.initializing);
    console.log('Usuario actual:', this.currentUser);
    console.log('Estudiantes cargados:', this.onlineUsers.length);
    console.log('Lista de estudiantes:', this.onlineUsers);
    console.log('Container existe:', !!this.container);
    console.log('UsersList existe:', !!this.usersList);
    console.log('Token disponible:', !!authService.getToken());
    console.log('Token:', authService.getToken() ? 'Presente' : 'Ausente');
    console.log('API Base URL:', window.API_BASE_URL);
    
    return {
      initialized: this.initialized,
      initializing: this.initializing,
      currentUser: this.currentUser,
      studentsCount: this.onlineUsers.length,
      students: this.onlineUsers,
      hasContainer: !!this.container,
      hasUsersList: !!this.usersList,
      hasToken: !!authService.getToken(),
      apiBaseUrl: window.API_BASE_URL
    };
  }

  /**
   * Método para forzar recarga de estudiantes (útil para debugging)
   */
  async forceReloadStudents() {
    console.log('🔄 Forzando recarga de estudiantes...');
    this.onlineUsers = [];
    await this.loadOnlineUsers();
  }
}

const chatInstance = new Chat();

// Exponer métodos útiles para debugging
window.Chat = chatInstance;
window.Chat.forceReloadStudents = () => chatInstance.forceReloadStudents();
window.Chat.debugStatus = () => chatInstance.debugStatus();

export default chatInstance;

