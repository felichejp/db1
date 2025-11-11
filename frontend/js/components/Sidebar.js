import authService from '../services/authService.js';
import { getRoleName } from '../utils/helpers.js';

/**
 * Componente Sidebar
 */
class Sidebar {
  constructor() {
    this.container = document.getElementById('sidebar-container');
  }

  getMenuItems(role) {
    const baseItems = [
      { path: '#/dashboard', label: 'Dashboard', icon: '📊' }
    ];

    const roleMenus = {
      Admin: [
        ...baseItems,
        { path: '#/admin', label: 'Administración', icon: '⚙️' },
        { path: '#/users', label: 'Usuarios', icon: '👥' },
        { path: '#/groups', label: 'Grupos', icon: '👨‍👩‍👧‍👦' },
        { path: '#/sessions', label: 'Sesiones', icon: '📅' }
      ],
      Profesor: [
        ...baseItems,
        { path: '#/groups', label: 'Mis Grupos', icon: '👨‍👩‍👧‍👦' },
        { path: '#/sessions', label: 'Sesiones', icon: '📅' },
        { path: '#/tutors', label: 'Tutores', icon: '🎓' }
      ],
      Tutor: [
        ...baseItems,
        { path: '#/sessions', label: 'Mis Sesiones', icon: '📅' },
        { path: '#/groups', label: 'Grupos', icon: '👨‍👩‍👧‍👦' },
        { path: '#/profile', label: 'Mi Perfil', icon: '👤' }
      ],
      Estudiante: [
        ...baseItems,
        { path: '#/groups', label: 'Mis Grupos', icon: '👨‍👩‍👧‍👦' },
        { path: '#/sessions', label: 'Sesiones', icon: '📅' },
        { path: '#/profile', label: 'Mi Perfil', icon: '👤' }
      ]
    };

    return roleMenus[role] || baseItems;
  }

  render() {
    const user = authService.getCurrentUser();

    if (!user) {
      this.container.innerHTML = '';
      return;
    }

    const menuItems = this.getMenuItems(user.role);
    const currentPath = window.location.hash || '#/dashboard';

    const menuHTML = menuItems.map(item => `
      <li class="sidebar__item">
        <a href="${item.path}" class="sidebar__link ${currentPath === item.path ? 'active' : ''}">
          <span>${item.icon}</span>
          <span>${item.label}</span>
        </a>
      </li>
    `).join('');

    this.container.innerHTML = `
      <aside class="sidebar">
        <ul class="sidebar__menu">
          ${menuHTML}
        </ul>
      </aside>
    `;

    // Toggle sidebar en mobile
    if (window.innerWidth <= 768) {
      this.container.classList.add('sidebar--collapsed');
    }
  }

  toggle() {
    this.container.classList.toggle('sidebar--open');
  }
}

export default new Sidebar();

