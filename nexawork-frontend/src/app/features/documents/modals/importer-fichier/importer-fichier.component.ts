import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { FilePreviewComponent, isPreviewableFile } from '@shared/ui/file-preview/file-preview.component';
import { GedShareOptionsComponent, GedShareValue } from '@features/documents/modals/_ged-share-options/ged-share-options.component';
import { GedOverlayBus } from '@core/services/ged-overlay.bus';
import { ME } from '@core/util/ui.util';

@Component({
  selector: 'app-importer-fichier',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent, FilePreviewComponent, GedShareOptionsComponent],
  template: `
    <app-modal-shell title="Importer un fichier" subtitle="Ajoutez un fichier à l'espace courant." [width]="520" (closed)="closed.emit()">
      <input #fileInput type="file" hidden (change)="onPick($event)" />

      @if (file(); as f) {
        <!-- Fichier choisi : carte claire + aperçu à la demande avant validation -->
        <div class="fcard">
          <span class="fcard__ic" [style.color]="tint(f.name)"><app-icon [name]="iconFor(f.name)" [size]="20" /></span>
          <div class="fcard__meta">
            <div class="fcard__n" [title]="f.name">{{ f.name }}</div>
            <div class="fcard__s">{{ sizeOf(f.size) }} · prêt à importer</div>
          </div>
          @if (canPreview(f.name)) {
            <button type="button" class="fcard__a" [class.fcard__a--on]="showPreview()" (click)="showPreview.set(!showPreview())"><app-icon name="eye" [size]="15" />{{ showPreview() ? 'Masquer' : 'Aperçu' }}</button>
          }
          <button type="button" class="fcard__a" (click)="fileInput.click()"><app-icon name="refresh" [size]="15" />Changer</button>
        </div>

        @if (showPreview() && canPreview(f.name)) {
          <div class="pvbox"><app-file-preview [blob]="f" [name]="f.name" /></div>
        }
      } @else {
        <!-- Aucun fichier : bouton simple, centré -->
        <div class="pick">
          <button type="button" class="pickbtn" (click)="fileInput.click()"><app-icon name="upload" [size]="17" />Choisir un fichier</button>
          <span class="pick__s">PDF, images, documents — 50 Mo max.</span>
        </div>
      }

      <label class="lbl">Nom du fichier</label>
      <input class="in" placeholder="ex. Brief client.pdf" [value]="name()" (input)="name.set($any($event.target).value)" />
      <div class="ro" [class.ro--on]="restrict()">
        <span class="ro__ic"><app-icon name="lock" [size]="16" /></span>
        <div class="ro__t"><div class="ro__title">Restreindre l'accès</div><div class="ro__d">{{ restrict() ? 'Exception activée — réglez la visibilité ci-dessous.' : 'Par défaut, visible par tous les membres de votre espace.' }}</div></div>
        <button class="sw" [class.sw--on]="restrict()" (click)="restrict.set(!restrict())"><span class="knob"></span></button>
      </div>

      @if (restrict()) {
        <div class="opt-block">
          <app-ged-share-options [scope]="scope" (valueChange)="onShareChange($event)" />
        </div>
      }

      @if (error) {
        <div class="err"><app-icon name="alert" [size]="15" />{{ error }}</div>
      }

      <div footer>
        <button class="ghost" [disabled]="busy" (click)="closed.emit()">Annuler</button>
        <button class="primary" [disabled]="!file() || busy" (click)="doImport()">
          @if (busy) { <span class="btnspin"></span>Import en cours… } @else { Importer }
        </button>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    /* Aucun fichier : simple bouton centré (fini le grand carré). */
    .pick { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 20px 0 22px; margin-bottom: 4px; }
    .pickbtn { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border-radius: 10px;
      border: 1px solid var(--nx-indigo); background: rgba(91,95,233,.06); color: var(--nx-indigo);
      font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
    .pickbtn:hover { background: rgba(91,95,233,.12); }
    .pickbtn app-icon { display: flex; }
    .pick__s { font-size: 12px; color: var(--nx-text-400); }
    /* Fichier choisi : carte « voilà votre document ». */
    .fcard { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border: 1px solid #E2DFD8;
      border-radius: 12px; background: var(--nx-surface-3); margin-bottom: 12px; }
    .fcard__ic { width: 40px; height: 40px; flex: none; border-radius: 9px; background: #fff; border: 1px solid #ECEAE4;
      display: flex; align-items: center; justify-content: center; }
    .fcard__meta { flex: 1; min-width: 0; }
    .fcard__n { font-size: 13.5px; font-weight: 600; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fcard__s { font-size: 12px; color: var(--nx-text-500); margin-top: 2px; }
    .fcard__a { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 11px; flex: none;
      border: 1px solid var(--nx-border); border-radius: 8px; background: #fff; color: var(--nx-text-600);
      font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .fcard__a:hover { background: var(--nx-surface-2); color: var(--nx-indigo); }
    .fcard__a--on { border-color: var(--nx-indigo); color: var(--nx-indigo); background: rgba(91,95,233,.06); }
    .fcard__a app-icon { display: flex; }
    /* Aperçu inline du fichier choisi, avant de valider. */
    .pvbox { display: flex; height: 300px; min-height: 0; margin-bottom: 14px; }
    .err { display: flex; align-items: center; gap: 7px; margin-top: 12px; padding: 9px 11px; border-radius: 8px;
      background: rgba(245,86,78,.1); color: var(--nx-danger); font-size: 12.5px; font-weight: 600; }
    .btnspin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
      display: inline-block; margin-right: 8px; vertical-align: -2px; animation: bsp .7s linear infinite; }
    @keyframes bsp { to { transform: rotate(360deg); } }
  `],
  styleUrls: ['../_ged-modal.shared.scss'],
})
export class ImporterFichierComponent {
  /** R16 — scope propagated to the share picker (workspace vs project members). */
  @Input() scope: 'org' | 'project' = 'org';
  /** Piloté par le parent : upload en cours (loader + boutons désactivés). */
  @Input() busy = false;
  /** Message d'erreur d'upload affiché par le parent (le modal reste ouvert). */
  @Input() error = '';
  @Output() closed = new EventEmitter<void>();
  @Output() imported = new EventEmitter<{ file: File; name: string; restricted: boolean }>();

