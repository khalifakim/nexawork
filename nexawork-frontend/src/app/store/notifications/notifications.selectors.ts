import { createFeatureSelector, createSelector } from '@ngrx/store';
import { NotificationsState } from './notifications.reducer';

export const selectNotificationsState = createFeatureSelector<NotificationsState>('notifications');
export const selectNotifications      = createSelector(selectNotificationsState, s => s.notifications);
export const selectUnreadCount        = createSelector(selectNotificationsState, s => s.unreadCount);
export const selectNotificationsLoading = createSelector(selectNotificationsState, s => s.loading);
