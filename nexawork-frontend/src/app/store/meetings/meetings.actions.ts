import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Call, CreateCallRequest } from '@core/models/meeting.models';

export const MeetingActions = createActionGroup({
  source: 'Meetings',
  events: {
    'Load Calls': emptyProps(),
    'Load Calls Success': props<{ calls: Call[] }>(),
    'Load Calls Failure': props<{ error: string }>(),
    'Create Call': props<{ request: CreateCallRequest }>(),
    'Create Call Success': props<{ call: Call }>(),
    'Create Call Failure': props<{ error: string }>(),
    'Join Call': props<{ callId: number }>(),
    'Join Call Success': props<{ call: Call }>(),
    'Join Call Failure': props<{ error: string }>(),
    'End Call': props<{ callId: number }>(),
  }
});
