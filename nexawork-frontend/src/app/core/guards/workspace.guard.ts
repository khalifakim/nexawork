import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import { selectUser } from '@store/auth/auth.selectors';

export const workspaceGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);
  return store.select(selectUser).pipe(
    take(1),
    map(user => user?.organisationId ? true : router.createUrlTree(['/workspace/setup']))
  );
};
