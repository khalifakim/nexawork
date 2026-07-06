/** Production : tout sur le backend réel (aucun mock). */
export const environment = {
  production: true,
  mock: {
    auth: false,
    projects: false,
    tasks: false,
    members: false,
    channels: false,
    conversations: false,
    ged: false,
    notifications: false,
    accueil: false,
    meetings: false,
    search: false,
  },
  apiUrl: '/api',
  wsMessagingUrl: '/ws/messaging',
  wsNotificationUrl: '/ws/notifications',
};
