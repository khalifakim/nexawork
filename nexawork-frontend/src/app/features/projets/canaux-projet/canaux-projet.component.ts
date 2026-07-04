import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { SessionService } from '@core/services/session.service';
import { ChannelsService } from '@core/services/channels.service';
import { ToastService } from '@core/services/toast.service';
import { ConfirmDialogComponent } from '@shared/overlays/confirm-dialog/confirm-dialog.component';
import { slugify } from '@core/util/ui.util';

interface Chan { n: string; icon: 'bell' | 'hash'; access: string; members: number; last: string; locked: boolean; }

@Component({
  selector: 'app-canaux-projet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ConfirmDialogComponent],
  template: `
    <div class="wrap">
      <div class="toolbar">
        <div class="search">
          <app-icon name="search" [size]="16" />
          <input
            [value]="q()"
            (input)="q.set($any($event.target).value)"
            placeholder="Rechercher un canal…"
            aria-label="Rechercher un canal" />
        </div>
        <span class="spacer"></span>
        @if (!readonly && canManage()) {
          <button class="create" (click)="bus.openNewChannel('project')">
            <app-icon name="plus" [size]="16" />Créer un canal
          </button>
        }
      </div>
      <div class="tbl">
        <div class="thead">
          <span>Canal</span>
          <span>Accès</span>
          <span>Membres</span>
          <span>Activité</span>
          <span class="acts-head"></span>
        </div>
        @for (c of filtered(); track c.n) {
          <div class="row" (click)="open(c.n)">
            <div class="name">
              <span class="ic" [class.ic--bell]="c.icon==='bell'">
                @if (c.icon==='bell') { <app-icon name="bell" [size]="17" /> } @else { # }
              </span>
              <span class="nm">{{ c.n }}</span>
              @if (c.locked) { <app-icon class="lock" name="lock" [size]="14" /> }
            </div>
            <span class="muted">{{ c.access }}</span>
            <span class="muted">{{ c.members }} membres</span>
            <span class="muted">{{ c.last }}</span>
            <div class="acts">
              @if (canManage()) {
                <button class="act" title="Modifier" (click)="edit(c.n, $event)">
                  <app-icon name="edit" [size]="14" />
                </button>
                <button class="act" title="Gérer les accès" (click)="access(c.n, $event)">
                  <app-icon name="lock" [size]="14" />
                </button>
                <button class="act act--danger" title="Supprimer" (click)="askDelete(c.n, $event)">
                  <app-icon name="trash" [size]="14" />
                </button>
              }
            </div>
          </div>
        } @empty {
          <div class="empty">Aucun canal ne correspond à votre recherche.</div>
        }
      </div>
    </div>

    @if (confirmTarget(); as target) {
      <app-confirm-dialog
        [danger]="true"
        title="Supprimer le canal"
        [subtitle]="'#' + target"
        icon="trash"
        confirmLabel="Supprimer"
        [lines]="[
          'Cette suppression est irréversible.',
          'Le fil de messages et les paramètres du canal seront définitivement perdus.'
        ]"
        (confirmed)="doDelete(target)"
        (closed)="confirmTarget.set(null)" />
    }
  `,
  styleUrl: './canaux-projet.component.scss',
})
export class CanauxProjetComponent {
  @Input() readonly = false;
  /** Optional project name — used to label the archived-channels preview in the sidebar. */
  @Input() projectName: string | null = null;
  bus = inject(ShellBus);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private session = inject(SessionService);
  private channelsSvc = inject(ChannelsService);
  private toast = inject(ToastService);

  q = signal('');
  confirmTarget = signal<string | null>(null);

  /**
   * Visibility of the per-row actions and the "Créer un canal" CTA.
   * Restricted to ADMIN + OWNER (workspace admins) or the project lead
   * (placeholder until per-project role wiring lands in the backend).
   */
  canManage = computed<boolean>(() => this.session.isAdmin());

  chans: Chan[] = [
    { n: 'annonces-projet', icon: 'bell', access: 'Annonces · écriture restreinte', members: 8, last: 'il y a 2 h',    locked: true  },
    { n: 'général-projet',  icon: 'hash', access: 'Ouvert à tous les membres',      members: 8, last: 'il y a 14 min', locked: true  },
    { n: 'dev-frontend',    icon: 'hash', access: 'Ouvert à tous les membres',      members: 5, last: 'il y a 1 j',    locked: false },
    { n: 'design-revue',    icon: 'hash', access: 'Écriture restreinte',            members: 4, last: 'il y a 3 j',    locked: false },
  ];

  filtered = computed<Chan[]>(() => {
    const q = this.q().toLowerCase().trim();
    if (!q) return this.chans;
    return this.chans.filter(c => c.n.toLowerCase().includes(q));
  });

  /**
   * Open the channel. For archived projects (readonly + admin only), we arm
   * the sidebar's "archived channels preview" mode so the user can navigate
   * between the project's own channels from the Canaux rail; then we redirect
   * to the standalone /app/canaux/:id view. Non-admin viewers of an archived
   * project only reach the read-only chat directly.
   */
  open(n: string): void {
    const id = slugify(n);
    if (this.readonly && this.session.isAdmin()) {
      const projectId = this.route.parent?.snapshot.paramMap.get('id')
        ?? this.route.snapshot.paramMap.get('id')
        ?? 'projet-archive';
      const projectName = this.projectName ?? this.route.snapshot.queryParamMap.get('name') ?? projectId;
      this.bus.archivedChannelsPreview.set({ projectId, projectName });
    }
    this.router.navigate(['/app/canaux', id]);
  }

  /** Open the "Modifier le canal" modal (same one used by the sidebar menu). */
  edit(n: string, ev: Event): void {
    ev.stopPropagation();
    const id = slugify(n);
    // Kind is 'bell' for #annonces-projet, 'hash' otherwise (mirrors the sidebar).
    const kind: 'bell' | 'hash' = n === 'annonces-projet' ? 'bell' : 'hash';
    this.bus.openEditChannel({ id, name: n, kind });
  }

  /** Open the "Gérer les accès" modal (same one used by the sidebar menu). */
  access(n: string, ev: Event): void {
    ev.stopPropagation();
    const id = slugify(n);
    this.bus.openAccessChannel({ id, name: n, scope: 'project' });
  }

  askDelete(n: string, ev: Event): void {
    ev.stopPropagation();
    this.confirmTarget.set(n);
  }

  doDelete(n: string): void {
    const id = slugify(n);
    // Mock-delete: remove from the local table and forward to the service so
    // the sidebar reflects the change too. Toast + close confirm.
    this.chans = this.chans.filter(c => c.n !== n);
    this.channelsSvc.remove(id);
    this.confirmTarget.set(null);
    this.toast.show({ message: 'Canal « #' + n + ' » supprimé' });
  }
}
