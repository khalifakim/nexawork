import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { downloadAttachedFile } from '@core/util/download.util';

export interface SharedMediaItem {
  /** Stable id — used as track key. */
  id: string;
  /** File name (used for icon color inference and the direct download). */
  name: string;
  /** File size in bytes (null when unknown — hides the size line). */
  size: number | null;
  /** Meta line to display below the name (e.g. `Il y a 2 j` or `Sarah Diallo`). */
  meta?: string;
}

const EXT_COLOR: Record<string, string> = {
  pdf: '#F5564E',
  fig: '#A259FF',
  mp4: '#5B8DEF', mov: '#5B8DEF', avi: '#5B8DEF', webm: '#5B8DEF',
  png: '#2BB673', jpg: '#2BB673', jpeg: '#2BB673', gif: '#2BB673', svg: '#2BB673', webp: '#2BB673',
  doc: '#3AA9E0', docx: '#3AA9E0',
  xls: '#1F8A55', xlsx: '#1F8A55', csv: '#1F8A55',
  ppt: '#F2693C', pptx: '#F2693C',
  zip: '#86828e', rar: '#86828e',
};

/**
 * « Documents / Médias partagés » — panneau latéral (320 px, à droite) qui
 * liste les fichiers partagés dans la conversation ou le canal courant.
 * Un clic sur un item déclenche un téléchargement direct (pas de preview).
 * Fidèle à `sharedMediaPanel` du prototype.
 */
@Component({
  selector: 'app-thread-media-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <aside class="pnl">
      <div class="pnl__hd">
        <div class="pnl__ht">
          <div class="pnl__t">Fichiers joints</div>
          <div class="pnl__s">Tous les fichiers partagés dans ce fil — cliquez pour télécharger.</div>
        </div>
        <button class="pnl__x" (click)="closed.emit()" title="Fermer">
          <app-icon name="x" [size]="16" [stroke]="2.2" />
        </button>
      </div>
      <div class="pnl__bd">
        @for (it of items; track it.id) {
          <button class="row" (click)="download(it)" title="Télécharger">
            <span class="row__ic" [style.color]="colorFor(it.name)">
              <app-icon name="file" [size]="17" />
            </span>
            <span class="row__tx">
              <span class="row__n">{{ it.name }}</span>
              <span class="row__m">{{ metaLine(it) }}</span>
            </span>
            <span class="row__dl"><app-icon name="download" [size]="15" /></span>
          </button>
        } @empty {
          <div class="pnl__empty">Aucun document ou média partagé.</div>
        }
      </div>
    </aside>
  `,
  styles: [`
    :host { position: absolute; top: 0; right: 0; bottom: 0; z-index: 10; }
    .pnl { width: 360px; height: 100%; background: #fff; border-left: 1px solid var(--nx-border-card);
      box-shadow: -4px 0 16px rgba(20,15,40,.08); display: flex; flex-direction: column; }
    .pnl__hd { flex: none; display: flex; align-items: flex-start; padding: 16px 18px 12px; gap: 10px; }
    .pnl__ht { flex: 1; min-width: 0; }
    .pnl__t { font-size: 15px; font-weight: 700; color: var(--nx-text); }
    .pnl__s { font-size: 12px; color: var(--nx-text-400); margin-top: 3px; line-height: 1.4; }
    .pnl__x { width: 28px; height: 28px; border: none; border-radius: 7px; background: transparent; color: var(--nx-text-500); cursor: pointer; display: flex; align-items: center; justify-content: center; flex: none; }
    .pnl__x:hover { background: var(--nx-surface-2); color: var(--nx-text-700); }
    .pnl__bd { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
    .pnl__empty { padding: 28px 8px; text-align: center; font-size: 12.5px; color: var(--nx-text-400); }

    .row { display: flex; align-items: center; gap: 12px; padding: 10px 10px; border-radius: 10px; border: none; background: transparent; cursor: pointer; font-family: inherit; text-align: left; }
    .row:hover { background: var(--nx-surface-2); }
    .row__ic { width: 36px; height: 36px; border-radius: 9px; background: var(--nx-surface-2); display: flex; align-items: center; justify-content: center; flex: none; }
    .row:hover .row__ic { background: #fff; }
    .row__tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .row__n { font-size: 13px; font-weight: 600; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row__m { font-size: 11.5px; color: var(--nx-text-400); }
    .row__dl { display: flex; color: var(--nx-text-300); flex: none; opacity: 0; transition: opacity .12s; }
    .row:hover .row__dl { opacity: 1; color: var(--nx-indigo); }
  `],
})
export class ThreadMediaPanelComponent {
  @Input() items: SharedMediaItem[] = [];
  @Output() closed = new EventEmitter<void>();

  colorFor(name: string): string {
    const ext = (name.split('.').pop() ?? '').toLowerCase();
    return EXT_COLOR[ext] ?? '#86828e';
  }

  metaLine(it: SharedMediaItem): string {
    const size = it.size == null ? '' : this.sizeOf(it.size);
    if (size && it.meta) return `${size} · ${it.meta}`;
    return size || it.meta || '';
  }

  private sizeOf(bytes: number): string {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  download(it: SharedMediaItem): void {
    // Direct download — pas de preview, comme demandé.
    downloadAttachedFile(it.name, it.size ?? 0);
  }
}