  private gedOverlay = inject(GedOverlayBus);

  name = signal('');
  file = signal<File | null>(null);
  restrict = signal(false);
  /** Aperçu inline du fichier choisi (avant validation) déplié ou non. */
  showPreview = signal(false);
  private shareValue: GedShareValue = { mode: 'private', grants: [] };

  onShareChange(v: GedShareValue): void { this.shareValue = v; }

  onPick(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    this.file.set(f);
    // Nouveau fichier → on replie l'aperçu de l'ancien.
    this.showPreview.set(false);
    // Pré-remplit le nom avec celui du fichier s'il est encore vide.
    if (f && !this.name().trim()) this.name.set(f.name);
    input.value = '';
  }

  /** Le fichier choisi peut-il être prévisualisé dans le modal ? */
  canPreview(name: string): boolean { return isPreviewableFile(name); }

  /** Icône reflétant le type du fichier (carte du fichier choisi). */
  iconFor(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'ogv', 'mov', 'm4v'].includes(ext)) return 'video';
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'sheet';
    if (ext === 'zip') return 'archive';
    if (ext === 'fig') return 'fig';
    return 'file';
  }

  /** Teinte de l'icône selon le type (cohérente avec la vue GED). */
  tint(name: string): string {
    switch (this.iconFor(name)) {
      case 'image': return '#2BB673';
      case 'video': return '#6C70F0';
      case 'sheet': return '#E89A2C';
      case 'archive': return '#8B8794';
      case 'fig': return '#6C70F0';
      default: return '#F5564E';
    }
  }

  /** Taille lisible (Ko / Mo). */
  sizeOf(bytes: number): string {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' Mo';
  }

  doImport(): void {
    const f = this.file();
    if (!f) return;
    const n = this.name().trim() || f.name;
    if (this.restrict()) {
      this.gedOverlay.setRestriction(n, {
        mode: this.shareValue.mode,
        grants: this.shareValue.grants,
        owner: ME,
      });
    }
    this.imported.emit({ file: f, name: n, restricted: this.restrict() });
  }
}
