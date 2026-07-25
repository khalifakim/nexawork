import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SharesService } from '@core/services/shares.service';
import { ToastService } from '@core/services/toast.service';
import { CreateShareLinkRequest, ShareLinkResponse, ShareMode, TargetType } from '@core/models/ged.models';

type ExpiryKind = 'never' | 'date' | 'count';

/**
 * Génération et gestion d'un lien de partage EXTERNE (Brique 4).
 *
 * <p>Un lien ouvre l'accès à CET élément sans compte. La sécurité tient au token
 * opaque + expiration (date ou nombre d'accès) + mot de passe optionnel +
 * révocation. Trois modes (dossier) : consultation (READ), boîte de dépôt aveugle
 * (DROP) ou lecture + dépôt (READ_WRITE) ; un fichier n'accepte que la consultation.
 * Le modal liste aussi les liens déjà existants sur l'élément.</p>
 */
@Component({
  selector: 'app-partager-lien',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent],
  template: `
    <app-modal-shell title="Partager par lien externe" [subtitle]="targetName" [width]="560" (closed)="closed.emit()">

      <!-- Liens existants sur cet élément -->
      @if (existing().length) {
        <div class="sec">
          <div class="lbl">Liens actifs sur cet élément</div>
          @for (l of existing(); track l.id) {
            <div class="link" [class.link--off]="!l.active">
              <span class="link__mode" [class.link__mode--drop]="l.mode === 'DROP'">
                <app-icon [name]="modeIcon(l.mode)" [size]="13" />{{ modeLabel(l.mode) }}
              </span>
              <span class="link__url" [title]="absolute(l)">{{ absolute(l) }}</span>
              <span class="link__meta">{{ metaLabel(l) }}</span>
              <button class="ic" title="Copier" (click)="copy(l)"><app-icon name="link" [size]="15" /></button>
              <button class="ic ic--danger" title="Supprimer le lien" [disabled]="busyId() === l.id" (click)="revoke(l)"><app-icon name="trash" [size]="15" /></button>
            </div>
          }
        </div>
      }

      <!-- Nouveau lien -->
      <div class="sec">
        <div class="lbl">Créer un lien</div>

        <div class="modes">
          <button class="mode" [class.mode--on]="mode() === 'READ'" (click)="mode.set('READ')">
            <app-icon name="eye" [size]="17" /><span class="mode__t">Consultation</span><span class="mode__d">Voir et télécharger</span>
          </button>
          @if (targetType === 'FOLDER') {
            <button class="mode" [class.mode--on]="mode() === 'DROP'" (click)="mode.set('DROP')">
              <app-icon name="upload" [size]="17" /><span class="mode__t">Boîte de dépôt</span><span class="mode__d">Dépôt seul (aveugle)</span>
            </button>
            <button class="mode" [class.mode--on]="mode() === 'READ_WRITE'" (click)="mode.set('READ_WRITE')">
              <app-icon name="folder" [size]="17" /><span class="mode__t">Lecture + dépôt</span><span class="mode__d">Voir et recevoir</span>
            </button>
          }
        </div>

        <div class="lbl">Expiration</div>
        <div class="seg">
          <button [class.seg--on]="expiry() === 'never'" (click)="expiry.set('never')">Jamais</button>
          <button [class.seg--on]="expiry() === 'date'" (click)="expiry.set('date')">À une date</button>
          <button [class.seg--on]="expiry() === 'count'" (click)="expiry.set('count')">Après N accès</button>
        </div>
        @if (expiry() === 'date') {
          <input class="in" type="date" [value]="expDate()" (input)="expDate.set($any($event.target).value)" [min]="today" />
        }
        @if (expiry() === 'count') {
          <input class="in" type="number" min="1" placeholder="Nombre d'accès (1 = usage unique)" [value]="maxAccess()" (input)="maxAccess.set($any($event.target).value)" />
        }

        <div class="lbl">Mot de passe (optionnel)</div>
        <input class="in" type="text" placeholder="Laisser vide = aucun mot de passe" [value]="password()" (input)="password.set($any($event.target).value)" autocomplete="off" />

        @if (uploads()) {
          <div class="lbl">Garde-fous du dépôt (optionnel)</div>
          <input class="in" type="number" min="1" placeholder="Taille max par fichier (Mo) — défaut 25" [value]="maxMb()" (input)="maxMb.set($any($event.target).value)" />
          <input class="in" type="text" placeholder="Extensions autorisées, ex. mp4, zip, pdf (vide = tous les types sauf exécutables)" [value]="allowedExt()" (input)="allowedExt.set($any($event.target).value)" />
        }

        @if (createdUrl(); as url) {
          <div class="done">
            <app-icon name="check" [size]="16" />
            <span class="done__url" [title]="url">{{ url }}</span>
            <button class="ic" title="Copier" (click)="copyText(url)"><app-icon name="link" [size]="15" /></button>
          </div>
        }
        @if (error()) { <div class="err">{{ error() }}</div> }
      </div>

      <div footer>
        <button class="ghost" (click)="closed.emit()">Fermer</button>
        <button class="primary" [disabled]="busyId() === 'create'" (click)="create()">
          {{ busyId() === 'create' ? 'Création…' : 'Générer le lien' }}
        </button>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .sec { margin-bottom: 18px; }
    .sec:last-of-type { margin-bottom: 0; }
    .lbl { display: block; font-size: 12px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--nx-text-400); margin: 4px 0 8px; }
    .in { width: 100%; box-sizing: border-box; height: 42px; padding: 0 13px; border-radius: 10px; border: 1px solid #DDD9D1; font-family: inherit; font-size: 14px; color: var(--nx-text); outline: none; margin-bottom: 12px; background: #fff; }
    .in:focus { border-color: var(--nx-indigo); box-shadow: 0 0 0 3px rgba(91,95,233,.14); }
    .modes { display: flex; gap: 10px; margin-bottom: 16px; }
    .mode { flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 12px 14px; border-radius: 11px; border: 1.5px solid #E2DFD8; background: #fff; cursor: pointer; font-family: inherit; text-align: left; }
    .mode app-icon { color: var(--nx-text-400); margin-bottom: 4px; }
    .mode--on { border-color: var(--nx-indigo); background: rgba(91,95,233,.05); }
    .mode--on app-icon { color: var(--nx-indigo); }
    .mode__t { font-size: 13.5px; font-weight: 700; color: var(--nx-text); }
    .mode__d { font-size: 11.5px; color: var(--nx-text-500); }
    .seg { display: inline-flex; background: #F0EEE8; border-radius: 10px; padding: 3px; gap: 2px; margin-bottom: 12px; }
    .seg button { padding: 7px 14px; border: none; border-radius: 7px; background: transparent; color: var(--nx-text-500); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .seg--on { background: #fff; color: var(--nx-text); box-shadow: 0 1px 3px rgba(20,15,40,.10); }
    .link { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #ECEAE4; border-radius: 10px; margin-bottom: 7px; background: var(--nx-surface-3); }
    .link--off { opacity: .55; }
    .link__mode { display: inline-flex; align-items: center; gap: 4px; flex: none; font-size: 11px; font-weight: 700; color: var(--nx-indigo); background: rgba(91,95,233,.10); padding: 3px 7px; border-radius: 6px; }
    .link__mode--drop { color: #C2410C; background: #FEEEDC; }
    .link__url { flex: 1; min-width: 0; font-size: 12px; color: var(--nx-text-600); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--nx-mono, monospace); }
    .link__meta { flex: none; font-size: 11px; color: var(--nx-text-400); }
    .ic { width: 30px; height: 30px; flex: none; border: 1px solid #E2DFD8; border-radius: 8px; background: #fff; color: var(--nx-text-500); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .ic:hover { background: var(--nx-surface-2); color: var(--nx-indigo); }
    .ic--danger:hover { background: #FDECEB; color: var(--nx-danger); border-color: #F3C9C6; }
    .ic:disabled { opacity: .4; cursor: not-allowed; }
    .done { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: rgba(43,182,115,.10); border: 1px solid rgba(43,182,115,.30); margin-top: 4px; }
    .done app-icon { color: var(--nx-success); flex: none; }
    .done__url { flex: 1; min-width: 0; font-size: 12.5px; color: var(--nx-text-700); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--nx-mono, monospace); }
    .err { margin-top: 8px; font-size: 12.5px; color: var(--nx-danger); }
    .ghost { height: 38px; padding: 0 16px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn); background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .primary { height: 38px; padding: 0 18px; border: none; border-radius: var(--nx-r-btn); background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .primary:disabled { background: #cfccc4; cursor: not-allowed; }
  `],
})
export class PartagerLienComponent implements OnInit {
  @Input({ required: true }) targetType!: TargetType;
  @Input({ required: true }) targetId!: string;
  @Input() targetName = '';
  @Output() closed = new EventEmitter<void>();

