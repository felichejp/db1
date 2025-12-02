import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { tutorsAPI } from '../api/tutors.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import { formatDate, formatTime } from '../utils/helpers.js';

/**
 * Vista de Estudiante (Alumno)
 */
class EstudianteView {
  constructor() {
    this.groups = [];
    this.sessions = [];
    this.currentGroupDetails = null;
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'Estudiante') {
      window.location.hash = '#/dashboard';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Bienvenido, ${user.nombre}</h1>
          <p class="text-muted">Matrícula: ${user.id} | Rol: Estudiante</p>
        </div>
        <div class="card__body">
          <div id="estudiante-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadData();
    } catch (error) {
      Notification.error('Error al cargar datos');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadData() {
    try {
      const [groupsRes, sessionsRes] = await Promise.all([
        groupsAPI.getAll(),
        sessionsAPI.getAll()
      ]);

      this.groups = groupsRes.success ? groupsRes.data : [];
      this.sessions = sessionsRes.success ? sessionsRes.data : [];

      this.renderContent();
    } catch (error) {
      console.error('Error cargando datos:', error);
      throw error;
    }
  }

  async renderContent() {
    const content = document.getElementById('estudiante-content');
    
    if (this.groups.length === 0) {
      content.innerHTML = '<p class="text-muted">No estás en ningún grupo aún.</p>';
      return;
    }

    // Obtener información detallada de cada grupo
    const groupsWithDetails = await Promise.all(
      this.groups.map(async (group) => {
        try {
          const [groupDetailsRes, membersRes] = await Promise.all([
            groupsAPI.getById(group.id),
            groupsAPI.getMembers(group.id)
          ]);

          const groupDetails = groupDetailsRes.success ? groupDetailsRes.data : group;
          const members = membersRes.success ? membersRes.data : [];
          
          // Obtener tutor del grupo (buscar en sesiones)
          const groupSessions = this.sessions.filter(s => s.groupId === group.id && s.tutorId);
          let tutor = null;
          if (groupSessions.length > 0) {
            try {
              const tutorRes = await tutorsAPI.getById(groupSessions[0].tutorId);
              if (tutorRes.success) {
                tutor = tutorRes.data;
              }
            } catch (e) {
              console.warn('No se pudo obtener tutor:', e);
            }
          }

          return {
            ...groupDetails,
            members,
            tutor,
            sessions: groupSessions
          };
        } catch (error) {
          console.error(`Error obteniendo detalles del grupo ${group.id}:`, error);
          return { ...group, members: [], tutor: null, sessions: [] };
        }
      })
    );

    content.innerHTML = `
      <div class="groups-grid">
        ${groupsWithDetails.map(group => this.renderGroupCard(group)).join('')}
      </div>
    `;

    // Los botones ahora son enlaces que navegan directamente
  }

  renderGroupCard(group) {
    const members = group.members || [];
    const tutor = group.tutor;
    const profesor = members.find(m => m.role === 'Profesor') || 
                     (group.profesorNombre ? { nombre: group.profesorNombre } : null);

    return `
      <div class="group-card">
        <div class="group-card__header">
          <h3 class="group-card__title">${this.escapeHtml(group.nombre || 'Sin nombre')}</h3>
          <span class="badge badge--info">ID: ${group.id}</span>
        </div>
        <div class="group-card__body">
          <div class="group-card__info">
            <div class="info-item">
              <span class="info-label">Materia:</span>
              <span class="info-value">${group.descripcion || 'No especificada'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Profesor:</span>
              <span class="info-value">${profesor ? this.escapeHtml(profesor.nombre) : 'Sin asignar'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Asesor:</span>
              <span class="info-value">${tutor ? this.escapeHtml(tutor.nombre || 'Sin nombre') : 'Sin asignar'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Integrantes:</span>
              <span class="info-value">${members.filter(m => m.role === 'Estudiante').length} / 5</span>
            </div>
            <div class="info-item">
              <span class="info-label">Nombres:</span>
              <span class="info-value">${members.filter(m => m.role === 'Estudiante').map(m => m.nombre).join(', ') || 'Ninguno'}</span>
            </div>
          </div>
          <a href="#/groups/${group.id}/details" class="btn btn-primary" style="width: 100%; margin-top: var(--spacing-md); display: block; text-align: center;">
            Ver Detalles
          </a>
        </div>
      </div>
    `;
  }

  // El método showGroupDetails fue eliminado - ahora se usa navegación a GroupDetailsView

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new EstudianteView();

