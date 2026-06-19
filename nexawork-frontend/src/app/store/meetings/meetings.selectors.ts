import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MeetingsState } from './meetings.reducer';

export const selectMeetingsState   = createFeatureSelector<MeetingsState>('meetings');
export const selectCalls           = createSelector(selectMeetingsState, s => s.calls);
export const selectMeetingsLoading = createSelector(selectMeetingsState, s => s.loading);
export const selectMeetingsError   = createSelector(selectMeetingsState, s => s.error);
