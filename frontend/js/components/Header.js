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
        <div class="header__logo">Sistema de Asesorías</div>
        <nav class="header__nav">
          <div class="header__notifications">
            <button class="btn btn-secondary" id="notifications-btn">
              🔔
              <span class="notification-badge hidden" id="notification-badge">0</span>
            </button>
          </div>
          <div class="header__user">
            <span>${user.nombre}</span>
            <span class="text-muted">(${user.role})</span>
            <button class="btn btn-secondary" id="logout-btn">Cerrar Sesión</button>
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

    // TODO: Implementar notificaciones
    document.getElementById('notifications-btn')?.addEventListener('click', () => {
      // Abrir panel de notificaciones
    });
  }
}

export default new Header();

