import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ConfirmDialogComponent } from '@shared/overlays/confirm-dialog/confirm-dialog.component';
import { SessionService } from '@core/services/session.service';
import { WorkspaceLoaderService } from '@core/services/workspace-loader.service';
import { ToastService } from '@core/services/toast.service';
import { Workspace } from '@core/models/workspace.models';

interface Row extends Workspace { current: boolean; }

/**
 * « Mes espaces de travail » — fidèle au prototype `settingsEnvironnement`,
 * enrichi des règles R19 & R20 :
 *
 *  - **R19** : cliquer sur l'engrenage d'un workspace autre que le courant
 *    déclenche un loader plein écran (mêmes 800 ms que la bascule header),
 *    puis bascule le workspace actif, puis redirige vers `/parametres/general`.
 *    Si c'est déjà le workspace courant, on ouvre directement `/parametres/general`.
 *  - **R20** : le bouton « Quitter » ouvre un `ConfirmDialog` danger obligatoire
 *    avant de retirer l'entrée de la liste. Impossible sur un workspace OWNER.
 */
@Component({
  selector: 'app-param-espaces',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgTemplateOutlet, RouterLink, ConfirmDialogComponent],
  template: `
    <div class="set-page"><div class="set-inner">
      <h1 class="set-h1">Mes espaces de travail</h1>
      <p class="set-desc">Consultez et gérez vos espaces de travail.</p>

      <div class="grp">
        <div class="grp__r">
          <span class="grp__t">Créés par moi</span>
          <span class="grp__c">{{ mine().length }} {{ mine().length > 1 ? 'espaces' : 'espace' }}</span>
        </div>
        <div class="grp__s">Vous en êtes automatiquement administrateur et propriétaire.</div>
      </div>
      <div class="set-card">
        @for (w of mine(); track w.id; let i = $index) {
          <ng-container *ngTemplateOutlet="row; context: { w: w, i: i, kind: 'mine' }"></ng-container>
        }
      </div>

      <div class="grp grp--mt">
        <div class="grp__r">
          <span class="grp__t">Espaces rejoints</span>
          <span class="grp__c">{{ joined().length }} {{ joined().length > 1 ? 'espaces' : 'espace' }}</span>
        </div>
        <div class="grp__s">Espaces auxquels vous avez été invité — vous y êtes membre ou administrateur.</div>
      </div>
      <div class="set-card">
        @for (w of joined(); track w.id; let i = $index) {
          <ng-container *ngTemplateOutlet="row; context: { w: w, i: i, kind: 'joined' }"></ng-container>
        }
      </div>
    </div></div>

    <ng-template #row let-w="w" let-i="i" let-kind="kind">
      <div class="wrow" [class.wrow--first]="i===0">
        <span class="wlogo" [style.background]="w.color">{{ w.name[0].toUpperCase() }}</span>
        <div class="b">
          <div class="n">
            <span>{{ w.name }}</span>
            @if (w.current) {
              <span class="cur"><span class="cur__d"></span>Actuel</span>
            }
          </div>
          <div class="s">{{ w.members }} {{ w.members > 1 ? 'membres' : 'membre' }}</div>
        </div>

        <span class="badge"
              [class.badge--owner]="w.role==='OWNER'"
              [class.badge--admin]="w.role==='ADMIN'"
              [class.badge--member]="w.role==='MEMBER'">{{ roleLabel(w.role) }}</span>

        <div class="act">
          @if (kind === 'mine') {
            <!-- OWNER : gear ouvre Général. Si le workspace n'est pas courant, on bascule d'abord. -->
            @if (w.current) {
              <button class="gear" routerLink="/app/parametres/general" title="Paramètres de l'espace de travail">
                <app-icon name="gear" [size]="17" />
              </button>
            } @else {
              <button class="gear" (click)="openSettings(w)" title="Paramètres de l'espace de travail">
                <app-icon name="gear" [size]="17" />
              </button>
            }
          } @else {
            <!-- R19 : engrenage seulement si ADMIN. R20 : Quitter avec confirm. -->
            @if (w.role === 'ADMIN') {
              @if (w.current) {
                <button class="gear" routerLink="/app/parametres/general" title="Paramètres de l'espace de travail">
                  <app-icon name="gear" [size]="17" />
                </button>
              } @else {
                <button class="gear" (click)="openSettings(w)" title="Paramètres de l'espace de travail">
                  <app-icon name="gear" [size]="17" />
                </button>
              }
            }
            <button class="set-btn set-btn--danger" (click)="askLeave(w)">Quitter</button>
          }
        </div>
      </div>
    </ng-template>

    @if (leaveTarget(); as t) {
      <app-confirm-dialog
        [danger]="true"
        icon="logout"
        title="Quitter cet espace de travail ?"
        [subtitle]="t.name"
        confirmLabel="Quitter"
        [lines]="[
          'Vous perdrez l\\'accès à tous les projets, canaux et documents de cet espace.',
          'Un administrateur devra vous réinviter pour y revenir.'
        ]"
        (confirmed)="confirmLeave()"
        (closed)="leaveTarget.set(null)" />
    }
  `,
  styleUrl: './espaces.component.scss',
})
export class ParamEspacesComponent {
  private session = inject(SessionService);
  private router  = inject(Router);
  private loader  = inject(WorkspaceLoaderService);
  private toast   = inject(ToastService);

