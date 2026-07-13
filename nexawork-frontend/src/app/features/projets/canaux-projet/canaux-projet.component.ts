import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { SessionService } from '@core/services/session.service';
import { ChannelsService } from '@core/services/channels.service';
import { ToastService } from '@core/services/toast.service';
import { ConfirmDialogComponent } from '@shared/overlays/confirm-dialog/confirm-dialog.component';
import { Channel } from '@core/models/channel.models';

/** Ligne d'affichage d'un canal de projet (dérivée du Channel réel). */
interface Chan { id: string; n: string; icon: 'bell' | 'hash'; access: string; locked: boolean; }

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
        @for (c of filtered(); track c.id) {
          <div class="row" (click)="open(c)">
            <div class="name">
              <span class="ic" [class.ic--bell]="c.icon==='bell'">
                @if (c.icon==='bell') { <app-icon name="bell" [size]="17" /> } @else { # }
              </span>
              <span class="nm">{{ c.n }}</span>
              @if (c.locked) { <app-icon class="lock" name="lock" [size]="14" /> }
            </div>
            <span class="muted">{{ c.access }}</span>
            <span class="muted">—</span>
            <span class="muted">—</span>
            <div class="acts">
              @if (canManage()) {
                <button class="act" title="Modifier" (click)="edit(c, $event)">
                  <app-icon name="edit" [size]="14" />
                </button>
                <button class="act" title="Gérer les accès" (click)="access(c, $event)">
                  <app-icon name="lock" [size]="14" />
                </button>
                <button class="act act--danger" title="Supprimer" (click)="askDelete(c, $event)">
                  <app-icon name="trash" [size]="14" />
                </button>
              }
            </div>
          </div>
        } @empty {
          @if (q().trim()) {
            <div class="empty">Aucun canal ne correspond à votre recherche.</div>
          } @else {
            <div class="empty">Aucun canal dans ce projet pour le moment.@if (!readonly && canManage()) { <span> Utilisez « Créer un canal » pour en ajouter un.</span> }</div>
          }
        }
      </div>
    </div>

    @if (confirmTarget(); as target) {
      <app-confirm-dialog
        [danger]="true"
        title="Supprimer le canal"
        [subtitle]="'#' + target.n"
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
  confirmTarget = signal<Chan | null>(null);

  /**
   * Visibility of the per-row actions and the "Créer un canal" CTA.
   * Restricted to ADMIN + OWNER (workspace admins) or the project lead
   * (placeholder until per-project role wiring lands in the backend).
   */
  canManage = computed<boolean>(() => this.session.isAdmin());

  /** Canaux réels du workspace (rechargés au switch de workspace). */
  private allChannels = toSignal(this.channelsSvc.list(), { initialValue: [] as Channel[] });
  /** UUID du projet courant (depuis l'URL du shell projet). */
  private projectId = computed<string | null>(() =>
    this.route.parent?.snapshot.paramMap.get('id') ?? this.route.snapshot.paramMap.get('id') ?? null);

  /** Canaux réels de CE projet uniquement (aucune donnée mockée). */
  chans = computed<Chan[]>(() => {
    const pid = this.projectId();
    return this.allChannels()
      .filter(c => c.scope === 'project' && (!pid || c.projectId === pid))
      .map(c => ({
        id: c.id,
        n: c.name,
        icon: c.kind,
        access: this.accessLabel(c),
        locked: !!c.isPrivate,
      }));
  });

  filtered = computed<Chan[]>(() => {
    const q = this.q().toLowerCase().trim();
    const list = this.chans();
    if (!q) return list;
    return list.filter(c => c.n.toLowerCase().includes(q));
  });

  /** Libellé d'accès dérivé des vrais drapeaux du canal. */
  private accessLabel(c: Channel): string {
    if (c.kind === 'bell' || c.readonly) return 'Annonces · écriture restreinte';
    if (c.isPrivate) return 'Accès restreint';
    return 'Ouvert à tous les membres';
  }

  /**
   * Open the channel. For archived projects (readonly + admin only), we arm
   * the sidebar's "archived channels preview" mode so the user can navigate
   * between the project's own channels from the Canaux rail; then we redirect
   * to the standalone /app/canaux/:id view. Non-admin viewers of an archived
   * project only reach the read-only chat directly.
   */
  open(c: Chan): void {
    if (this.readonly && this.session.isAdmin()) {
      const projectId = this.projectId() ?? 'projet-archive';
      const projectName = this.projectName ?? this.route.snapshot.queryParamMap.get('name') ?? projectId;
      this.bus.archivedChannelsPreview.set({ projectId, projectName });
    }
    this.router.navigate(['/app/canaux', c.id]);
  }

  /** Ouvre le modal « Modifier le canal » (identique au menu de la sidebar). */
  edit(c: Chan, ev: Event): void {
    ev.stopPropagation();
    this.bus.openEditChannel({ id: c.id, name: c.n, kind: c.icon });
  }

  /** Ouvre le modal « Gérer les accès ». */
  access(c: Chan, ev: Event): void {
    ev.stopPropagation();
    this.bus.openAccessChannel({ id: c.id, name: c.n, scope: 'project' });
  }

  askDelete(c: Chan, ev: Event): void {
    ev.stopPropagation();
    this.confirmTarget.set(c);
  }

  doDelete(c: Chan): void {
    // Suppression réelle : le service retire le canal (la liste se rafraîchit).
    this.channelsSvc.remove(c.id);
    this.confirmTarget.set(null);
    this.toast.show({ message: 'Canal « #' + c.n + ' » supprimé' });
  }
}
