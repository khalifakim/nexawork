import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { GedShareOptionsComponent, GedShareValue } from '@features/documents/modals/_ged-share-options/ged-share-options.component';
import { GedOverlayBus } from '@core/services/ged-overlay.bus';
import { ME } from '@core/util/ui.util';

@Component({
  selector: 'app-importer-fichier',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent, GedShareOptionsComponent],
  template: `
    <app-modal-shell title="Importer un fichier" subtitle="Ajoutez un fichier à l'espace courant." [width]="520" (closed)="closed.emit()">
      <input #fileInput type="file" hidden (change)="onPick($event)" />
      <button type="button" class="drop" [class.drop--set]="file()" (click)="fileInput.click()">
        <app-icon name="upload" [size]="30" />
        @if (file(); as f) {
          <span class="drop__t">{{ f.name }}</span>
          <span class="drop__s">{{ sizeOf(f.size) }} — cliquez pour changer</span>
        } @else {
          <span class="drop__t">Cliquez pour choisir un fichier</span>
          <span class="drop__s">PDF, images, documents — 50 Mo max.</span>
        }
      </button>
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
  private shareValue: GedShareValue = { mode: 'private', grants: [] };

  onShareChange(v: GedShareValue): void { this.shareValue = v; }

  onPick(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    this.file.set(f);
    // Pré-remplit le nom avec celui du fichier s'il est encore vide.
    if (f && !this.name().trim()) this.name.set(f.name);
    input.value = '';
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
