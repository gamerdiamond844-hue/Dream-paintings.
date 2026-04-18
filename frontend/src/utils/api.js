import axios from 'axios';

// Determine API base URL based on environment
const getBaseURL = () => {
  // Production (Render backend)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // Fallback - will use relative path
  return '/api';
};

const api = axios.create({ 
  baseURL: getBaseURL(),
  timeout: 30000, // 30 second timeout
});

// Request Interceptor - Add Auth Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor - Handle Errors
api.interceptors.response.use(
  res => res,
  err => {
    // Handle 401 Unauthorized
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!err.response) {
      console.error('Network Error:', err.message);
    }
    
    return Promise.reject(err);
  }
);

export default api;
