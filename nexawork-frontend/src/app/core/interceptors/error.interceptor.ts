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

/**
 * Délai max avant de considérer que le serveur ne répond pas (ms). Calibré pour
 * une machine modeste où les JVM Spring Boot saturent le CPU au démarrage : 20 s
 * était trop agressif (les requêtes d'agrégation — tableau de bord, recherche,
 * catalogue de mentions — et les cold starts le dépassaient légitimement, d'où le
 * toast « serveur ne répond pas » intempestif). Le timeout reste une garde contre
 * un serveur réellement gelé, pas contre une requête simplement lente.
 */
const REQUEST_TIMEOUT_MS = 60_000;

/** Requêtes du domaine auth : jamais de tentative de refresh dessus. */
function isAuthEndpoint(req: HttpRequest<unknown>): boolean {
  return req.url.includes('/auth/');
}

/**
 * Requêtes légitimement longues (upload multipart, téléchargement/PDF binaire) :
 * leur durée dépend de la taille du fichier et du débit, pas de la réactivité du
 * serveur. Elles sont donc EXCLUES du timeout court — un upload de plusieurs Mo ne
 * doit jamais déclencher « le serveur ne répond pas ».
 */
function isLongRunning(req: HttpRequest<unknown>): boolean {
  return req.body instanceof FormData || req.responseType === 'blob';
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
    // Timeout uniquement sur les appels backend « courts » (ni upload, ni download binaire).
    isApi && !isLongRunning(req) ? timeout({ each: REQUEST_TIMEOUT_MS }) : (s => s),
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
