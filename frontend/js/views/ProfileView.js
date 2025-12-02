import authService from '../services/authService.js';
import { usersAPI } from '../api/users.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';

/**
 * Vista de Perfil del Usuario
 */
class ProfileView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) {
      Notification.error('No autenticado. Por favor, inicia sesión.');
      window.location.hash = '#/login';
      return;
    }

    const container = document.getElementById('view-container');
    if (!container) {
      console.error('view-container no encontrado en ProfileView');
      return;
    }

    container.innerHTML = `
      <div class="profile-container">
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Mi Perfil</h2>
          </div>
          <div class="card__body">
            <div id="profile-content">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadProfile(user);
    } catch (error) {
      console.error('Error en render de ProfileView:', error);
      Notification.error('Error al cargar el perfil');
      container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 2rem auto;">
          <div class="card__body">
            <p class="text-muted">No se pudo cargar el perfil. Por favor, intenta de nuevo.</p>
            <button class="btn btn-primary" onclick="window.location.hash='#/dashboard'" style="margin-top: var(--spacing-md);">
              Volver al Dashboard
            </button>
          </div>
        </div>
      `;
    } finally {
      Loading.hide();
    }
  }

  async loadProfile(user) {
    const content = document.getElementById('profile-content');
    if (!content) return;

    try {
      // Intentar obtener el perfil completo del servidor
      let profileData = null;
      try {
        const profileRes = await usersAPI.getProfile(user.id);
        if (profileRes.success && profileRes.data) {
          profileData = profileRes.data;
        }
      } catch (error) {
        console.warn('No se pudo obtener perfil completo del servidor, usando datos locales:', error);
      }

      // Usar datos del perfil o datos locales del usuario
      const nombre = profileData?.nombre || user.nombre || 'Sin nombre';
      const email = profileData?.email || user.email || 'Sin email';
      const role = profileData?.role || user.role || 'Sin rol';
      const grado = profileData?.grado || user.grado || 'Sin grado';
      const carrera = profileData?.carrera || user.carrera || 'Sin carrera asignada';

      // Mapear roles a nombres más amigables
      const roleNames = {
        'Admin': 'Administrador',
        'Profesor': 'Profesor',
        'Tutor': 'Tutor',
        'Estudiante': 'Estudiante'
      };
      const roleDisplay = roleNames[role] || role;

      content.innerHTML = `
        <div class="profile-info">
          <div class="profile-field">
            <label class="profile-label">Nombre:</label>
            <div class="profile-value">${nombre}</div>
          </div>
          
          <div class="profile-field">
            <label class="profile-label">Correo Electrónico:</label>
            <div class="profile-value">${email}</div>
          </div>
          
          <div class="profile-field">
            <label class="profile-label">Rol:</label>
            <div class="profile-value">
              <span class="role-badge role-badge--${role.toLowerCase()}">${roleDisplay}</span>
            </div>
          </div>
          
          ${grado ? `
            <div class="profile-field">
              <label class="profile-label">Grado:</label>
              <div class="profile-value">${grado}</div>
            </div>
          ` : ''}
          
          ${carrera && carrera !== 'Sin carrera asignada' ? `
            <div class="profile-field">
              <label class="profile-label">Carrera:</label>
              <div class="profile-value">${carrera}</div>
            </div>
          ` : ''}
        </div>
      `;
    } catch (error) {
      console.error('Error cargando perfil:', error);
      content.innerHTML = `
        <div class="error-message">
          <p class="text-muted">Error al cargar la información del perfil</p>
          <p class="text-muted" style="font-size: 0.9rem; margin-top: var(--spacing-sm);">
            ${error.message || 'Error desconocido'}
          </p>
        </div>
      `;
    }
  }
}

export default new ProfileView();

