import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL
});

const getAbsoluteApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return new URL(API_BASE_URL, window.location.origin).toString();
  }

  return API_BASE_URL;
};

const buildAnalysisWebSocketUrl = (userId) => {
  if (!userId) {
    return null;
  }

  const apiUrl = new URL(getAbsoluteApiBaseUrl());
  const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = localStorage.getItem('token');

  if (!token) {
    return null;
  }

  const socketUrl = new URL(
    `${apiUrl.pathname.replace(/\/$/, '')}/analysis/ws/${encodeURIComponent(userId)}`,
    `${protocol}//${apiUrl.host}`
  );

  socketUrl.searchParams.set('token', token);
  return socketUrl.toString();
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/register');

    if (!isAuthRequest && error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('authRedirect', 'auth');
        window.location.reload();
      }
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

export const fetchCurrentUser = async () => {
  const response = await api.get('/users/me');
  return response.data;
};

export const updateCurrentUser = async ({ fullName, email }) => {
  const response = await api.patch('/users/me', {
    full_name: fullName,
    email
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

  const currentUser = await fetchCurrentUser();
  localStorage.setItem('user', JSON.stringify(currentUser));

  return currentUser;
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

export const runAnalysis = async ({
  fieldId,
  startDate = null,
  endDate = null,
  seasonYear = null,
  satelliteSource = null,
  satelliteAcquisitionDate = null,
  cloudCoverage = null,
  qualityFlags = null
}) => {
  const response = await api.post('/analysis/analyze', {
    field_id: fieldId,
    start_date: startDate,
    end_date: endDate,
    season_year: seasonYear,
    satellite_source: satelliteSource,
    satellite_acquisition_date: satelliteAcquisitionDate,
    cloud_coverage: cloudCoverage,
    quality_flags: qualityFlags
  });

  return response.data;
};

export const saveField = async ({
  name,
  geometry,
  cropType = null,
  plantingDate = null,
  seasonYear = null
}) => {
  const response = await api.post('/geo/fields', {
    name,
    geometry,
    crop_type: cropType,
    planting_date: plantingDate,
    season_year: seasonYear
  });

  return response.data;
};

export const fetchAllFields = async () => {
  const response = await api.get('/geo/fields');
  return response.data;
};

export const fetchAnalysisHistory = async (params = {}) => {
  const response = await api.get('/analysis/history', { params });
  return response.data;
};

export const shareField = async ({ fieldId, email, role }) => {
  const response = await api.post('/geo/fields/share', {
    field_id: fieldId,
    email,
    role
  });

  return response.data;
};

export const fetchFieldTeam = async (fieldId) => {
  const response = await api.get(`/geo/fields/${fieldId}/team`);
  return response.data;
};

export const revokeFieldAccess = async ({ fieldId, userId }) => {
  const response = await api.delete(`/geo/fields/${fieldId}/team/${userId}`);
  return response.data;
};

export const fetchAdminStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const fetchAdminUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const updateAdminUser = async ({
  userId,
  email,
  fullName,
  role,
  isActive
}) => {
  const response = await api.patch(`/admin/users/${userId}`, {
    email,
    full_name: fullName,
    role,
    is_active: isActive
  });

  return response.data;
};

export const fetchAdminAudit = async () => {
  const response = await api.get('/admin/audit');
  return response.data;
};

export const createAdminUser = async ({ email, fullName, password, role }) => {
  const response = await api.post('/admin/users', {
    email,
    full_name: fullName,
    password,
    role
  });

  return response.data;
};

export const deactivateAdminUser = async (user) => {
  const response = await api.patch(`/admin/users/${user.id}`, {
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: false
  });

  return response.data;
};

export const fetchAnalysisStatus = async (analysisId) => {
  const response = await api.get(`/analysis/status/${analysisId}`);
  return response.data;
};

export const subscribeToAnalysisUpdates = (userId, handlers = {}) => {
  if (typeof window === 'undefined' || typeof window.WebSocket === 'undefined') {
    return () => {};
  }

  const socketUrl = buildAnalysisWebSocketUrl(userId);
  if (!socketUrl) {
    return () => {};
  }

  const socket = new window.WebSocket(socketUrl);

  socket.addEventListener('open', () => {
    handlers.onOpen?.();
  });

  socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      handlers.onMessage?.(payload);
    } catch (error) {
      handlers.onError?.(error);
    }
  });

  socket.addEventListener('error', (event) => {
    handlers.onError?.(event);
  });

  socket.addEventListener('close', (event) => {
    handlers.onClose?.(event);
  });

  return () => {
    if (socket.readyState === window.WebSocket.OPEN || socket.readyState === window.WebSocket.CONNECTING) {
      socket.close();
    }
  };
};

export const fetchFieldComments = async (fieldId) => {
  const response = await api.get(`/fields/${fieldId}/comments`);
  return response.data;
};

export const createFieldComment = async ({
  fieldId,
  content,
  markers = []
}) => {
  const response = await api.post(`/fields/${fieldId}/comments`, markers, {
    params: {
      comment_text: content
    }
  });

  return response.data;
};

export const fetchSatelliteData = async ({
  dataset,
  bbox,
  startDate = null,
  endDate = null,
  seasonYear = null
}) => {
  const response = await api.post('/satellite/fetch-satellite-data', {
    dataset,
    bbox,
    start_date: startDate,
    end_date: endDate,
    season_year: seasonYear
  });

  return response.data;
};
