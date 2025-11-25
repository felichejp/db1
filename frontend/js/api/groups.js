const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const groupsAPI = {
  async getAll(params = {}) {
    const response = await axios.get(`${API_BASE_URL}/api/groups`, { params });
    return response.data;
  },

  async getAvailable() {
    const response = await axios.get(`${API_BASE_URL}/api/groups`, {
      params: { scope: 'available' }
    });
    return response.data;
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