  private shares = inject(SharesService);
  private toast = inject(ToastService);

  readonly today = new Date().toISOString().slice(0, 10);

  existing = signal<ShareLinkResponse[]>([]);
  mode = signal<ShareMode>('READ');
  /** Vrai si le mode courant autorise le dépôt (boîte de dépôt ou lecture + dépôt). */
  uploads = computed(() => this.mode() === 'DROP' || this.mode() === 'READ_WRITE');
  expiry = signal<ExpiryKind>('never');
  expDate = signal('');
  maxAccess = signal('');
  password = signal('');
  maxMb = signal('');
  allowedExt = signal('');
  createdUrl = signal<string | null>(null);
  error = signal('');
  /** 'create' pendant la création, ou l'id d'un lien pendant sa révocation. */
  busyId = signal<string | null>(null);

  ngOnInit(): void {
    this.shares.myLinks().subscribe({
      next: links => this.existing.set(links.filter(l => l.targetId === this.targetId)),
      error: () => {},
    });
  }

  absolute(l: ShareLinkResponse): string { return location.origin + (l.path || '/s/' + l.token); }

  /** Libellé court du mode d'un lien (puce de la liste). */
  modeLabel(m: ShareMode): string {
    return m === 'DROP' ? 'Dépôt' : m === 'READ_WRITE' ? 'Lecture + dépôt' : 'Lecture';
  }
  /** Icône du mode d'un lien. */
  modeIcon(m: ShareMode): string {
    return m === 'DROP' ? 'upload' : m === 'READ_WRITE' ? 'folder' : 'eye';
  }

