import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MessagingState } from './messaging.reducer';

export const selectMessagingState   = createFeatureSelector<MessagingState>('messaging');
export const selectChannels         = createSelector(selectMessagingState, s => s.channels);
export const selectCurrentChannel   = createSelector(selectMessagingState, s => s.currentChannel);
export const selectMessages         = createSelector(selectMessagingState, s => s.messages);
export const selectMessagingLoading = createSelector(selectMessagingState, s => s.loading);
