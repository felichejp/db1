const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const groupsAPI = {
  async getAll() {
    const response = await axios.get(`${API_BASE_URL}/api/groups`);
    return response.data;
  },

  async getById(id) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/groups/${id}`);
      return response.data;
    } catch (error) {
      // Re-lanzar el error para que el componente lo maneje
      throw error;
    }
  },

  async create(data) {
    const response = await axios.post(`${API_BASE_URL}/api/groups`, data);
    return response.data;
  },

  async update(id, data) {
    const response = await axios.put(`${API_BASE_URL}/api/groups/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await axios.delete(`${API_BASE_URL}/api/groups/${id}`);
    return response.data;
  },

  async getMembers(id) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/groups/${id}/members`);
      return response.data;
    } catch (error) {
      // Si falla, devolver un objeto con success: false
      return { success: false, message: error.response?.data?.message || 'Error al cargar miembros' };
    }
  },

  async addMember(id, userId) {
    const response = await axios.post(`${API_BASE_URL}/api/groups/${id}/members`, { userId });
    return response.data;
  },

  async removeMember(id, userId) {
    const response = await axios.delete(`${API_BASE_URL}/api/groups/${id}/members/${userId}`);
    return response.data;
  },

  async sendInvitation(id, invitedUserId) {
    const response = await axios.post(`${API_BASE_URL}/api/groups/${id}/invitations`, { invitedUserId });
    return response.data;
  },

  async getInvitations(id) {
    const response = await axios.get(`${API_BASE_URL}/api/groups/${id}/invitations`);
    return response.data;
  },

  async acceptInvitation(invitationId) {
    const response = await axios.put(`${API_BASE_URL}/api/groups/invitations/${invitationId}/accept`);
    return response.data;
  },

  async rejectInvitation(invitationId) {
    const response = await axios.put(`${API_BASE_URL}/api/groups/invitations/${invitationId}/reject`);
    return response.data;
  }
};

