/**
 * Componente de notificación toast
 */
class Notification {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Crear contenedor si no existe
    if (!document.getElementById('notification-container')) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'notification-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('notification-container');
    }
  }

  show(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;

    notification.innerHTML = `
      <div class="notification__message">${message}</div>
      <button class="notification__close" onclick="this.parentElement.remove()">×</button>
    `;

    this.container.appendChild(notification);

    // Auto-remover después de duration
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, duration);

    return notification;
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

export default new Notification();


