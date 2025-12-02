import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { tutorsAPI } from '../api/tutors.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, getStatusName, getStatusColor } from '../utils/helpers.js';

/**
 * Vista de Profesor (Responsable)
 */
class ProfesorView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

    if (user.role !== 'Profesor') {
      window.location.hash = '#/dashboard';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Mis Grupos</h1>
          <p class="text-muted">Gestiona tus grupos y tutores (máximo 6 grupos)</p>
        </div>
        <div class="card__body">
          <div id="profesor-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadProfesorContent();
    } catch (error) {
      console.error('Error cargando vista de profesor:', error);
      Notification.error('Error al cargar la información');
    } finally {
      Loading.hide();
    }
  }

  async loadProfesorContent() {
    const content = document.getElementById('profesor-content');

    try {
      // Obtener grupos del profesor (máximo 6)
      const groupsRes = await groupsAPI.getAll();
      const groups = groupsRes.success ? groupsRes.data.slice(0, 6) : [];

      // Para cada grupo, obtener sus tutores
      const coursesWithTutors = await Promise.all(
        groups.map(async (group) => {
          const membersRes = await groupsAPI.getMembers(group.id);
          const members = membersRes.success ? membersRes.data : [];
          const tutors = members.filter(m => m.role === 'Tutor');
          return {
            ...group,
            tutors
          };
        })
      );

      content.innerHTML = this.renderProfesorLayout(coursesWithTutors);
    } catch (error) {
      console.error('Error en loadProfesorContent:', error);
      content.innerHTML = '<p class="text-muted">Error al cargar la información</p>';
    }
  }

  renderProfesorLayout(courses) {
    return `
      <div class="profesor-courses-grid">
        ${courses.length > 0 ? courses.map(course => `
          <div class="course-card">
            <div class="course-card__header">
              <h3 class="course-card__title">${course.nombre || 'Sin nombre'}</h3>
              <span class="badge badge--${getStatusColor(course.estado || 'activo')}">
                ${getStatusName(course.estado || 'activo')}
              </span>
            </div>
            <div class="course-card__body">
              <p class="course-card__description">${course.descripcion || 'Sin descripción'}</p>
              
              <div class="course-card__section">
                <h4>Tutores de este grupo</h4>
                ${course.tutors && course.tutors.length > 0 ? `
                  <div class="tutors-list">
                    ${course.tutors.map(tutor => `
                      <div class="tutor-item">
                        <span class="tutor-name">${tutor.nombre}</span>
                        <span class="tutor-email">${tutor.email}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : '<p class="text-muted">No hay tutores asignados</p>'}
              </div>
            </div>
            <div class="course-card__footer">
              <p class="course-card__meta">Creado: ${formatDate(course.createdAt)}</p>
              <a href="#/groups/${course.id}" class="btn btn-primary btn-sm btn-block mt-2">Ver detalles</a>
            </div>
          </div>
        `).join('') : '<p class="text-muted">No tienes grupos asignados</p>'}
      </div>
    `;
  }
}

export default new ProfesorView();

