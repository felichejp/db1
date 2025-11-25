const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

/**
 * API client para autenticación
 */
export const authAPI = {
  async register(data) {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, data);
    return response.data;
  },

  async login(data) {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, data);
    return response.data;
  },

  async getMe() {
    const response = await axios.get(`${API_BASE_URL}/api/auth/me`);
    return response.data;
  },

  async verify() {
    const response = await axios.get(`${API_BASE_URL}/api/auth/verify`);
    return response.data;
  }
};

