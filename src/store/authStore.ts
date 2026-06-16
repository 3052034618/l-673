import { create } from 'zustand';
import type { User } from '../../shared/types';
import { login, getCurrentUser, logout as apiLogout } from '../api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await login({ username, password });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || '登录失败',
        loading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiLogout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  fetchCurrentUser: async () => {
    set({ loading: true });
    try {
      const user = await getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
