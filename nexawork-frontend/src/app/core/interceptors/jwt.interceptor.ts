import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { switchMap, take } from 'rxjs/operators';
import { selectToken } from '@store/auth/auth.selectors';
import { environment } from '@environment/environment';

/**
 * Routes backend accessibles sans JWT (liste blanche Gateway, V5.1 §14.10) :
 * endpoints anonymes d'auth, accès invité réunion.
 */
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/password/',
  '/auth/verify-email',
  '/auth/email/confirm-change',
  '/api/v1/guest/',
];

/**
 * Les invitations sont publiques **seulement** pour la consultation du contexte
 * (GET) et l'acceptation par un nouveau compte (POST …/accept). L'annulation, la
 * relance et le « rejoindre » d'un compte existant (POST …/join) exigent le Bearer.
 */
function isPublicInvitation(req: HttpRequest<unknown>): boolean {
  if (!req.url.includes('/api/v1/invitations/')) return false;
  return req.method === 'GET' || req.url.endsWith('/accept');
}

/** Pose `Authorization: Bearer` sur les requêtes API authentifiées uniquement. */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Ne concerne que les appels vers notre backend.
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  // Routes publiques : pas de Bearer.
  if (PUBLIC_PATHS.some(p => req.url.includes(p)) || isPublicInvitation(req)) return next(req);

  const store = inject(Store);
  return store.select(selectToken).pipe(
    take(1),
    switchMap(token => {
      if (token) {
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
      }
      return next(req);
    })
  );
};
