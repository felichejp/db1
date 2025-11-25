/**
 * Widget flotante de chat (sin conexión a backend por ahora)
 */
class ChatWidget {
  constructor() {
    this.launcher = null;
    this.panel = null;
    this.closeButton = null;
    this.initialized = false;
    this.isOpen = false;
  }

  init() {
    if (this.initialized) return;
    this.createLauncher();
    this.createPanel();
    this.initialized = true;
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
        <button class="chat-widget__close" aria-label="Cerrar chat">&times;</button>
      </header>
      <div class="chat-widget__search">
        <input
          type="text"
          class="chat-widget__search-input"
          placeholder="Buscar usuarios o grupos"
          aria-label="Buscar usuarios o grupos"
        />
      </div>
      <div class="chat-widget__content">
        <aside class="chat-widget__conversations" aria-label="Lista de conversaciones">
          <div class="chat-widget__empty">
            <p>Aún no hay conversaciones.</p>
            <small>Comienza una búsqueda para iniciar un chat.</small>
          </div>
        </aside>
        <div class="chat-widget__conversation-area" aria-label="Área de conversación">
          <div class="chat-widget__placeholder">
            <p>Selecciona o busca un usuario para comenzar a chatear.</p>
            <small>La funcionalidad se conectará al backend próximamente.</small>
          </div>
          <div class="chat-widget__composer" aria-label="Enviar mensaje">
            <textarea
              class="chat-widget__input"
              placeholder="Escribe un mensaje..."
              disabled
            ></textarea>
            <button class="chat-widget__send" type="button" disabled>Enviar</button>
          </div>
        </div>
      </div>
    `;

    this.closeButton = this.panel.querySelector('.chat-widget__close');
    this.closeButton.addEventListener('click', () => this.closePanel());

    document.body.appendChild(this.panel);
  }

  openPanel() {
    this.isOpen = true;
    this.panel?.classList.remove('chat-widget__panel--hidden');
    this.launcher?.classList.add('chat-widget__launcher--active');
    document.addEventListener('keydown', this.handleKeydown);
  }

  closePanel() {
    this.isOpen = false;
    this.panel?.classList.add('chat-widget__panel--hidden');
    this.launcher?.classList.remove('chat-widget__launcher--active');
    document.removeEventListener('keydown', this.handleKeydown);
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


