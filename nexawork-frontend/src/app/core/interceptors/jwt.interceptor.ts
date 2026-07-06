import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { switchMap, take } from 'rxjs/operators';
import { selectToken } from '@store/auth/auth.selectors';
import { environment } from '@environment/environment';

/**
 * Routes backend accessibles sans JWT (liste blanche Gateway, V5.1 §14.10) :
 * endpoints anonymes d'auth, consultation d'invitation, accès invité réunion.
 */
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/password/',
  '/auth/verify-email',
  '/api/v1/invitations/',
  '/api/v1/guest/',
];

/** Pose `Authorization: Bearer` sur les requêtes API authentifiées uniquement. */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Ne concerne que les appels vers notre backend.
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  // Routes publiques : pas de Bearer.
  if (PUBLIC_PATHS.some(p => req.url.includes(p))) return next(req);

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
