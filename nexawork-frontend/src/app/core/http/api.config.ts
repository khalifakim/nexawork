import { environment } from '@environment/environment';

/**
 * Context-paths des microservices derrière la Gateway (V5.1 §13 / §14.10).
 * Chaque service Spring expose son API sous `/nexawork-{service}-api-v1` ; la
 * Gateway route sur ce préfixe (`Path=/nexawork-{service}-api-v1/**`).
 *
 * URL finale : `api('project', '/projects')`
 *   → `http://localhost:8080/nexawork-project-api-v1/api/v1/projects`
 */
export const API = {
  auth:         '/nexawork-auth-api-v1/api/v1',
  project:      '/nexawork-project-api-v1/api/v1',
  messaging:    '/nexawork-messaging-api-v1/api/v1',
  meeting:      '/nexawork-meeting-api-v1/api/v1',
  notification: '/nexawork-notification-api-v1/api/v1',
  file:         '/nexawork-file-api-v1/api/v1',
  ged:          '/nexawork-ged-api-v1/api/v1',
} as const;

export type ApiService = keyof typeof API;

/** Construit l'URL complète d'un endpoint : gateway + context-path + chemin. */
export function api(service: ApiService, path: string): string {
  return `${environment.apiUrl}${API[service]}${path}`;
}
