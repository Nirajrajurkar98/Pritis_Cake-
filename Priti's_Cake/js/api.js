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
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      let errMessage = (data && data.message) || 'Something went wrong. Please try again.';
      if (response.status === 401) {
        errMessage = data && data.message ? data.message : 'Session expired. Please login again.';
      } else if (response.status === 403) {
        errMessage = 'You are not authorized to perform this action.';
      }
      
      const error = new Error(errMessage);
      error.status = response.status;
      throw error;
    }
    return data;
  },

  // Centralized request helper — every API call flows through here so the
  // authorization header, base URL and JSON handling stay in one place.
  // The Node.js/Express backend is the source of truth: the frontend only
  // sends the data the API contract asks for, never stitched-up responses.
  request: async (method, endpoint, options = {}) => {
    const { data, isMultipart } = options;
    const config = {
      method,
      headers: api.getHeaders(isMultipart)
    };
    if (data !== undefined && !isMultipart) config.body = JSON.stringify(data);
    else if (data !== undefined) config.body = data;

    try {
      const response = await fetch(`${API_URL}${endpoint}`, config);
      return await api.handleResponse(response);
    } catch (err) {
      if (err instanceof TypeError) {
        const networkError = new Error('Unable to connect to the server. Please check your connection and try again.');
        networkError.status = 0;
        networkError.isNetworkError = true;
        throw networkError;
      }
      throw err;
    }
  },

  get: async (endpoint) => api.request('GET', endpoint),

  post: async (endpoint, data) => api.request('POST', endpoint, { data }),

  postMultipart: async (endpoint, formData) => api.request('POST', endpoint, { data: formData, isMultipart: true }),

  put: async (endpoint, data) => api.request('PUT', endpoint, { data }),

  putMultipart: async (endpoint, formData) => api.request('PUT', endpoint, { data: formData, isMultipart: true }),

  delete: async (endpoint) => api.request('DELETE', endpoint)
};
