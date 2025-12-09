/**
 * Componente Modal reutilizable
 */
class Modal {
  constructor() {
    this.overlay = null;
    this.modal = null;
  }

  show(title, content, footer = null) {
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
}

export default new Modal();


