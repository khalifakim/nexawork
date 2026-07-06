import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { extractApiError } from '@core/http/response.model';
import { ToastService } from '@core/services/toast.service';
import { selectRefreshToken } from '@store/auth/auth.selectors';
import { AuthActions } from '@store/auth/auth.actions';
import { environment } from '@environment/environment';

/** Marqueur interne : la requête a déjà été rejouée après un refresh. */
const RETRIED_HEADER = 'X-Auth-Retried';

/** Requêtes du domaine auth : jamais de tentative de refresh dessus. */
function isAuthEndpoint(req: HttpRequest<unknown>): boolean {
  return req.url.includes('/auth/');
}

/**
 * Gestion centralisée des erreurs HTTP backend :
 * - **401** (hors endpoints /auth/ et hors requête déjà rejouée) : tente UNE
 *   rotation du refresh token, met le store à jour, rejoue la requête avec le
 *   nouveau Bearer. En échec → purge session (logout) + redirection /auth.
 * - **autres 4xx/5xx** : toast avec le `message` backend si présent.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isApi = req.url.startsWith(environment.apiUrl);

      // ─── 401 : tentative unique de refresh puis replay ─────────────────────
      if (isApi && error.status === 401 && !isAuthEndpoint(req) && !req.headers.has(RETRIED_HEADER)) {
        return store.select(selectRefreshToken).pipe(
          take(1),
          switchMap(refreshToken => {
            if (!refreshToken) {
              store.dispatch(AuthActions.logout());
              return throwError(() => error);
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
      if (isApi && error.status >= 400 && error.status !== 401) {
        toast.show({ message: extractApiError(error), icon: 'warning' });
      }
      return throwError(() => error);
    })
  );
};
