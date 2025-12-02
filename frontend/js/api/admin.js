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

  async createGroup(data) {
    const response = await axios.post(`${API_BASE_URL}/api/groups`, data);
    return response.data;
  },

  async assignProfesorToGroup(groupId, profesorId) {
    const response = await axios.post(`${API_BASE_URL}/api/admin/groups/${groupId}/assign-profesor`, { profesorId });
    return response.data;
  },

  async assignTutorToGroup(groupId, tutorId) {
    const response = await axios.post(`${API_BASE_URL}/api/admin/groups/${groupId}/assign-tutor`, { tutorId });
    return response.data;
  },

  async assignAlumnoToGroup(groupId, userId) {
    const response = await axios.post(`${API_BASE_URL}/api/admin/groups/${groupId}/assign-alumno`, { userId });
    return response.data;
  }
};

