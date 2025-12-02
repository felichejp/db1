const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const adminAPI = {
  async getStats() {
    const response = await axios.get(`${API_BASE_URL}/api/admin/stats`);
    return response.data;
  },

  async getGroups() {
    const response = await axios.get(`${API_BASE_URL}/api/admin/groups`);
    return response.data;
  },

  async getReports() {
    const response = await axios.get(`${API_BASE_URL}/api/admin/reports`);
    return response.data;
  }
};


