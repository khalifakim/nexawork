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
    projects: false,     // Phase I2a ✅ (projets : liste, CRUD, archivage)
    tasks: false,        // Phase I2a ✅ (board Kanban : lecture, drag-drop FSM, suppression)
    members: false,      // Phase I3 ✅ (annuaire réel ; présence en attente de l'infra WS)
    channels: false,     // Phase I4 ✅ (REST + STOMP ; PJ de message différées)
    conversations: false,// Phase I4 ✅ (REST + STOMP ; accusé de lecture)
    ged: false,          // Phase I5 ✅ (arborescence, écritures, versions, accès, corbeille)
    notifications: false,// Phase I6 ✅ (REST + STOMP + Web Push)
    accueil: false,      // Phase I7 ✅ (dashboard, mentions, mes tâches)
    meetings: false,     // Phase I8/M2/M3/M4 ✅ (appels réels, IFrame JaaS, chat persistant, lobby)
    search: false,       // Phase I9 ✅ (recherche fédérée : 4 domaines, REF F/G respectées)
  },
  /** Gateway — toutes les routes API passent par elle (context-paths, cf. core/http/api.config.ts). */
  apiUrl: 'http://localhost:8080',
  /** WebSocket routés par la Gateway (V5.1 §7.5). */
  wsMessagingUrl: 'http://localhost:8080/ws/messaging',
  wsNotificationUrl: 'http://localhost:8080/ws/notifications',
  /** Clé publique VAPID (Web Push, V5.1 §7.6) — la clé privée reste au backend. */
  vapidPublicKey: 'BM8AL4x-9O_5wkUspvmULp3mVYZejAsttB-ImNMnFU1RiSW2yEll4T7NbNfZBFQ6ORyBLccERe4MUip-B6OWDJA',
};
