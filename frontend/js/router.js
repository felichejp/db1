import authService from './services/authService.js';
import LoginView from './views/LoginView.js';
import RegisterView from './views/RegisterView.js';
import DashboardView from './views/DashboardView.js';
import GroupsView from './views/GroupsView.js';
import TutorView from './views/TutorView.js';
import ProfesorView from './views/ProfesorView.js';
import UsersView from './views/UsersView.js';
import NotFoundView from './views/NotFoundView.js';
import Header from './components/Header.js';
import Sidebar from './components/Sidebar.js';

/**
 * Router hash-based
 */
class Router {
  constructor() {
    this.routes = new Map();
    this.currentView = null;
    this.init();
  }

  init() {
    // Definir rutas
    this.routes.set('#/login', { view: LoginView, protected: false });
    this.routes.set('#/register', { view: RegisterView, protected: false });
    this.routes.set('#/dashboard', { view: DashboardView, protected: true });
    this.routes.set('#/tutor', { view: TutorView, protected: true });
    this.routes.set('#/profesor', { view: ProfesorView, protected: true });
    this.routes.set('#/users', { view: UsersView, protected: true });

    // Escuchar cambios de hash
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Manejar ruta inicial
    this.handleRoute();
  }

  handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    
    // Manejar rutas dinámicas
    if (hash.startsWith('#/groups/')) {
      const groupId = hash.split('/')[2];
      if (groupId) {
        // Verificar autenticación
        if (!authService.isAuthenticated()) {
          window.location.hash = '#/login';
          return;
        }
        GroupsView.renderGroupDetails(groupId);
        Header.render();
        Sidebar.render();
        return;
      }
    }

    const route = this.routes.get(hash);

    // Si no hay ruta, verificar si es una ruta dinámica conocida
    if (!route) {
      // Rutas dinámicas de grupos
      if (hash === '#/groups') {
        if (!authService.isAuthenticated()) {
          window.location.hash = '#/login';
          return;
        }
        GroupsView.render();
        Header.render();
        Sidebar.render();
        return;
      }

      NotFoundView.render();
      if (authService.isAuthenticated()) {
        Header.render();
        Sidebar.render();
      }
      return;
    }

    // Verificar autenticación para rutas protegidas
    if (route.protected && !authService.isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }

    // Si está en login/register y ya está autenticado, redirigir a dashboard
    if (!route.protected && authService.isAuthenticated()) {
      window.location.hash = '#/dashboard';
      return;
    }

    // Renderizar vista
    route.view.render();

    // Renderizar header y sidebar si está autenticado
    if (authService.isAuthenticated()) {
      Header.render();
      Sidebar.render();
    } else {
      Header.container.innerHTML = '';
      Sidebar.container.innerHTML = '';
    }
  }

  navigate(path) {
    window.location.hash = path;
  }
}

export default new Router();

