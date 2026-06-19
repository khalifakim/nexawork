import { createReducer, on } from '@ngrx/store';
import { Channel, Message } from '@core/models/messaging.models';
import { MessagingActions } from './messaging.actions';

export interface MessagingState {
  channels: Channel[];
  currentChannel: Channel | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
}

const initialState: MessagingState = {
  channels: [],
  currentChannel: null,
  messages: [],
  loading: false,
  error: null,
};

export const messagingReducer = createReducer(
  initialState,
  on(MessagingActions.loadChannels, state => ({ ...state, loading: true, error: null })),
  on(MessagingActions.loadChannelsSuccess, (state, { channels }) => ({ ...state, channels, loading: false })),
  on(MessagingActions.loadChannelsFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(MessagingActions.selectChannel, (state, { channel }) => ({ ...state, currentChannel: channel, messages: [] })),
  on(MessagingActions.loadMessagesSuccess, (state, { messages }) => ({ ...state, messages })),
  on(MessagingActions.messageReceived, (state, { message }) => ({
    ...state, messages: [...state.messages, message]
  })),
);
