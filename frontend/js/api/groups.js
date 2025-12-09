import authService from '../services/authService.js';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// Función helper para obtener headers con token
function getAuthHeaders() {
  const token = authService.getToken();
  return {
    Authorization: token ? `Bearer ${token}` : ''
  };
}

export const groupsAPI = {
  async getAll() {
    const response = await axios.get(`${API_BASE_URL}/api/groups`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_BASE_URL}/api/groups/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async create(data) {
    const response = await axios.post(`${API_BASE_URL}/api/groups`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async update(id, data) {
    const response = await axios.put(`${API_BASE_URL}/api/groups/${id}`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async delete(id) {
    const response = await axios.delete(`${API_BASE_URL}/api/groups/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async getMembers(id) {
    const response = await axios.get(`${API_BASE_URL}/api/groups/${id}/members`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async addMember(id, userId) {
    const response = await axios.post(`${API_BASE_URL}/api/groups/${id}/members`, 
      { userId },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  async removeMember(id, userId) {
    const response = await axios.delete(`${API_BASE_URL}/api/groups/${id}/members/${userId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async sendInvitation(id, invitedUserId) {
    const response = await axios.post(`${API_BASE_URL}/api/groups/${id}/invitations`, 
      { invitedUserId },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  async getInvitations(id) {
    const response = await axios.get(`${API_BASE_URL}/api/groups/${id}/invitations`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async acceptInvitation(invitationId) {
    const response = await axios.put(`${API_BASE_URL}/api/groups/invitations/${invitationId}/accept`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async rejectInvitation(invitationId) {
    const response = await axios.put(`${API_BASE_URL}/api/groups/invitations/${invitationId}/reject`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

