import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import { selectIsAuthenticated } from '@store/auth/auth.selectors';
import { environment } from '@environment/environment';

export const authGuard: CanActivateFn = () => {
  // En mode mock auth, la session de démo est toujours considérée valide.
  if (environment.mock.auth) return true;
  const store = inject(Store);
  const router = inject(Router);
  return store.select(selectIsAuthenticated).pipe(
    take(1),
    // Non connecté → page d'accueil (landing), pas directement le formulaire de login.
    map(isAuth => isAuth ? true : router.createUrlTree(['/auth/landing']))
  );
};
