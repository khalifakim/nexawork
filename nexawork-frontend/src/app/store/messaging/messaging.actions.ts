import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Channel, Message } from '@core/models/messaging.models';

export const MessagingActions = createActionGroup({
  source: 'Messaging',
  events: {
    'Load Channels': emptyProps(),
    'Load Channels Success': props<{ channels: Channel[] }>(),
    'Load Channels Failure': props<{ error: string }>(),
    'Select Channel': props<{ channel: Channel }>(),
    'Load Messages': props<{ channelId: number }>(),
    'Load Messages Success': props<{ messages: Message[] }>(),
    'Load Messages Failure': props<{ error: string }>(),
    'Message Received': props<{ message: Message }>(),
  }
});
