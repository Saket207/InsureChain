import { create } from 'zustand';

export const useAlertStore = create((set) => ({
  alerts: [],
  unreadCount: 0,

  setAlerts: (alerts) => 
    set({
      alerts,
      unreadCount: alerts.filter((a) => !a.isRead).length,
    }),

  dismissAlert: (alertId) =>
    set((state) => {
      const updated = state.alerts.map((a) =>
        a.id === alertId ? { ...a, isRead: true } : a
      );
      return {
        alerts: updated,
        unreadCount: updated.filter((a) => !a.isRead).length,
      };
    }),

  markAllRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, isRead: true })),
      unreadCount: 0,
    })),
}));
