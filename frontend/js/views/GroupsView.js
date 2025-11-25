import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { getStatusName, getStatusColor } from '../utils/helpers.js';
import { joinGroupRoom, leaveGroupRoom } from '../utils/socketHelpers.js';

/**
 * Vista de Grupos
 */
class GroupsView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Mis Grupos</h1>
        </div>
        <div class="card__body">
          <div id="groups-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadGroups(user);
    } catch (error) {
      Notification.error('Error al cargar grupos');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadGroups(user) {
    const content = document.getElementById('groups-content');
    
    try {
      const response = await groupsAPI.getAll();
      if (!response.success) {
        throw new Error(response.message || 'Error al obtener grupos');
      }

      const groups = response.data || [];
      
      if (groups.length === 0) {
        content.innerHTML = '<p class="text-muted">No tienes grupos asignados</p>';
        return;
      }

      // Renderizar según el rol
      if (user.role === 'Profesor') {
        content.innerHTML = this.renderProfesorGroups(groups);
        this.attachProfesorEventListeners(groups);
      } else if (user.role === 'Estudiante') {
        content.innerHTML = this.renderEstudianteGroups(groups);
        this.attachEstudianteEventListeners(groups);
      } else {
        // Tutor o Admin - vista simplificada
        content.innerHTML = this.renderGenericGroups(groups);
        this.attachGenericEventListeners(groups);
      }
    } catch (error) {
      console.error('Error al cargar grupos:', error);
      if (error.response?.status === 401) {
        authService.logout();
        window.location.hash = '#/login';
        return;
      }
      content.innerHTML = '<p class="text-muted">Error al cargar grupos</p>';
    }
  }

  renderProfesorGroups(groups) {
    return `
      <div class="groups-list">
        ${groups.map(group => `
          <div class="group-card" data-group-id="${group.id}">
            <div class="group-card__header">
              <div class="group-card__info">
                <h3>${group.nombre}</h3>
                <span class="badge badge--${getStatusColor(group.estado)}">
                  ${getStatusName(group.estado)}
                </span>
              </div>
              <button class="btn btn-secondary btn-sm toggle-members-btn" data-group-id="${group.id}">
                <span class="toggle-text">Ver Miembros</span>
                <span class="toggle-icon">▼</span>
              </button>
            </div>
            <div class="group-card__members-panel" id="members-panel-${group.id}" style="display: none;">
              <div class="group-card__members-content">
                <div class="spinner"></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderEstudianteGroups(groups) {
    return `
      <div class="groups-list">
        ${groups.map(group => `
          <div class="group-card" data-group-id="${group.id}">
            <div class="group-card__header">
              <div class="group-card__info">
                <h3>${group.nombre}</h3>
                <div class="group-card__meta">
                  <span class="text-muted">Profesor: ${group.profesorName || 'Sin asignar'}</span>
                  <span class="badge badge--${getStatusColor(group.estado)}">
                    ${getStatusName(group.estado)}
                  </span>
                </div>
                ${group.descripcion ? `<p class="group-card__description">${group.descripcion}</p>` : ''}
              </div>
              <button class="btn btn-secondary btn-sm toggle-members-btn" data-group-id="${group.id}">
                <span class="toggle-text">Ver Miembros</span>
                <span class="toggle-icon">▼</span>
              </button>
            </div>
            <div class="group-card__members-panel" id="members-panel-${group.id}" style="display: none;">
              <div class="group-card__members-content">
                <div class="spinner"></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderGenericGroups(groups) {
    return `
      <div class="groups-list">
        ${groups.map(group => `
          <div class="group-card" data-group-id="${group.id}">
            <div class="group-card__header">
              <div class="group-card__info">
                <h3>${group.nombre}</h3>
                <span class="badge badge--${getStatusColor(group.estado)}">
                  ${getStatusName(group.estado)}
                </span>
              </div>
              <button class="btn btn-secondary btn-sm toggle-members-btn" data-group-id="${group.id}">
                <span class="toggle-text">Ver Miembros</span>
                <span class="toggle-icon">▼</span>
              </button>
            </div>
            <div class="group-card__members-panel" id="members-panel-${group.id}" style="display: none;">
              <div class="group-card__members-content">
                <div class="spinner"></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  attachProfesorEventListeners(groups) {
    const toggleButtons = document.querySelectorAll('.toggle-members-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const groupId = parseInt(e.target.closest('.toggle-members-btn').getAttribute('data-group-id'), 10);
        await this.toggleMembersPanel(groupId, 'Profesor');
      });
    });
  }

  attachEstudianteEventListeners(groups) {
    const toggleButtons = document.querySelectorAll('.toggle-members-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const groupId = parseInt(e.target.closest('.toggle-members-btn').getAttribute('data-group-id'), 10);
        await this.toggleMembersPanel(groupId, 'Estudiante');
      });
    });
  }

  attachGenericEventListeners(groups) {
    const toggleButtons = document.querySelectorAll('.toggle-members-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const groupId = parseInt(e.target.closest('.toggle-members-btn').getAttribute('data-group-id'), 10);
        await this.toggleMembersPanel(groupId, 'Generic');
      });
    });
  }

  async toggleMembersPanel(groupId, role) {
    const panel = document.getElementById(`members-panel-${groupId}`);
    const button = document.querySelector(`.toggle-members-btn[data-group-id="${groupId}"]`);
    const toggleText = button.querySelector('.toggle-text');
    const toggleIcon = button.querySelector('.toggle-icon');
    
    // Si está oculto, mostrar y cargar
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      toggleText.textContent = 'Ocultar Miembros';
      toggleIcon.textContent = '▲';
      
      const content = panel.querySelector('.group-card__members-content');
      
      try {
        Loading.show();
        const response = await groupsAPI.getMembers(groupId);
        
        if (!response.success) {
          throw new Error(response.message || 'Error al obtener miembros');
        }

        const members = response.data || [];
        const groupResponse = await groupsAPI.getById(groupId);
        const group = groupResponse.success ? groupResponse.data : null;

        // Separar profesor y estudiantes
        const profesor = members.find(m => m.role === 'Profesor') || 
                        (group && group.profesorId ? { nombre: group.profesorName || 'Sin asignar', role: 'Profesor' } : null);
        const estudiantes = members.filter(m => m.role === 'Estudiante');
        const tutores = members.filter(m => m.role === 'Tutor');

        let membersHTML = '';

        if (role === 'Profesor') {
          // Para profesor, solo mostrar estudiantes
          membersHTML = `
            <h4>Estudiantes (${estudiantes.length})</h4>
            <ul class="members-list">
              ${estudiantes.length > 0 ? estudiantes.map(m => `
                <li class="member-item member-item--estudiante">
                  <span class="member-name">${m.nombre}</span>
                  <span class="member-role">Estudiante</span>
                </li>
              `).join('') : '<li class="text-muted">No hay estudiantes en este grupo</li>'}
            </ul>
          `;
        } else {
          // Para otros roles, distinguir profesor, estudiantes y tutores
          membersHTML = `
            ${profesor ? `
              <h4>Profesor</h4>
              <ul class="members-list">
                <li class="member-item member-item--profesor">
                  <span class="member-name">${profesor.nombre}</span>
                  <span class="member-role">Profesor</span>
                </li>
              </ul>
            ` : ''}
            ${tutores.length > 0 ? `
              <h4>Tutores (${tutores.length})</h4>
              <ul class="members-list">
                ${tutores.map(t => `
                  <li class="member-item member-item--tutor">
                    <span class="member-name">${t.nombre}</span>
                    <span class="member-role">Tutor</span>
                  </li>
                `).join('')}
              </ul>
            ` : ''}
            <h4>Estudiantes (${estudiantes.length})</h4>
            <ul class="members-list">
              ${estudiantes.length > 0 ? estudiantes.map(m => `
                <li class="member-item member-item--estudiante">
                  <span class="member-name">${m.nombre}</span>
                  <span class="member-role">Estudiante</span>
                </li>
              `).join('') : '<li class="text-muted">No hay estudiantes en este grupo</li>'}
            </ul>
          `;
        }

        content.innerHTML = membersHTML;
      } catch (error) {
        console.error('Error al mostrar miembros:', error);
        content.innerHTML = '<p class="text-muted">Error al cargar miembros del grupo</p>';
      } finally {
        Loading.hide();
      }
    } else {
      // Ocultar panel
      panel.style.display = 'none';
      toggleText.textContent = 'Ver Miembros';
      toggleIcon.textContent = '▼';
    }
  }
}

export default new GroupsView();

