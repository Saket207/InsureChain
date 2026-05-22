import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  login: (userData) =>
    set({
      isAuthenticated: true,
      user: userData,
    }),
  logout: () => set({ isAuthenticated: false, user: null }),
  updateUser: (updates) =>
    set((state) => ({
      user: { ...state.user, ...updates },
    })),
}));
