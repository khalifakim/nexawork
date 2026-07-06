/**
 * Bascule mock ↔ backend réel **par domaine** (plan d'intégration I0-I10) :
 * à la fin de chaque phase, le domaine intégré passe à `false` (HTTP réel) et
 * se teste immédiatement dans le navigateur, pendant que le reste continue en
 * mock. Plus aucun `true` à la fin de l'intégration.
 */
export const environment = {
  production: false,
  /** true = données mock en mémoire ; false = backend réel (bascule par domaine). */
  mock: {
    auth: false,         // Phase I1 ✅ (auth + workspaces branchés au backend réel)
    projects: true,      // Phase I2
    tasks: true,         // Phase I2
    members: true,       // Phase I3
    channels: true,      // Phase I4
    conversations: true, // Phase I4
    ged: true,           // Phase I5
    notifications: true, // Phase I6
    accueil: true,       // Phase I7
    meetings: true,      // Phase I8
    search: true,        // Phase I9
  },
  /** Gateway — toutes les routes API passent par elle (context-paths, cf. core/http/api.config.ts). */
  apiUrl: 'http://localhost:8080',
  /** WebSocket routés par la Gateway (V5.1 §7.5). */
  wsMessagingUrl: 'http://localhost:8080/ws/messaging',
  wsNotificationUrl: 'http://localhost:8080/ws/notifications',
};
