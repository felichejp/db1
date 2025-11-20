import storageService from './storageService.js';

const AUTH_TOKEN_KEY = 'authToken';
const CURRENT_USER_KEY = 'currentUser';

/**
 * Servicio de autenticación
 */
class AuthService {
  /**
   * Guarda el token y usuario
   */
  setAuth(token, user) {
    storageService.setItem(AUTH_TOKEN_KEY, token);
    storageService.setItem(CURRENT_USER_KEY, user);
  }

  /**
   * Obtiene el token
   */
  getToken() {
    return storageService.getItem(AUTH_TOKEN_KEY);
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser() {
    return storageService.getItem(CURRENT_USER_KEY);
  }

  /**
   * Verifica si está autenticado
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Cierra sesión
   */
  logout() {
    storageService.removeItem(AUTH_TOKEN_KEY);
    storageService.removeItem(CURRENT_USER_KEY);
  }

  /**
   * Verifica si el token es válido
   */
  async verifyToken() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const apiBaseUrl = window.API_BASE_URL || 'http://localhost:3000';
      const response = await axios.get(`${apiBaseUrl}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data.success && response.data.data.valid;
    } catch (error) {
      return false;
    }
  }
}

export default new AuthService();

