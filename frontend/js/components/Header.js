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

    // Obtener carrera del usuario (puede venir del objeto user o usar un valor por defecto)
    const carrera = user.carrera || 'Sin carrera asignada';
    
    this.container.innerHTML = `
      <header class="header">
        <div class="header__user-info">
          <span>${user.nombre} | ${carrera}</span>
        </div>
        <nav class="header__nav">
          <button class="btn btn-secondary" id="logout-btn">Cerrar sesión</button>
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


