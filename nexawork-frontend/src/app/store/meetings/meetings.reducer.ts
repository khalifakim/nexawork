import { createReducer, on } from '@ngrx/store';
import { Call } from '@core/models/meeting.models';
import { MeetingActions } from './meetings.actions';

export interface MeetingsState {
  calls: Call[];
  loading: boolean;
  error: string | null;
}

const initialState: MeetingsState = { calls: [], loading: false, error: null };

export const meetingsReducer = createReducer(
  initialState,
  on(MeetingActions.loadCalls, state => ({ ...state, loading: true, error: null })),
  on(MeetingActions.loadCallsSuccess, (state, { calls }) => ({ ...state, calls, loading: false })),
  on(MeetingActions.loadCallsFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(MeetingActions.createCallSuccess, (state, { call }) => ({ ...state, calls: [call, ...state.calls] })),
  on(MeetingActions.joinCallSuccess, (state, { call }) => ({
    ...state,
    calls: state.calls.map(c => c.id === call.id ? call : c)
  })),
);
