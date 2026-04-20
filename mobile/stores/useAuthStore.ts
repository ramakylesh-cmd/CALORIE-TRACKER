// =============================================================================
// NutriPulse — Auth Store (Zustand)
// =============================================================================
import { create } from 'zustand';
import api from '@/services/api';
import * as Storage from '@/services/storage';

interface User {
  id: number;
  email: string;
  name: string;
  picture: string;
  sub?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** Attempt to restore session from SecureStore */
  checkAuth: () => Promise<void>;

  /** Login with Google credential (ID token) */
  loginWithGoogle: (credential: string) => Promise<void>;

  /** Logout and clear tokens */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async () => {
    try {
      const token = await Storage.getAccessToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        await Storage.setUser(res.data.user);
        set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      } else {
        await Storage.clearAll();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      await Storage.clearAll();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  loginWithGoogle: async (credential: string) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/google', { credential });
      const { user, access_token, refresh_token } = res.data;
      await Storage.setAccessToken(access_token);
      await Storage.setRefreshToken(refresh_token);
      await Storage.setUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    await Storage.clearAll();
    set({ user: null, isAuthenticated: false });
  },
}));
