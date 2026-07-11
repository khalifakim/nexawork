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
    ged: true,
    notifications: true,
    accueil: true,
    meetings: true,
    search: true,
  },
  /** Même origine : nginx proxifie /nexawork-*-api-v1 vers la Gateway. */
  apiUrl: '',
  wsMessagingUrl: '/ws/messaging',
  wsNotificationUrl: '/ws/notifications',
};
