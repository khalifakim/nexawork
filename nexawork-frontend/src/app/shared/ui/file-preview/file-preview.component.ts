import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, inject, signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
// Bundle navigateur autonome (aucun module Node), sans déclarations de types.
// @ts-expect-error - pas de types pour le sous-chemin navigateur ; l'API .convertToHtml suffit.
import mammothBrowser from 'mammoth/mammoth.browser.js';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { saveBlob } from '@core/util/download.util';

const mammoth = mammothBrowser as {
  convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
};

type Kind = 'pdf' | 'image' | 'video' | 'audio' | 'zip' | 'word' | 'excel' | 'unsupported';

interface ZipEntry { path: string; name: string; size: number; }

/**
 * Rendu du CONTENU d'un fichier déjà téléchargé (blob en mémoire) : PDF, image,
 * vidéo, audio, ou ARCHIVE ZIP navigable (liste des entrées, ouverture/inspection
 * d'un fichier interne sans quitter l'app). Le composant ne fait aucun appel réseau :
 * l'appelant lui fournit le blob (authentifié via le File Service, ou public via le
 * lien de partage) — la même visionneuse sert donc partout.
 */
@Component({
  selector: 'app-file-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgTemplateOutlet],
  template: `
    @if (entry(); as e) {
      <!-- Vue d'une entrée ouverte depuis l'archive -->
      <div class="zbar">
        <button class="back" (click)="closeEntry()"><app-icon name="chevronLeft" [size]="15" />Retour à l'archive</button>
        <span class="zbar__n" [title]="e.name">{{ e.name }}</span>
        <button class="mini" (click)="downloadEntry(e)"><app-icon name="download" [size]="14" />Enregistrer</button>
      </div>
      <div class="body">
        <ng-container *ngTemplateOutlet="render; context: { kind: e.kind, url: e.url, safe: e.safe, name: e.name }"></ng-container>
      </div>
    } @else if (kind() === 'zip') {
      <!-- Liste des entrées de l'archive -->
      <div class="ziphead"><app-icon name="archive" [size]="15" /><span>{{ zipEntries().length }} élément(s) dans l'archive</span></div>
      <div class="ziplist">
        @for (z of zipEntries(); track z.path) {
          <button class="zrow" (click)="openEntry(z)">
            <app-icon class="zrow__i" [name]="iconFor(z.name)" [size]="17" />
            <span class="zrow__n" [title]="z.path">{{ z.path }}</span>
            <span class="zrow__s">{{ sizeLabel(z.size) }}</span>
            <app-icon class="zrow__c" name="chevronRight" [size]="15" />
          </button>
        } @empty {
          <div class="msg">Archive vide ou illisible.</div>
        }
      </div>
    } @else {
      <div class="body">
        <ng-container *ngTemplateOutlet="render; context: { kind: kind(), url: rawUrl(), safe: safeUrl(), name: name }"></ng-container>
      </div>
    }

    <ng-template #render let-kind="kind" let-url="url" let-safe="safe" let-name="name">
      @switch (kind) {
        @case ('pdf')   { <iframe class="pv" [src]="safe" title="Aperçu du document"></iframe> }
        @case ('image') { <div class="pv pv--center"><img [src]="url" [alt]="name" /></div> }
        @case ('video') { <div class="pv pv--center pv--dark"><video [src]="url" controls playsinline></video></div> }
        @case ('audio') { <div class="pv pv--center"><audio [src]="url" controls></audio></div> }
        @case ('word')  { <ng-container *ngTemplateOutlet="office"></ng-container> }
        @case ('excel') { <ng-container *ngTemplateOutlet="office"></ng-container> }
        @default {
          <div class="msg msg--lg">
            <div class="msg__t">Format non prévisualisable</div>
            <div class="msg__s">Ce type de fichier ne peut pas être affiché ici. Téléchargez-le pour l'ouvrir.</div>
          </div>
        }
      }
    </ng-template>

    <ng-template #office>
      @if (officeError()) {
        <div class="msg msg--lg">
          <div class="msg__t">Aperçu du document impossible</div>
          <div class="msg__s">Ce document n'a pas pu être rendu. Téléchargez-le pour l'ouvrir.</div>
        </div>
      } @else if (officeHtml(); as html) {
        <div class="office" [class.office--xls]="kind() === 'excel'" [innerHTML]="html"></div>
      } @else {
        <div class="msg">Rendu du document…</div>
      }
    </ng-template>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 0; flex: 1; }
    .body { flex: 1; min-height: 0; display: flex; }
    .pv { flex: 1; min-height: 0; width: 100%; border: none; border-radius: 12px; background: #FAF9F6; }
    iframe.pv { border: 1px solid var(--nx-border-card); }
    .pv--center { display: flex; align-items: center; justify-content: center; overflow: auto; }
    .pv--dark { background: #0d0b14; }
    .pv--center img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .pv--center video { max-width: 100%; max-height: 100%; background: #000; border-radius: 8px; }
    .msg { text-align: center; color: var(--nx-text-500); font-size: 13px; padding: 24px; margin: auto; }
    .msg--lg { padding: 40px; }
    .msg__t { font-size: 14px; font-weight: 600; color: var(--nx-text-700); margin-bottom: 6px; }
    .msg__s { font-size: 13px; }
    .ziphead { flex: none; display: flex; align-items: center; gap: 7px; padding: 4px 2px 12px; font-size: 12.5px; font-weight: 600; color: var(--nx-text-500); }
    .ziphead app-icon { color: var(--nx-text-400); }
    .ziplist { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    .zrow { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border: 1px solid #ECEAE4; border-radius: 10px; background: #fff; cursor: pointer; font-family: inherit; text-align: left; }
    .zrow:hover { background: var(--nx-surface-2); border-color: #E0DDD5; }
    .zrow__i { color: var(--nx-text-400); flex: none; }
    .zrow__n { flex: 1; min-width: 0; font-size: 13px; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .zrow__s { flex: none; font-size: 11.5px; color: var(--nx-text-400); }
    .zrow__c { color: var(--nx-text-300); flex: none; }
    .zbar { flex: none; display: flex; align-items: center; gap: 10px; padding: 0 0 12px; }
    .back, .mini { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 11px; border: 1px solid var(--nx-border); border-radius: 8px; background: #fff; color: var(--nx-text-700); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .back:hover, .mini:hover { background: var(--nx-surface-2); }
    .zbar__n { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* Rendu Office (contenu injecté via [innerHTML] → styles via ::ng-deep). */
    .office { flex: 1; min-height: 0; overflow: auto; background: #fff; border: 1px solid var(--nx-border-card); border-radius: 12px; padding: 28px 34px; }
    .office::ng-deep { color: var(--nx-text); font-size: 14px; line-height: 1.6; }
    .office::ng-deep p { margin: 0 0 10px; }
    .office::ng-deep h1, .office::ng-deep h2, .office::ng-deep h3 { margin: 18px 0 10px; line-height: 1.3; }
    .office::ng-deep img { max-width: 100%; height: auto; }
    .office::ng-deep table { border-collapse: collapse; margin: 8px 0; }
    .office::ng-deep td, .office::ng-deep th { border: 1px solid #DDD9D1; padding: 4px 9px; font-size: 12.5px; white-space: nowrap; }
    .office::ng-deep h4.sheet { position: sticky; left: 0; margin: 18px 0 6px; font-size: 13px; font-weight: 700; color: var(--nx-indigo); }
    .office--xls { padding: 16px; }
  `],
})
export class FilePreviewComponent implements OnChanges, OnDestroy {
  @Input() blob: Blob | null = null;
  @Input({ required: true }) name!: string;
  /** Émis quand une entrée d'archive non prévisualisable doit être enregistrée. */
  @Output() saved = new EventEmitter<string>();