  /** Confirm-dialog target — non-null pendant la confirmation. */
  leaveTarget = signal<Row | null>(null);

  private rows = computed<Row[]>(() => {
    const currentId = this.session.activeWorkspaceId();
    return this.session.workspaces().map(w => ({ ...w, current: w.id === currentId }));
  });

  /** OWNER-owned workspaces, current one first. */
  mine = computed<Row[]>(() => this.rows()
    .filter(w => w.role === 'OWNER')
    .sort((a, b) => (a.current ? -1 : b.current ? 1 : 0)));

  /** Workspaces the user has joined (ADMIN or MEMBER). */
  joined = computed<Row[]>(() => this.rows().filter(w => w.role !== 'OWNER'));

  roleLabel(role: 'OWNER' | 'ADMIN' | 'MEMBER'): string {
    return role === 'OWNER' ? 'Propriétaire' : role === 'ADMIN' ? 'Administrateur' : 'Membre';
  }

  /**
   * R19 — engrenage sur un workspace autre que le courant : loader 800 ms +
   * bascule du workspace actif + redirect vers `/parametres/general`.
   */
  openSettings(w: Row): void {
    this.loader.show(800);
    setTimeout(() => {
      this.session.switchWorkspace(w.id);
      this.router.navigate(['/app/parametres/general']);
      this.toast.show({ message: 'Vous êtes maintenant sur « ' + w.name + ' »' });
    }, 800);
  }

  /** R20 — ouvre la confirmation avant de retirer le workspace. */
  askLeave(w: Row): void { this.leaveTarget.set(w); }

  /**
   * R20 — confirmation acceptée : retire le workspace. Si c'était le
   * workspace actif de la session, on déconnecte carrément l'utilisateur et
   * on le redirige vers la page de login (il perd tout accès à la plateforme
   * jusqu'à sa prochaine connexion).
   */
  confirmLeave(): void {
    const w = this.leaveTarget();
    if (!w) return;
    this.session.leaveWorkspace(w.id, ({ wasActive, ok }) => {
      this.leaveTarget.set(null);
      if (!ok) return;
      if (wasActive) {
        this.toast.show({ message: 'Vous avez quitté « ' + w.name + ' » — vous êtes déconnecté.' });
        this.session.logout(); // AuthEffect logout$ → route /auth/landing
      } else {
        this.toast.show({ message: 'Vous avez quitté « ' + w.name + ' »' });
      }
    });
  }
}
