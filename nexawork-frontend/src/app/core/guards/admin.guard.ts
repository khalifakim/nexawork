import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '@core/services/session.service';
import { ToastService } from '@core/services/toast.service';

/**
 * Blocks the route to non-admin users (règles R1, R6, R17).
 * Non-admins are redirected to their default landing (Mes tâches) with an info
 * toast. OWNER and ADMIN are both allowed through — they are considered
 * administrators of the workspace (REF C).
 */
export const adminGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  if (session.isAdmin()) return true;

  const router = inject(Router);
  const toast = inject(ToastService);
  toast.show({ message: 'Accès réservé aux administrateurs.', icon: 'warning' });
  return router.createUrlTree(['/app/accueil/mes-taches']);
};
