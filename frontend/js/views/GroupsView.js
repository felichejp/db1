import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import { getStatusName } from '../utils/helpers.js';

class GroupsView {
  constructor() {
    this.groupsById = new Map();
    this.currentUser = null;
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    this.currentUser = user;
    const container = document.getElementById('view-container');
    const canCreateGroups = user.role === 'Admin' || user.role === 'Profesor';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Mis Grupos</h1>
          <p class="text-muted">
            Visualiza tu participación en grupos, su estado y disponibilidad de cupos.
          </p>
        </div>
        ${canCreateGroups ? '<button class="btn btn-primary" id="create-group-btn">Crear grupo</button>' : ''}
      </div>
      <div id="groups-sections" class="groups-page__sections">
        <div class="spinner"></div>
      </div>
    `;

    if (canCreateGroups) {
      document
        .getElementById('create-group-btn')
        ?.addEventListener('click', () => this.openCreateGroupModal());
    }

    await this.loadData();
  }

  async loadData() {
    const content = document.getElementById('groups-sections');
    if (!content || !this.currentUser) return;

    try {
      Loading.show();
      const includeMembers = this.currentUser.role === 'Admin' || this.currentUser.role === 'Profesor';
      const shouldLoadAvailable = this.currentUser.role === 'Estudiante';

      const requests = [
        groupsAPI.getAll(includeMembers ? { includeMembers: true } : undefined)
      ];

      if (shouldLoadAvailable) {
        requests.push(groupsAPI.getAvailable());
      }

      const [mineRes, availableRes] = await Promise.allSettled(requests);

      if (mineRes.status === 'rejected' && mineRes.reason?.response?.status === 401) {
        authService.logout();
        window.location.hash = '#/login';
        return;
      }

      const myGroups =
        mineRes.status === 'fulfilled' && mineRes.value.success ? mineRes.value.data : [];

      const availableGroups =
        shouldLoadAvailable &&
        availableRes &&
        availableRes.status === 'fulfilled' &&
        availableRes.value.success
          ? availableRes.value.data
          : [];

      this.groupsById = new Map(myGroups.map((group) => [group.id, group]));

      content.innerHTML = `
        ${this.renderMyGroupsSection(myGroups)}
        ${shouldLoadAvailable ? this.renderAvailableSection(availableGroups) : ''}
      `;

      this.bindEvents();
    } catch (error) {
      console.error(error);
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <p class="empty-state__message">No se pudo cargar la información de grupos.</p>
        </div>
      `;
    } finally {
      Loading.hide();
    }
  }

  renderMyGroupsSection(groups) {
    const hasGroups = groups.length > 0;
    const title =
      this.currentUser.role === 'Admin'
        ? 'Todos los grupos'
        : this.currentUser.role === 'Profesor'
        ? 'Grupos a mi cargo'
        : 'Grupos donde participo';

    return `
      <section class="groups-section">
        <div class="groups-section__header">
          <div>
            <h2>${title}</h2>
            <p class="text-muted">
              Estado, cupos y miembros disponibles en cada grupo.
            </p>
          </div>
          <span class="badge badge--info">${groups.length} grupo${groups.length === 1 ? '' : 's'}</span>
        </div>
        ${
          hasGroups
            ? `<div class="group-card-grid">
                ${groups.map((group) => this.renderGroupCard(group, { context: 'mine' })).join('')}
               </div>`
            : this.renderEmptyState('Aún no tienes grupos asignados.')
        }
      </section>
    `;
  }

  renderAvailableSection(groups) {
    const hasGroups = groups.length > 0;
    return `
      <section class="groups-section">
        <div class="groups-section__header">
          <div>
            <h2>Grupos disponibles</h2>
            <p class="text-muted">
              Explora grupos abiertos y verifica si tienen cupo disponible.
            </p>
          </div>
          <span class="badge badge--info">${groups.length}</span>
        </div>
        ${
          hasGroups
            ? `<div class="group-card-grid">
                ${groups.map((group) => this.renderGroupCard(group, { context: 'available' })).join('')}
               </div>`
            : this.renderEmptyState('No hay grupos disponibles por el momento.')
        }
      </section>
    `;
  }

  renderEmptyState(message) {
    return `
      <div class="group-card group-card--empty">
        <p class="text-muted">${message}</p>
      </div>
    `;
  }

  renderGroupCard(group, { context }) {
    const statusClass = this.getStatusClass(group.estado);
    const showMembersPreview =
      (this.currentUser.role === 'Admin' || this.currentUser.role === 'Profesor') &&
      context === 'mine' &&
      group.members;
    const availableSeats = Math.max(group.availableSeats ?? 0, 0);
    const isInactive = group.estado !== 'activo';

    let actions = '';

    if (context === 'available') {
      const disabled = group.isFull || isInactive;
      actions = `
        <button
          class="btn btn-secondary btn-sm js-request-access"
          data-group-id="${group.id}"
          ${disabled ? 'disabled' : ''}
        >
          ${group.isFull ? 'Sin cupo' : 'Solicitar ingreso'}
        </button>
      `;
    } else if (this.currentUser.role === 'Admin' || this.currentUser.role === 'Profesor') {
      actions = `
        <button
          class="btn btn-secondary btn-sm js-view-members"
          data-group-id="${group.id}"
        >
          Ver miembros
        </button>
      `;
    } else {
      actions = '<small class="text-muted">Acciones próximas</small>';
    }

    return `
      <article class="group-card" data-group-id="${group.id}">
        <div class="group-card__header">
          <div>
            <h3>${group.nombre}</h3>
            <p class="text-muted">Responsable: ${group.profesorNombre || 'Sin asignar'}</p>
          </div>
          <div class="group-card__status">
            <span class="group-status ${statusClass}">${getStatusName(group.estado)}</span>
            ${
              group.isFull
                ? '<span class="group-status group-status--full">CUPO LLENO</span>'
                : ''
            }
          </div>
        </div>
        <p class="group-card__description">${group.descripcion || 'Sin descripción registrada.'}</p>
        <div class="group-card__meta">
          <div>
            <small>Miembros</small>
            <strong>${group.memberCount}/${group.maxMembers}</strong>
          </div>
          <div>
            <small>Cupos disponibles</small>
            <strong>${availableSeats}</strong>
          </div>
          <div>
            <small>Estado</small>
            <strong>${getStatusName(group.estado)}</strong>
          </div>
        </div>
        ${
          showMembersPreview
            ? this.renderMembersPreview(group.members.slice(0, 3), group.memberCount)
            : ''
        }
        <div class="group-card__actions">
          ${actions}
        </div>
      </article>
    `;
  }

  renderMembersPreview(members, total) {
    return `
      <div class="group-card__members">
        <small>Miembros (${total})</small>
        <div class="group-card__members-list">
          ${members
            .map(
              (member) => `
                <span class="group-member-chip" title="${member.email}">
                  ${member.nombre} <small>(${member.role})</small>
                </span>
              `
            )
            .join('')}
          ${total > members.length ? `<span class="group-member-chip">+${total - members.length}</span>` : ''}
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.querySelectorAll('.js-view-members').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const groupId = Number(event.currentTarget?.getAttribute('data-group-id'));
        if (groupId) {
          this.openMembersModal(groupId);
        }
      });
    });

    document.querySelectorAll('.js-request-access').forEach((btn) => {
      btn.addEventListener('click', () => {
        Notification.info('Pronto podrás solicitar ingreso directamente desde aquí.');
      });
    });
  }

  async openMembersModal(groupId) {
    try {
      let group = this.groupsById.get(groupId);
      let members = group?.members;

      if (!members) {
        const response = await groupsAPI.getMembers(groupId);
        if (response.success) {
          members = response.data;
        }
      }

      const modal = Modal.show(
        'Miembros del grupo',
        `
          ${
            members && members.length
              ? `<ul class="group-members-modal">
                  ${members
                    .map(
                      (member) => `
                        <li>
                          <strong>${member.nombre}</strong>
                          <span>${member.email}</span>
                          <small>${member.role}</small>
                        </li>
                      `
                    )
                    .join('')}
                </ul>`
              : '<p class="text-muted">Este grupo aún no tiene miembros.</p>'
          }
        `
      );

    } catch (error) {
      console.error(error);
      Notification.error('No se pudieron cargar los miembros del grupo.');
    }
  }

  openCreateGroupModal() {
    const modal = Modal.show(
      'Crear nuevo grupo',
      `
        <form id="create-group-form" class="form">
          <div class="form-group">
            <label class="form-label" for="group-name">Nombre del grupo</label>
            <input type="text" id="group-name" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="group-description">Descripción</label>
            <textarea id="group-description" class="form-textarea" rows="4"></textarea>
          </div>
        </form>
      `,
      `
        <button class="btn btn-secondary" id="cancel-create-group">Cancelar</button>
        <button class="btn btn-primary" type="submit" form="create-group-form">Crear</button>
      `
    );

    modal.querySelector('#cancel-create-group')?.addEventListener('click', () => Modal.hide());

    modal.querySelector('#create-group-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const nameInput = document.getElementById('group-name');
      const descriptionInput = document.getElementById('group-description');
      const nombre = nameInput?.value.trim();
      const descripcion = descriptionInput?.value.trim();

      if (!nombre) {
        Notification.error('El nombre del grupo es requerido.');
        return;
      }

      try {
        Loading.show();
        const response = await groupsAPI.create({ nombre, descripcion });
        if (response.success) {
          Notification.success('Grupo creado correctamente.');
          Modal.hide();
          await this.loadData();
        } else {
          Notification.error(response.message || 'No se pudo crear el grupo.');
        }
      } catch (error) {
        console.error(error);
        Notification.error('No se pudo crear el grupo. Intenta nuevamente.');
      } finally {
        Loading.hide();
      }
    });
  }

  getStatusClass(status) {
    if (status === 'activo') return 'group-status--active';
    if (status === 'inactivo') return 'group-status--inactive';
    if (status === 'completado') return 'group-status--completed';
    return 'group-status--info';
  }
}

export default new GroupsView();


