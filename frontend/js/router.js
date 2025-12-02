import authService from './services/authService.js';
import LoginView from './views/LoginView.js';
import RegisterView from './views/RegisterView.js';
import DashboardView from './views/DashboardView.js';
import GroupsView from './views/GroupsView.js';
import NotFoundView from './views/NotFoundView.js';
import StudentDashboardView from './views/StudentDashboardView.js';
import SubjectDetailsView from './views/SubjectDetailsView.js';
import TutorDashboardView from './views/TutorDashboardView.js';
import CoordinatorDashboardView from './views/CoordinatorDashboardView.js';
import AdminDashboardView from './views/AdminDashboardView.js';
import Header from './components/Header.js';
import Sidebar from './components/Sidebar.js';
import ChatWidget from './components/ChatWidget.js';

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
    // Rutas públicas
    this.routes.set('#/login', { view: LoginView, protected: false });
    this.routes.set('#/register', { view: RegisterView, protected: false });
    
    // Rutas protegidas - Dashboards
    this.routes.set('#/dashboard', { view: DashboardView, protected: true });
    this.routes.set('#/student/dashboard', { view: StudentDashboardView, protected: true });
    this.routes.set('#/tutor/dashboard', { view: TutorDashboardView, protected: true });
    this.routes.set('#/coordinator/dashboard', { view: CoordinatorDashboardView, protected: true });
    this.routes.set('#/admin/dashboard', { view: AdminDashboardView, protected: true });
    
    // Rutas de materias
    this.routes.set('#/subjects/:name', { view: SubjectDetailsView, protected: true });
    
    // Rutas de grupos
    this.routes.set('#/groups', { view: GroupsView, protected: true });
    this.routes.set('#/groups/:id', { view: GroupsView, protected: true });

    // Escuchar cambios de hash
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Manejar ruta inicial
    this.handleRoute();
  }

  async handleRoute() {
    let hash = window.location.hash || '#/dashboard';
    let routeKey = hash;
    
    // Manejar rutas dinámicas
    if (hash.startsWith('#/groups/') && hash !== '#/groups') {
      routeKey = '#/groups/:id';
    } else if (hash.startsWith('#/subjects/')) {
      routeKey = '#/subjects/:name';
    }
    
    const route = this.routes.get(routeKey);

    // Si no hay ruta, mostrar 404
    if (!route) {
      NotFoundView.render();
      if (authService.isAuthenticated()) {
        Header.render();
        Sidebar.render();
      }
      return;
    }

    // Verificar autenticación para rutas protegidas
    if (route.protected) {
      if (!authService.isAuthenticated()) {
        window.location.hash = '#/login';
        return;
      }
      
      // Verificar que el token sea válido antes de renderizar
      const isValid = await authService.verifyToken();
      if (!isValid) {
        authService.logout();
        window.location.hash = '#/login';
        return;
      }
    }

    // Si está en login/register y ya está autenticado, redirigir a dashboard
    if (!route.protected && authService.isAuthenticated()) {
      const isValid = await authService.verifyToken();
      if (isValid) {
        window.location.hash = '#/dashboard';
        return;
      } else {
        authService.logout();
      }
    }

    // Renderizar vista
    route.view.render();

    // Renderizar header y sidebar solo si está autenticado Y no está en login/register
    if (authService.isAuthenticated() && route.protected) {
      Header.render();
      Sidebar.render();
      
      // Mostrar sidebar y ajustar contenido
      const sidebarContainer = document.getElementById('sidebar-container');
      const mainContent = document.getElementById('main-content');
      
      if (sidebarContainer) {
        sidebarContainer.style.display = '';
      }
      if (mainContent) {
        mainContent.classList.add('with-sidebar');
        mainContent.classList.remove('main-content--full');
      }
      
      // Asegurar que el chat se inicialice si es necesario
      const user = authService.getCurrentUser();
      if (user && (user.role === 'Profesor' || user.role === 'Estudiante')) {
        // Verificar si el chat ya está inicializado
        if (!document.getElementById('chat-widget-container')) {
          setTimeout(() => {
            ChatWidget.init();
          }, 100);
        }
      }
    } else {
      // Limpiar header y sidebar en páginas públicas
      Header.container.innerHTML = '';
      Sidebar.container.innerHTML = '';
      
      // Ocultar sidebar completamente
      const sidebarContainer = document.getElementById('sidebar-container');
      const mainContent = document.getElementById('main-content');
      
      if (sidebarContainer) {
        sidebarContainer.style.display = 'none';
      }
      if (mainContent) {
        mainContent.classList.remove('with-sidebar');
        mainContent.classList.add('main-content--full');
      }
    }
  }

  navigate(path) {
    window.location.hash = path;
  }
}

export default new Router();


