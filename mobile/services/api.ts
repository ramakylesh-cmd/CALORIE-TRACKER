// =============================================================================
// NutriPulse — API Client (Axios + JWT Interceptors)
// =============================================================================
import axios from 'axios';
import * as Storage from './storage';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await Storage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor: auto-refresh on 401 ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await Storage.getRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${refreshToken}` } }
          );
          const newToken = res.data.access_token;
          await Storage.setAccessToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch {
          // Refresh failed — force logout
          await Storage.clearAll();
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
