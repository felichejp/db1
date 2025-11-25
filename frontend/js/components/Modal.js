/**
 * Componente Modal reutilizable
 */
class Modal {
  constructor(options = {}) {
    this.overlay = null;
    this.modal = null;
    this.options = options;
    this.onAction = options.onAction || null;
  }

  show(title = null, content = null, footer = null) {
    // Si se pasa un objeto con opciones, usar ese formato
    if (typeof title === 'object' && title !== null) {
      const options = title;
      title = options.title;
      content = options.content;
      footer = options.footer;
      this.onAction = options.onAction || null;
    }
    // Crear overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    };

    // Crear modal
    this.modal = document.createElement('div');
    this.modal.className = 'modal';

    this.modal.innerHTML = `
      <div class="modal__header">
        <h2 class="modal__title">${title}</h2>
        <button class="modal__close" onclick="window.currentModal?.hide()">×</button>
      </div>
      <div class="modal__body">${content}</div>
      ${footer ? `<div class="modal__footer">${footer}</div>` : ''}
    `;

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
    window.currentModal = this;

    // Agregar event listeners a los botones del footer
    if (footer && this.modal) {
      const footerElement = this.modal.querySelector('.modal__footer');
      if (footerElement) {
        footerElement.addEventListener('click', (e) => {
          const button = e.target.closest('button');
          if (button) {
            const action = button.dataset.action;
            if (action === 'cancel') {
              this.hide();
            } else if (action === 'submit' && this.onAction) {
              this.onAction('submit');
            } else if (this.onAction) {
              this.onAction(action);
            }
          }
        });
      }
    }

    return this.modal;
  }

  hide() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.modal = null;
      window.currentModal = null;
    }
  }

  // Método estático para cerrar el modal actual
  static close() {
    if (window.currentModal) {
      window.currentModal.hide();
    }
  }
}

// Exportar tanto la instancia como la clase
const modalInstance = new Modal();
export default modalInstance;
export { Modal };


