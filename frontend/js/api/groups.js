const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const groupsAPI = {
  async getAll() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/groups`);
      console.log('API Groups Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error en groupsAPI.getAll:', error);
      // Retornar el error para que el componente lo maneje
      if (error.response) {
        return {
          success: false,
          error: error.response,
          message: error.response.data?.message || error.response.data?.error || 'Error al obtener grupos',
          status: error.response.status
        };
      } else if (error.request) {
        return {
          success: false,
          error: error,
          message: 'No se pudo conectar al servidor. Verifica que el backend esté corriendo.',
          status: 0
        };
      } else {
        return {
          success: false,
          error: error,
          message: error.message || 'Error desconocido al obtener grupos',
          status: 500
        };
      }
    }
  },

  async getById(id) {
    const response = await axios.get(`${API_BASE_URL}/api/groups/${id}`);
    return response.data;
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
    const response = await axios.get(`${API_BASE_URL}/api/groups/${id}/members`);
    return response.data;
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

