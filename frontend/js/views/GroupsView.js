import { groupsAPI } from '../api/groups.js';
import Loading from '../components/Loading.js';
import { getStatusColor, getStatusName } from '../utils/helpers.js';

class GroupsView {
    async render() {
        const container = document.getElementById('view-container');
        container.innerHTML = `
      <div class="dashboard-header mb-3">
        <h1 class="card__title" style="font-size: 2rem;">Mis Grupos</h1>
        <p class="text-muted">Grupos a los que perteneces</p>
      </div>
      
      <div id="groups-content">
        <div class="spinner" style="margin: 3rem auto;"></div>
      </div>
    `;

        try {
            Loading.show();
            // Assuming groupsAPI.getAll() returns groups for the current user
            // If not, we might need a specific endpoint like groupsAPI.getMyGroups()
            const response = await groupsAPI.getAll();

            if (response.success) {
                this.renderGroupsList(response.data);
            } else {
                document.getElementById('groups-content').innerHTML = this.renderEmptyState('Error al cargar grupos');
            }
        } catch (error) {
            console.error(error);
            document.getElementById('groups-content').innerHTML = this.renderEmptyState('Error de conexión');
        } finally {
            Loading.hide();
        }
    }

    renderGroupsList(groups) {
        const container = document.getElementById('groups-content');

        if (groups.length === 0) {
            container.innerHTML = this.renderEmptyState('No perteneces a ningún grupo aún');
            return;
        }

        container.innerHTML = `
      <div class="dashboard-grid">
        ${groups.map(group => this.renderGroupCard(group)).join('')}
      </div>
    `;
    }

    renderGroupCard(group) {
        return `
      <div class="card" style="padding: 1.5rem; border-left: 4px solid var(--accent-color);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
          <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
          <span class="text-muted" style="font-size: 0.85rem;">${group.miembrosCount || 0} miembros</span>
        </div>
        
        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">${group.nombre}</h3>
        <p class="text-muted" style="margin-bottom: 1rem; font-size: 0.9rem;">${group.descripcion || 'Sin descripción'}</p>
        
        <div style="margin-bottom: 1rem; font-size: 0.9rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>👨‍🏫</span> 
            <strong>Profesor:</strong> ${group.nombreProfesor || 'No asignado'}
          </div>
        </div>

        <button class="btn btn-primary w-full" onclick="window.location.hash='#/groups/${group.id}'">
          Ver Detalles
        </button>
      </div>
    `;
    }

    renderEmptyState(message) {
        return `
      <div class="card text-center" style="padding: 3rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">👨‍👩‍👧‍👦</div>
        <p class="text-muted">${message}</p>
      </div>
    `;
    }
}

export default new GroupsView();
