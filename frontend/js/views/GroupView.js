import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { getStatusName, getStatusColor } from '../utils/helpers.js';

class GroupView {
  async render(groupId) {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <div class="flex justify-between items-center">
            <h1 class="card__title">Detalles del Grupo</h1>
            <a href="#/dashboard" class="btn btn-secondary">Volver</a>
          </div>
        </div>
        <div class="card__body">
          <div id="group-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadGroupDetails(groupId);
    } catch (error) {
      Notification.error('Error al cargar el grupo');
      console.error(error);
      document.getElementById('group-content').innerHTML = '<p class="text-error">Error al cargar la información del grupo.</p>';
    } finally {
      Loading.hide();
    }
  }

  async loadGroupDetails(groupId) {
    const content = document.getElementById('group-content');

    try {
      const [group, members] = await Promise.all([
        groupsAPI.getById(groupId),
        groupsAPI.getMembers(groupId)
      ]);

      if (!group) {
        content.innerHTML = '<p class="text-muted">Grupo no encontrado</p>';
        return;
      }

      content.innerHTML = `
        <div class="group-details">
          <div class="mb-4">
            <h2 class="text-xl font-bold mb-2">${group.nombre}</h2>
            <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 class="font-bold mb-2">Información</h3>
              <p><strong>ID:</strong> ${group.id}</p>
              <p><strong>Creado:</strong> ${group.createdAt ? new Date(group.createdAt).toLocaleDateString() : '-'}</p>
              <p><strong>Descripción:</strong> ${group.descripcion || '-'}</p>
            </div>
            
            <div>
              <h3 class="font-bold mb-2">Miembros (${members.length})</h3>
              ${this.renderMembersList(members)}
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error loading group details:', error);
      content.innerHTML = '<p class="text-error">Error al cargar detalles del grupo</p>';
    }
  }

  renderMembersList(members) {
    if (members.length === 0) return '<p class="text-muted">No hay miembros.</p>';

    return `
      <ul class="list-group">
        ${members.map(member => `
          <li class="list-group-item flex justify-between items-center">
            <span>${member.nombre} (${member.email})</span>
            <span class="badge badge--small badge--secondary">${member.rol || 'Miembro'}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }
}

export default new GroupView();