  metaLabel(l: ShareLinkResponse): string {
    if (l.revoked) return 'révoqué';
    if (!l.active) return 'expiré';
    const bits: string[] = [];
    if (l.hasPassword) bits.push('mot de passe');
    if (l.expiresAt) bits.push('exp. ' + l.expiresAt.slice(0, 10));
    if (l.maxAccess != null) bits.push(l.accessCount + '/' + l.maxAccess + ' accès');
    return bits.join(' · ') || 'permanent';
  }

  create(): void {
    this.error.set('');
    const req: CreateShareLinkRequest = {
      targetType: this.targetType,
      targetId: this.targetId,
      mode: this.mode(),
    };
    if (this.password().trim()) req.password = this.password().trim();
    if (this.expiry() === 'date' && this.expDate()) req.expiresAt = this.expDate() + 'T23:59:59';
    if (this.expiry() === 'count') {
      const n = parseInt(this.maxAccess(), 10);
      if (!Number.isFinite(n) || n < 1) { this.error.set('Indiquez un nombre d’accès valide (≥ 1).'); return; }
      req.maxAccess = n;
    }
    if (this.uploads()) {
      const mb = parseInt(this.maxMb(), 10);
      if (Number.isFinite(mb) && mb > 0) req.maxUploadBytes = mb * 1024 * 1024;
      if (this.allowedExt().trim()) req.allowedExtensions = this.allowedExt().trim();
    }

    this.busyId.set('create');
    this.shares.create(req).subscribe({
      next: link => {
        this.busyId.set(null);
        const url = location.origin + (link.path || '/s/' + link.token);
        this.createdUrl.set(url);
        this.existing.update(l => [link, ...l]);
        this.copyText(url);
      },
      error: () => {
        this.busyId.set(null);
        this.error.set("La création du lien a échoué. Réessayez.");
      },
    });
  }

  revoke(l: ShareLinkResponse): void {
    this.busyId.set(l.id);
    this.shares.revoke(l.id).subscribe({
      next: () => {
        this.busyId.set(null);
        // Suppression réelle : le lien disparaît de la liste (pour re-partager,
        // on régénère un nouveau lien).
        this.existing.update(list => list.filter(x => x.id !== l.id));
        this.toast.show({ message: 'Lien supprimé' });
      },
      error: () => { this.busyId.set(null); this.toast.show({ message: 'Suppression impossible.', icon: 'warning' }); },
    });
  }

  copy(l: ShareLinkResponse): void { this.copyText(this.absolute(l)); }

  copyText(url: string): void {
    navigator.clipboard?.writeText(url).then(
      () => this.toast.show({ message: 'Lien copié dans le presse-papiers' }),
      () => {},
    );
  }
}
