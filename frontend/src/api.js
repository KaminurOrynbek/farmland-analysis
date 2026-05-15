import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/register');

    if (!isAuthRequest && (error.response?.status === 401 || error.response?.status === 403)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }

    return Promise.reject(error);
  }
);

export const registerUser = async ({ email, password, fullName, role }) => {
  const response = await api.post('/auth/register', {
    email,
    password,
    full_name: fullName,
    role
  });

  return response.data;
};

export const loginUser = async ({ email, password }) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await api.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  localStorage.setItem('token', response.data.access_token);
  return response.data;
};

export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data.status === 'ok';
  } catch {
    return false;
  }
};

export const runAnalysis = async (fieldId, startDate = null, endDate = null) => {
  const response = await api.post('/analysis/analyze', {
    field_id: fieldId,
    start_date: startDate,
    end_date: endDate
  });

  return response.data;
};

export const saveField = async (name, geometry, area_ha) => {
  const response = await api.post('/geo/fields', {
    name,
    geometry,
    area_ha
  });

  return response.data;
};

export const fetchAllFields = async () => {
  const response = await api.get('/geo/fields');
  return response.data;
};

export const fetchAnalysisHistory = async () => {
  const response = await api.get('/analysis/history');
  return response.data;
};