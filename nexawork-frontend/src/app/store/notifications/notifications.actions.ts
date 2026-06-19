import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Notification } from '@core/models/notification.models';

export const NotificationActions = createActionGroup({
  source: 'Notifications',
  events: {
    'Load Notifications': emptyProps(),
    'Load Notifications Success': props<{ notifications: Notification[] }>(),
    'Load Notifications Failure': props<{ error: string }>(),
    'Load Unread Count': emptyProps(),
    'Load Unread Count Success': props<{ count: number }>(),
    'Mark All Read': emptyProps(),
    'Mark All Read Success': emptyProps(),
    'Notification Received': props<{ notification: Notification }>(),
  }
});
