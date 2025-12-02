import authService from '../services/authService.js';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

function getAuthHeaders() {
  const token = authService.getToken();
  return {
    Authorization: token ? `Bearer ${token}` : ''
  };
}

export const adminAPI = {
  async getStats() {
    const response = await axios.get(`${API_BASE_URL}/api/admin/stats`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async getUsers() {
    const response = await axios.get(`${API_BASE_URL}/api/admin/users`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async getGroups() {
    const response = await axios.get(`${API_BASE_URL}/api/admin/groups`, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

