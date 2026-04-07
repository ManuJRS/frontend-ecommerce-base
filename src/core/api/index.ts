import axios from 'axios';

// Get API URL from env with fallback
const API_URL = import.meta.env.VITE_STRAPI_API_URL || 'http://localhost:1337/api';

/**
 * Base Axios instance for Strapi communication
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token (if needed in the future)
api.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem('strapi_jwt');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Centralized error handling
    console.error('API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);
