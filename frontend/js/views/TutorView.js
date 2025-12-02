import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { tutorsAPI } from '../api/tutors.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';

/**
 * Vista de Tutor
 */
class TutorView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

    if (user.role !== 'Tutor') {
      window.location.hash = '#/dashboard';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Mis Cursos</h1>
          <p class="text-muted">Gestiona tus cursos y sesiones</p>
        </div>
        <div class="card__body">
          <div id="tutor-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadTutorContent();
    } catch (error) {
      console.error('Error cargando vista de tutor:', error);
      Notification.error('Error al cargar la información');
    } finally {
      Loading.hide();
    }
  }

  async loadTutorContent() {
    const content = document.getElementById('tutor-content');
    const user = authService.getCurrentUser();

    try {
      // Obtener grupos del tutor (máximo 3)
      const groupsRes = await groupsAPI.getAll();
      const groups = groupsRes.success ? groupsRes.data.slice(0, 3) : [];

      // Obtener sesiones del tutor
      const sessionsRes = await sessionsAPI.getAll();
      const sessions = sessionsRes.success ? sessionsRes.data : [];

      // Los grupos ya contienen la información necesaria
      // No necesitamos cargar el perfil del tutor para esta vista

      content.innerHTML = this.renderTutorLayout(groups, sessions, subjects, user);
      this.setupEventListeners(groups);
    } catch (error) {
      console.error('Error en loadTutorContent:', error);
      content.innerHTML = '<p class="text-muted">Error al cargar la información</p>';
    }
  }

  renderTutorLayout(groups, sessions, subjects, user) {
    // Crear cursos únicos basados en grupos o materias
    const courses = groups.map((group, index) => ({
      id: group.id,
      nombre: group.nombre,
      tutorNombre: user.nombre,
      numero: index + 1,
      total: groups.length,
      grupo: group
    }));

    return `
      <div class="tutor-two-column-layout">
        <section class="tutor-courses-section">
          <h2>Mis Cursos (${courses.length}/3)</h2>
          ${courses.length > 0 ? `
            <div class="course-card-list">
              ${courses.map(course => `
                <div class="course-card" data-course-id="${course.id}">
                  <div class="course-card__header">
                    <span class="course-card__number">${course.numero}/${course.total}</span>
                    <h3 class="course-card__title">${course.tutorNombre} - ${course.nombre}</h3>
                  </div>
                  <div class="course-card__actions">
                    <button class="btn btn-primary btn-sm btn-block view-course-btn" data-course-id="${course.id}">
                      Ver detalles
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-muted">No tienes cursos asignados</p>'}
        </section>
        <section class="tutor-details-section" id="tutor-details-section">
          <div class="tutor-details-placeholder">
            <p class="text-muted">Selecciona un curso para ver sus detalles</p>
          </div>
        </section>
      </div>
    `;
  }

  setupEventListeners(courses) {
    const viewButtons = document.querySelectorAll('.view-course-btn');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const courseId = e.target.dataset.courseId;
        await this.loadCourseDetails(courseId, courses);
      });
    });

    // Cargar primer curso por defecto si existe
    if (courses.length > 0) {
      this.loadCourseDetails(courses[0].id, courses);
    }
  }

  async loadCourseDetails(courseId, courses) {
    const detailsSection = document.getElementById('tutor-details-section');
    const course = courses.find(c => c.id === parseInt(courseId));

    if (!course) return;

    try {
      Loading.show();
      
      // Obtener miembros del grupo (tutores y estudiantes)
      const membersRes = await groupsAPI.getMembers(courseId);
      const members = membersRes.success ? membersRes.data : [];
      
      // Obtener sesiones de este grupo
      const sessionsRes = await sessionsAPI.getAll();
      const groupSessions = sessionsRes.success 
        ? sessionsRes.data.filter(s => s.groupId === parseInt(courseId))
        : [];

      // Separar tutores y estudiantes
      const tutors = members.filter(m => m.role === 'Tutor');
      const students = members.filter(m => m.role === 'Estudiante');

      detailsSection.innerHTML = `
        <div class="course-details-card">
          <h2>${course.nombre}</h2>
          
          <div class="course-details-section">
            <h3>Tutores de este curso</h3>
            ${tutors.length > 0 ? `
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tutors.map(tutor => `
                      <tr>
                        <td>${tutor.nombre}</td>
                        <td>${tutor.email}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p class="text-muted">No hay tutores asignados</p>'}
          </div>

          <div class="course-details-section">
            <h3>Sesiones</h3>
            ${groupSessions.length > 0 ? `
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Tema</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${groupSessions.map(session => `
                      <tr>
                        <td>${formatDate(session.fecha)}</td>
                        <td>${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}</td>
                        <td>${session.tema || '-'}</td>
                        <td>
                          <span class="badge badge--${getStatusColor(session.estado)}">
                            ${getStatusName(session.estado)}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p class="text-muted">No hay sesiones programadas</p>'}
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error cargando detalles del curso:', error);
      detailsSection.innerHTML = '<p class="text-muted">Error al cargar los detalles</p>';
    } finally {
      Loading.hide();
    }
  }
}

export default new TutorView();

