/**
 * Production (conteneur Docker nginx). Même origine : le frontend appelle des
 * chemins relatifs (`apiUrl` vide → `/nexawork-{service}-api-v1/...`) que nginx
 * proxifie vers la Gateway (voir nginx.conf). Pas de mock : backend réel.
 *
 * Note : les domaines pas encore intégrés (projets, GED, etc.) restent liés à
 * leurs `*MockService` dans `data.providers.ts` jusqu'à leur phase — ces
 * drapeaux ne concernent que les services déjà basculés (auth).
 */
export const environment = {
  production: true,
  mock: {
    auth: false,
    projects: false,     // Phase I2a
    tasks: false,        // Phase I2a
    members: false,      // Phase I3
    channels: false,     // Phase I4
    conversations: false,// Phase I4
    ged: false,          // Phase I5
    notifications: false,// Phase I6
    accueil: false,      // Phase I7
    meetings: true,
    search: false,       // Phase I9
  },
  /** Même origine : nginx proxifie /nexawork-*-api-v1 vers la Gateway. */
  apiUrl: '',
  wsMessagingUrl: '/ws/messaging',
  wsNotificationUrl: '/ws/notifications',
  /** Clé publique VAPID (Web Push, V5.1 §7.6) — la clé privée reste au backend. */
  vapidPublicKey: 'BM8AL4x-9O_5wkUspvmULp3mVYZejAsttB-ImNMnFU1RiSW2yEll4T7NbNfZBFQ6ORyBLccERe4MUip-B6OWDJA',
};
