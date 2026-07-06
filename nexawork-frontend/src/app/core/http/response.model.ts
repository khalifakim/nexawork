import { map, OperatorFunction } from 'rxjs';

/**
 * Enveloppe standard des réponses backend (nexawork-commons `Response<T>`) :
 * `{ status, payload, metadata?, message? }`. Les services HTTP consomment
 * toujours `payload` via l'opérateur {@link unwrap}.
 */
export interface ApiResponse<T> {
  status: string;
  payload: T;
  /** Pagination (`PageInfo`) ou métadonnées libres. */
  metadata?: PageInfo | Record<string, unknown> | null;
  /** Message d'erreur/succès (string ou map champ→erreur). */
  message?: unknown;
}

/** Pagination renvoyée dans `metadata` par les endpoints paginés. */
export interface PageInfo {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
}

/** Extrait `payload` d'une `ApiResponse<T>` (usage : `.pipe(unwrap())`). */
export function unwrap<T>(): OperatorFunction<ApiResponse<T>, T> {
  return map(r => r.payload);
}

/** Extrait un message d'erreur lisible depuis une HttpErrorResponse backend. */
export function extractApiError(err: unknown, fallback = 'Une erreur est survenue.'): string {
  const e = err as { error?: ApiResponse<unknown> | string; message?: string };
  const body = e?.error;
  if (typeof body === 'string' && body.trim()) return body;
  const msg = (body as ApiResponse<unknown>)?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (msg && typeof msg === 'object') {
    const first = Object.values(msg as Record<string, unknown>)[0];
    if (typeof first === 'string') return first;
  }
  return e?.message ?? fallback;
}
