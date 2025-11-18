/**
 * Vista 404
 */
class NotFoundView {
  render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🔍</div>
        <h2 class="empty-state__message">Página no encontrada</h2>
        <p class="text-muted">La página que buscas no existe.</p>
        <a href="#/dashboard" class="btn btn-primary mt-2">Volver al Dashboard</a>
      </div>
    `;
  }
}

export default new NotFoundView();


