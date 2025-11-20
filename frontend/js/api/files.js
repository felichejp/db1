const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const filesAPI = {
  async getByGroup(groupId) {
    const response = await axios.get(`${API_BASE_URL}/api/files/group/${groupId}`);
    return response.data;
  },

  async upload(formData) {
    const response = await axios.post(`${API_BASE_URL}/api/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_BASE_URL}/api/files/${id}`);
    return response.data;
  },

  async download(id) {
    const response = await axios.get(`${API_BASE_URL}/api/files/${id}/download`);
    return response.data;
  },

  async delete(id) {
    const response = await axios.delete(`${API_BASE_URL}/api/files/${id}`);
    return response.data;
  }
};

