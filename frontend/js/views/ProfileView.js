import authService from '../services/authService.js';
import { getRoleName } from '../utils/helpers.js';

class ProfileView {
    render() {
        const user = authService.getCurrentUser();
        const container = document.getElementById('view-container');

        if (!user) {
            window.location.hash = '#/login';
            return;
        }

        container.innerHTML = `
      <div class="dashboard-header mb-3">
        <h1 class="card__title" style="font-size: 2rem;">Mi Perfil</h1>
        <p class="text-muted">Gestiona tu información personal</p>
      </div>

      <div class="card" style="max-width: 800px; margin: 0 auto;">
        <div style="display: flex; align-items: center; gap: 2rem; margin-bottom: 2rem; flex-wrap: wrap;">
          <div style="width: 100px; height: 100px; background: var(--gradient-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: white; font-weight: bold;">
            ${user.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">${user.nombre}</h2>
            <span class="badge badge--programada" style="font-size: 0.9rem;">${getRoleName(user.role)}</span>
          </div>
        </div>

        <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
          <div class="form-group">
            <label class="form-label">Correo Electrónico</label>
            <div class="form-input" style="background: rgba(255,255,255,0.05); border: none;">${user.email}</div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <div class="form-input" style="background: rgba(255,255,255,0.05); border: none;">${user.telefono || 'No registrado'}</div>
          </div>

          <div class="form-group">
            <label class="form-label">Carrera</label>
            <div class="form-input" style="background: rgba(255,255,255,0.05); border: none;">${user.carrera || 'No registrada'}</div>
          </div>

          <div class="form-group">
            <label class="form-label">Grado/Semestre</label>
            <div class="form-input" style="background: rgba(255,255,255,0.05); border: none;">${user.grado || 'N/A'}</div>
          </div>
        </div>

        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border-color);">
          <h3 style="margin-bottom: 1rem;">Insignias</h3>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <div class="badge badge--activo" style="padding: 0.5rem 1rem;">🎓 Miembro Activo</div>
            <!-- TODO: Cargar insignias reales desde API -->
          </div>
        </div>
      </div>
    `;
    }
}

export default new ProfileView();