  private sanitizer = inject(DomSanitizer);

  kind = signal<Kind>('unsupported');
  rawUrl = signal<string | null>(null);
  safeUrl = signal<SafeResourceUrl | null>(null);
  officeHtml = signal<SafeHtml | null>(null);
  officeError = signal(false);
  zipEntries = signal<ZipEntry[]>([]);
  entry = signal<{ name: string; kind: Kind; url: string; safe: SafeResourceUrl | null; blob: Blob } | null>(null);

  private urls: string[] = [];
  private loadedBlob: Blob | null = null;

  ngOnChanges(): void {
    if (this.blob === this.loadedBlob) return;
    this.reset();
    this.loadedBlob = this.blob;
    if (!this.blob) return;

    const k = kindOf(this.name);
    this.kind.set(k);
    if (k === 'zip') { this.loadZip(this.blob); return; }
    if (k === 'word') { this.loadWord(this.blob); return; }
    if (k === 'excel') { this.loadExcel(this.blob); return; }
    const url = this.track(URL.createObjectURL(this.blob));
    this.rawUrl.set(url);
    this.safeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  /** Word (.docx) → HTML sémantique via mammoth (100 % navigateur, aucun envoi externe). */
  private loadWord(blob: Blob): void {
    blob.arrayBuffer()
      .then(buf => mammoth.convertToHtml({ arrayBuffer: buf }))
      .then(res => this.officeHtml.set(this.sanitizer.bypassSecurityTrustHtml(res.value || '<p>(document vide)</p>')))
      .catch(() => this.officeError.set(true));
  }

  /** Tableur (.xlsx/.xls/.csv) → table(s) HTML via SheetJS (navigateur). */
  private loadExcel(blob: Blob): void {
    blob.arrayBuffer()
      .then(buf => {
        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
        const parts = wb.SheetNames.map(nm => {
          const table = XLSX.utils.sheet_to_html(wb.Sheets[nm]);
          return wb.SheetNames.length > 1 ? `<h4 class="sheet">${nm}</h4>${table}` : table;
        });
        this.officeHtml.set(this.sanitizer.bypassSecurityTrustHtml(parts.join('')));
      })
      .catch(() => this.officeError.set(true));
  }

  ngOnDestroy(): void { this.revokeAll(); }

  private loadZip(blob: Blob): void {
    JSZip.loadAsync(blob).then(zip => {
      const entries: ZipEntry[] = [];
      zip.forEach((path, file) => {
        // On ignore les dossiers et les méta d'archive macOS (bruit).
        if (file.dir || path.startsWith('__MACOSX/') || path.endsWith('/.DS_Store')) return;
        const size = (file as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
        entries.push({ path, name: path.split('/').pop() || path, size });
      });
      entries.sort((a, b) => a.path.localeCompare(b.path));
      this.zipEntries.set(entries);
    }).catch(() => this.zipEntries.set([]));
  }

  openEntry(z: ZipEntry): void {
    JSZip.loadAsync(this.blob!).then(zip => zip.file(z.path)?.async('blob')).then(b => {
      if (!b) return;
      const k = kindOf(z.name);
      // Aperçu en ligne des seuls médias directs ; Office/ZIP/inconnu d'une archive → enregistrement.
      if (!['image', 'video', 'audio', 'pdf'].includes(k)) { saveBlob(b, z.name); this.saved.emit(z.name); return; }
      const url = this.track(URL.createObjectURL(b));
      this.entry.set({ name: z.name, kind: k, url, safe: this.sanitizer.bypassSecurityTrustResourceUrl(url), blob: b });
    });
  }

  closeEntry(): void { this.entry.set(null); }
  downloadEntry(e: { name: string; blob: Blob }): void { saveBlob(e.blob, e.name); }

  iconFor(name: string): string {
    switch (kindOf(name)) {
      case 'image': return 'image';
      case 'video': return 'video';
      case 'excel': return 'sheet';
      case 'zip': return 'archive';
      default: return 'file';
    }
  }

  sizeLabel(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  private track(url: string): string { this.urls.push(url); return url; }
  private revokeAll(): void { this.urls.forEach(u => URL.revokeObjectURL(u)); this.urls = []; }
  private reset(): void {
    this.revokeAll();
    this.rawUrl.set(null); this.safeUrl.set(null); this.zipEntries.set([]); this.entry.set(null);
    this.officeHtml.set(null); this.officeError.set(false);
    this.kind.set('unsupported');
  }
}

/** Type de rendu déduit de l'extension du nom de fichier. */
function kindOf(name: string): Kind {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogv', 'ogg', 'mov', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'oga', 'flac'].includes(ext)) return 'audio';
  if (ext === 'docx') return 'word';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
  if (ext === 'zip') return 'zip';
  return 'unsupported';
}
