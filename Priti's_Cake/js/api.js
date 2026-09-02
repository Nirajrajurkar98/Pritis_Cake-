const API_URL = 'http://localhost:5000/api';

const api = {
  getHeaders: (isMultipart = false) => {
    const token = localStorage.getItem('pc_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isMultipart) headers['Content-Type'] = 'application/json';
    return headers;
  },

  handleResponse: async (response) => {
    if (response.status === 401) {
      localStorage.removeItem('pc_token');
      localStorage.removeItem('pc_admin');
      window.location.href = 'login.html';
      throw new Error('Session expired. Please login again.');
    }
    
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 403) throw new Error('You are not authorized to perform this action.');
      throw new Error((data && data.message) || 'Something went wrong. Please try again.');
    }
    return data;
  },

  get: async (endpoint) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: api.getHeaders()
      });
      return await api.handleResponse(response);
    } catch (err) {
      throw err;
    }
  },

  post: async (endpoint, data) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: api.getHeaders(),
        body: JSON.stringify(data)
      });
      return await api.handleResponse(response);
    } catch (err) {
      throw err;
    }
  },

  postMultipart: async (endpoint, formData) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: api.getHeaders(true),
        body: formData
      });
      return await api.handleResponse(response);
    } catch (err) {
      throw err;
    }
  },

  put: async (endpoint, data) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: api.getHeaders(),
        body: JSON.stringify(data)
      });
      return await api.handleResponse(response);
    } catch (err) {
      throw err;
    }
  },

  putMultipart: async (endpoint, formData) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: api.getHeaders(true),
        body: formData
      });
      return await api.handleResponse(response);
    } catch (err) {
      throw err;
    }
  },

  delete: async (endpoint) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: api.getHeaders()
      });
      return await api.handleResponse(response);
    } catch (err) {
      throw err;
    }
  }
};
