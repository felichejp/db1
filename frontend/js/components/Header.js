import authService from '../services/authService.js';
import Notification from './Notification.js';

/**
 * Componente Header
 */
class Header {
  constructor() {
    this.container = document.getElementById('header-container');
  }

  render() {
    const user = authService.getCurrentUser();

    if (!user) {
      this.container.innerHTML = '';
      return;
    }

    this.container.innerHTML = `
      <header class="header">
        <div class="header__left">
          <button class="header__toggle-sidebar" id="toggle-sidebar-btn" aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div class="header__logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            Sistema de Asesorías
          </div>
        </div>
        <nav class="header__nav">
          <div class="header__notifications">
            <button class="btn btn-secondary" id="notifications-btn" aria-label="Notificaciones">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span class="notification-badge hidden" id="notification-badge">0</span>
            </button>
          </div>
          <div class="header__user">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>${user.nombre}</span>
            <span class="text-muted">(${user.role})</span>
            <button class="btn btn-secondary" id="logout-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </nav>
      </header>
    `;

    // Event listeners
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      authService.logout();
      window.location.hash = '#/login';
      Notification.success('Sesión cerrada');
    });

    // Toggle sidebar
    document.getElementById('toggle-sidebar-btn')?.addEventListener('click', () => {
      const sidebarContainer = document.getElementById('sidebar-container');
      const mainContent = document.getElementById('main-content');
      
      // Toggle classes
      const isCollapsed = sidebarContainer.classList.toggle('sidebar--collapsed');
      mainContent.classList.toggle('main-content--full', isCollapsed);
      
      // Force reflow para asegurar que la transición funcione
      void sidebarContainer.offsetWidth;
      void mainContent.offsetWidth;
    });

    // TODO: Implementar notificaciones
    document.getElementById('notifications-btn')?.addEventListener('click', () => {
      // Abrir panel de notificaciones
    });
  }
}

export default new Header();


