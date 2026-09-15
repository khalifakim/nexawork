import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges,
  Output, inject, signal,
} from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoaderComponent } from '@shared/ui/loader/loader.component';
import { FilePreviewComponent, isPreviewableFile } from '@shared/ui/file-preview/file-preview.component';
import { ToastService } from '@core/services/toast.service';
import { FilesHttpService } from '@core/http/files.http.service';
import { saveBlob } from '@core/util/download.util';

/**
 * Aperçu d'un document — affiche le **vrai contenu** du fichier : les PDF dans un
 * iframe, les images en `<img>`. Le binaire est récupéré du File Service et
 * exposé via une URL d'objet locale (révoquée à la fermeture).
 *
 * Sans `url` (élément non résolu), on retombe sur un message explicite plutôt que
 * sur un aperçu factice.
 */
@Component({
  selector: 'app-apercu-document',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LoaderComponent, FilePreviewComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <div class="head">
          <span class="bc"><app-icon name="file" [size]="15" /><span>Aperçu</span></span>
          <span class="ic" [style.background]="tint">{{ extLabel }}</span>
          <span class="t" [title]="name">{{ name }}</span>
          <span class="spacer"></span>
          <button class="dl" [disabled]="!blob()" (click)="download()"><app-icon name="download" [size]="15" />Télécharger</button>
          <button class="x" (click)="closed.emit()"><app-icon name="x" [size]="16" /></button>
        </div>

        @if (loading()) {
          <app-loader label="Chargement de l'aperçu…" [minHeight]="280" />
        } @else if (error()) {
          <div class="np">
            <div class="np__t">Aperçu indisponible</div>
            <div class="np__s">{{ error() }}</div>
          </div>
        } @else if (blob(); as b) {
          <div class="pvwrap"><app-file-preview [blob]="b" [name]="name" /></div>
        } @else if (previewable && !url) {
          <!-- Fichier prévisualisable dont l'URL est encore en cours de résolution
               (mention @@@document : le nom est résolu en fichier réel). -->
          <app-loader label="Résolution du document…" [minHeight]="280" />
        } @else {
          <div class="np">
            <div class="np__t">Format non pris en charge pour l'aperçu</div>
            <div class="np__s">Ce type de fichier ne peut pas être prévisualisé. Utilisez « Télécharger » pour l'ouvrir.</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .ov { position: fixed; inset: 0; z-index: var(--nx-z-modal-top); background: rgba(22,19,31,.5); backdrop-filter: blur(2px); display: flex; justify-content: center; padding: 32px 24px; box-sizing: border-box; }
    .panel { width: 1180px; max-width: 96vw; height: 100%; max-height: 100%; background: #fff; border-radius: 16px; box-shadow: var(--nx-shadow-modal); display: flex; flex-direction: column; overflow: hidden; animation: nxFade .18s ease; }
    .head { flex: none; display: flex; align-items: center; gap: 11px; padding: 13px 16px 13px 20px; border-bottom: 1px solid var(--nx-border-card); }
    .bc { display: flex; align-items: center; gap: 6px; flex: none; font-size: 12.5px; font-weight: 600; color: var(--nx-text-400); }
    .bc app-icon { color: var(--nx-text-300); }
    .ic { width: 30px; height: 30px; flex: none; border-radius: 8px; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 9.5px; font-weight: 700; margin-left: 4px; }
    .t { flex: 0 1 auto; min-width: 0; font-size: 14.5px; font-weight: 700; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .spacer { flex: 1; }
    .dl { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 13px; border: 1px solid var(--nx-border); border-radius: 8px; background: #fff; color: var(--nx-text-700); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; flex: none; }
    .dl app-icon { color: var(--nx-text-500); display: flex; }
    .dl:hover:not(:disabled) { background: var(--nx-surface-2); }
    .dl:disabled { opacity: .5; cursor: default; }
    .x { width: 30px; height: 30px; flex: none; border: none; border-radius: 8px; background: transparent; color: var(--nx-text-400); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .x:hover { background: var(--nx-surface-2); }
    .pvwrap { flex: 1; min-height: 0; display: flex; margin: 16px 18px 18px; }
    .np { margin: 16px 18px 18px; padding: 40px 28px; border-radius: 12px; background: var(--nx-surface-3); border: 1px solid var(--nx-border-card); text-align: center; color: var(--nx-text-500); }
    .np__t { font-size: 14px; font-weight: 600; color: var(--nx-text-700); margin-bottom: 6px; }
    .np__s { font-size: 13px; }
  `],
})
export class ApercuDocumentComponent implements OnChanges {
  /** Nom affiché du fichier. */
  @Input({ required: true }) name!: string;
  /** Chemin de téléchargement File Service — sans lui, aucun aperçu réel possible. */
  @Input() url?: string;
  @Output() closed = new EventEmitter<void>();

  private toast = inject(ToastService);
  private filesSvc = inject(FilesHttpService);

  loading = signal(false);
  error = signal('');
  blob = signal<Blob | null>(null);

  get ext(): string { return (this.name?.split('.').pop() ?? '').toLowerCase(); }
  get extLabel(): string { return (this.ext || 'FIC').toUpperCase().slice(0, 4); }
  /** Types dont on récupère le binaire pour un rendu enrichi (PDF, image, vidéo, audio, ZIP, Word/Excel). */
  get previewable(): boolean { return isPreviewableFile(this.name); }
  get tint(): string { return this.previewable ? '#F5564E' : '#86828E'; }

  /** Chemin déjà chargé — évite de re-télécharger sur chaque cycle de détection. */
  private loadedUrl?: string;

  /**
   * L'URL peut arriver APRÈS l'ouverture (mention `@@@doc` : le nom est résolu en
   * fichier de façon asynchrone) — on charge donc dès qu'elle est disponible. Le
   * rendu (PDF / image / vidéo / audio / ZIP navigable) est délégué à
   * {@link FilePreviewComponent} à partir du blob récupéré.
   */
  ngOnChanges(): void {
    if (!this.url || !this.previewable || this.url === this.loadedUrl) return;
    this.loadedUrl = this.url;
    this.error.set('');
    this.loading.set(true);
    this.filesSvc.download(this.url).subscribe({
      next: b => { this.blob.set(b); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.error.set("Le document n'a pas pu être chargé.");
      },
    });
  }

  /** Téléchargement réel du fichier (blob déjà en mémoire). */
  download(): void {
    const b = this.blob();
    if (!b) return;
    saveBlob(b, this.name);
    this.toast.show({ message: '« ' + this.name +' » téléchargé' });
  }
}
