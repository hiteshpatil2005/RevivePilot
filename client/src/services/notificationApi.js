import api, { withFallback } from './api';
import { MOCK_NOTIFICATIONS } from '../data/mockData';

export const notificationApi = {
  getNotifications: (params = {}) =>
    withFallback(
      () => api.get('/notifications', { params }),
      () => {
        const unread = MOCK_NOTIFICATIONS.filter(n => !n.read).length;
        return {
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: unread,
          total: MOCK_NOTIFICATIONS.length,
        };
      }
    ),

  markAsRead: (id) =>
    withFallback(
      () => api.patch(`/notifications/${id}/read`),
      () => ({ success: true, id, read: true })
    ),

  markAllAsRead: () =>
    withFallback(
      () => api.patch('/notifications/read-all'),
      () => ({ success: true })
    ),
};
