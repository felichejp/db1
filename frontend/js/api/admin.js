const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const adminAPI = {
  async getStats() {
    const response = await axios.get(`${API_BASE_URL}/api/admin/stats`);
    return response.data;
  },

  async getUsers() {
    const response = await axios.get(`${API_BASE_URL}/api/admin/users`);
    return response.data;
  },

  async getGroups() {
    const response = await axios.get(`${API_BASE_URL}/api/admin/groups`);
    return response.data;
  },

  async getReports() {
    const response = await axios.get(`${API_BASE_URL}/api/admin/reports`);
    return response.data;
  },

  async getBadges() {
    const response = await axios.get(`${API_BASE_URL}/api/admin/badges`);
    return response.data;
  },

  async createBadge(data) {
    const response = await axios.post(`${API_BASE_URL}/api/admin/badges`, data);
    return response.data;
  },

  async assignBadge(badgeId, userId) {
    const response = await axios.post(`${API_BASE_URL}/api/admin/badges/${badgeId}/assign/${userId}`);
    return response.data;
  }
};

