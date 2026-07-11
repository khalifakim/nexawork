import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { ChannelsService } from '@core/services/channels.service';
import { ToastService } from '@core/services/toast.service';

/**
 * REF F — blocks direct URL access to a private channel that the current user
 * has no grant on. On refusal we redirect to the base `/app/canaux` view with
 * an information toast — following the "404-not-403" doctrine of REF F so the
 * user cannot infer the channel's existence from the response.
 *
 * On charge d'abord la liste des canaux : côté HTTP cela réchauffe le cache
 * slug→UUID nécessaire à `hasAccess` sur un accès direct par URL (deep-link).
 */
export const channelAccessGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const id = route.paramMap.get('id');
  if (!id) return true;

  const channels = inject(ChannelsService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return channels.list().pipe(
    map(() => {
      if (channels.hasAccess(id)) return true;
      toast.show({ message: 'Ce canal est privé et vous n\'y avez pas accès.', icon: 'warning' });
      return router.createUrlTree(['/app/canaux']);
    }),
  );
};
