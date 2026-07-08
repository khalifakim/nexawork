import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, switchMap, take, throwError, timeout, TimeoutError } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { extractApiError } from '@core/http/response.model';
import { ToastService } from '@core/services/toast.service';
import { selectRefreshToken } from '@store/auth/auth.selectors';
import { AuthActions } from '@store/auth/auth.actions';
import { environment } from '@environment/environment';

/** Marqueur interne : la requête a déjà été rejouée après un refresh. */
const RETRIED_HEADER = 'X-Auth-Retried';

/** Délai max avant de considérer que le serveur ne répond pas (ms). */
const REQUEST_TIMEOUT_MS = 20_000;

/** Requêtes du domaine auth : jamais de tentative de refresh dessus. */
function isAuthEndpoint(req: HttpRequest<unknown>): boolean {
  return req.url.includes('/auth/');
}

/**
 * Gestion centralisée des erreurs HTTP backend :
 * - **timeout** (serveur injoignable / gelé) : toast explicite au lieu d'un
 *   blocage silencieux — la requête ne « pend » jamais plus de 20 s.
 * - **statut 0** (connexion refusée / réseau / CORS) : toast « serveur injoignable ».
 * - **401** (hors /auth/, hors requête déjà rejouée) : tente UNE rotation du
 *   refresh token puis rejoue la requête ; en échec → logout + /auth.
 * - **autres 4xx/5xx** : toast avec le `message` backend si présent.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const isApi = req.url.startsWith(environment.apiUrl);

  return next(req).pipe(
    // N'applique le timeout qu'aux appels backend (pas aux assets locaux).
    isApi ? timeout({ each: REQUEST_TIMEOUT_MS }) : (s => s),
    catchError((error: unknown) => {

      // ─── Serveur ne répond pas (timeout) ───────────────────────────────────
      if (error instanceof TimeoutError) {
        toast.show({
          message: 'Le serveur ne répond pas. Vérifiez que le backend est démarré (localhost:8080).',
          icon: 'warning',
        });
        return throwError(() => error);
      }

      const httpErr = error as HttpErrorResponse;

      // ─── Connexion impossible (refusée / réseau / CORS) ────────────────────
      if (isApi && httpErr.status === 0) {
        toast.show({
          message: 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.',
          icon: 'warning',
        });
        return throwError(() => httpErr);
      }

      // ─── 401 : tentative unique de refresh puis replay ─────────────────────
      if (isApi && httpErr.status === 401 && !isAuthEndpoint(req) && !req.headers.has(RETRIED_HEADER)) {
        return store.select(selectRefreshToken).pipe(
          take(1),
          switchMap(refreshToken => {
            if (!refreshToken) {
              store.dispatch(AuthActions.logout());
              return throwError(() => httpErr);
            }
            return auth.refresh({ refreshToken }).pipe(
              switchMap(response => {
                store.dispatch(AuthActions.refreshTokenSuccess({ response }));
                const retried = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${response.accessToken}`,
                    [RETRIED_HEADER]: '1',
                  },
                });
                return next(retried);
              }),
              catchError(refreshErr => {
                store.dispatch(AuthActions.logout());
                return throwError(() => refreshErr);
              })
            );
          })
        );
      }

      // ─── Autres erreurs API : toast informatif ─────────────────────────────
      if (isApi && httpErr.status >= 400 && httpErr.status !== 401) {
        toast.show({ message: extractApiError(httpErr), icon: 'warning' });
      }
      return throwError(() => httpErr);
    })
  );
};
