/**
 * Componente de loading overlay
 */
class Loading {
  constructor() {
    this.overlay = document.getElementById('loading-overlay');
  }

  show() {
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }
  }

  hide() {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
  }
}

export default new Loading();


