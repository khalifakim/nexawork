export const environment = {
  production: false,
  /** true = données mock en mémoire ; false = backend réel (bascule par domaine, plan I0-I9). */
  useMock: true,
  /** Gateway — toutes les routes API passent par elle (context-paths, cf. core/http/api.config.ts). */
  apiUrl: 'http://localhost:8080',
  /** WebSocket routés par la Gateway (V5.1 §7.5) — plus d'accès direct aux services. */
  wsMessagingUrl: 'http://localhost:8080/ws/messaging',
  wsNotificationUrl: 'http://localhost:8080/ws/notifications',
};
