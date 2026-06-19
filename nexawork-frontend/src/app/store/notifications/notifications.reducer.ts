import { createReducer, on } from '@ngrx/store';
import { Notification } from '@core/models/notification.models';
import { NotificationActions } from './notifications.actions';

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationsState = { notifications: [], unreadCount: 0, loading: false, error: null };

export const notificationsReducer = createReducer(
  initialState,
  on(NotificationActions.loadNotifications, state => ({ ...state, loading: true, error: null })),
  on(NotificationActions.loadNotificationsSuccess, (state, { notifications }) => ({
    ...state, notifications, loading: false
  })),
  on(NotificationActions.loadNotificationsFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(NotificationActions.loadUnreadCountSuccess, (state, { count }) => ({ ...state, unreadCount: count })),
  on(NotificationActions.markAllReadSuccess, state => ({
    ...state,
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),
  on(NotificationActions.notificationReceived, (state, { notification }) => ({
    ...state,
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1,
  })),
);
