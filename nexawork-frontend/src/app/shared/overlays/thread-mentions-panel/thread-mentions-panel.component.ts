import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

export type MentionKind = 'person' | 'task' | 'doc' | 'channel';

/** A single mention extracted from a thread. */
export interface ThreadMention { kind: MentionKind; value: string; }

interface Tab { key: MentionKind; label: string; icon: string; }

const TABS: Tab[] = [
  { key: 'person',  label: 'Personnes', icon: 'user' },
  { key: 'task',    label: 'Tâches',    icon: 'taskCheck' },
  { key: 'doc',     label: 'Documents', icon: 'file' },
  { key: 'channel', label: 'Canaux',    icon: 'channels' },
];

/**
 * « Mentions » — panneau latéral (320 px, à droite) qui liste toutes les
 * mentions détectées dans les messages de la conversation ou du canal, groupées
 * par type via 4 onglets. Un clic sur un item émet le même événement que si
 * l'utilisateur avait cliqué sur la mention inline (le parent réutilise ses
 * handlers existants pour ouvrir les modales de prévisualisation).
 */
@Component({
  selector: 'app-thread-mentions-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <aside class="pnl">
      <div class="pnl__hd">
        <div class="pnl__ht">
          <div class="pnl__t">Éléments mentionnés</div>
          <div class="pnl__s">Personnes, tâches, documents et canaux cités dans le fil.</div>
        </div>
        <button class="pnl__x" (click)="closed.emit()" title="Fermer">
          <app-icon name="x" [size]="16" [stroke]="2.2" />
        </button>
      </div>

      <div class="tabs">
        @for (t of tabs; track t.key) {
          <button class="tab" [class.tab--on]="active() === t.key"
                  [title]="t.label"
                  (click)="active.set(t.key)">
            <span class="tab__l">{{ t.label }}</span>
            <span class="tab__c">{{ countOf(t.key) }}</span>
          </button>
        }
      </div>

      <div class="pnl__bd">
        @for (item of visible(); track item) {
          <button class="row" [title]="display(item)"
                  (click)="picked.emit({ kind: active(), value: item })">
            <span class="row__ic" [attr.data-kind]="active()">
              @switch (active()) {
                @case ('person')  { {{ initials(item) }} }
                @case ('task')    { <app-icon name="taskCheck" [size]="14" /> }
                @case ('doc')     { <app-icon name="file" [size]="14" /> }
                @case ('channel') { <span class="row__hash">#</span> }
              }
            </span>
            <span class="row__label">{{ display(item) }}</span>
          </button>
        } @empty {
          <div class="pnl__empty">Aucune mention {{ tabLabelLower() }} dans ce fil.</div>
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

    /* Tabs distribuent leur largeur équitablement pour que « Canaux » reste dans le cadre. */
    .tabs { flex: none; display: flex; padding: 0 8px; border-bottom: 1px solid var(--nx-border-card); }
    .tab { flex: 1 1 0; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 6px; border: none; background: transparent; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 500; color: var(--nx-text-500); border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .tab:hover { color: var(--nx-text-700); }
    .tab--on { color: var(--nx-text); font-weight: 700; border-bottom-color: var(--nx-indigo); }
    .tab__l { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tab__c { font-size: 10.5px; font-weight: 700; color: var(--nx-text-400); background: var(--nx-surface-2); padding: 1px 6px; border-radius: 8px; min-width: 16px; text-align: center; flex: none; }
    .tab--on .tab__c { color: var(--nx-indigo); background: var(--nx-indigo-50); }

    .pnl__bd { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 10px 14px; display: flex; flex-direction: column; gap: 2px; }
    .pnl__empty { padding: 28px 8px; text-align: center; font-size: 12.5px; color: var(--nx-text-400); text-transform: none; }

    .row { display: flex; align-items: center; gap: 12px; padding: 9px 10px; border-radius: 9px; border: none; background: transparent; cursor: pointer; font-family: inherit; text-align: left; }
    .row:hover { background: var(--nx-surface-2); }
    .row__ic { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex: none; font-size: 11.5px; font-weight: 700; }
    .row__ic[data-kind='person']  { background: rgba(91,95,233,.10); color: var(--nx-indigo); border-radius: 50%; }
    .row__ic[data-kind='task']    { background: rgba(91,95,233,.10); color: var(--nx-indigo); }
    .row__ic[data-kind='doc']     { background: rgba(58,169,224,.14); color: #1f7fb0; }
    .row__ic[data-kind='channel'] { background: rgba(43,182,115,.14); color: #1f8a55; }
    .row__hash { font-size: 15px; font-weight: 700; }
    .row__label { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row[data-kind='task'] .row__label { font-family: var(--nx-mono, 'JetBrains Mono', monospace); }
  `],
})
export class ThreadMentionsPanelComponent {
  /** All mentions extracted from the thread — dedupe / grouping happens here. */
  @Input() set mentions(list: ThreadMention[]) { this._mentions = list ?? []; }
  private _mentions: ThreadMention[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() picked = new EventEmitter<{ kind: MentionKind; value: string }>();

  readonly tabs = TABS;
  active = signal<MentionKind>('person');

  private bucket = computed<Record<MentionKind, string[]>>(() => {
    const map: Record<MentionKind, Set<string>> = {
      person: new Set(), task: new Set(), doc: new Set(), channel: new Set(),
    };
    for (const m of this._mentions) map[m.kind].add(m.value);
    return {
      person:  [...map.person].sort((a, b) => a.localeCompare(b)),
      task:    [...map.task].sort((a, b) => a.localeCompare(b)),
      doc:     [...map.doc].sort((a, b) => a.localeCompare(b)),
      channel: [...map.channel].sort((a, b) => a.localeCompare(b)),
    };
  });

  visible = computed<string[]>(() => this.bucket()[this.active()]);
  countOf(kind: MentionKind): number { return this.bucket()[kind].length; }

  tabLabel(): string { return TABS.find(t => t.key === this.active())?.label ?? ''; }
  tabLabelLower(): string { return this.tabLabel().toLowerCase(); }

  display(v: string): string {
    // Only prefix channels with `#` (people show as-is, task ids and doc names too).
    return this.active() === 'channel' ? '#' + v : v;
  }

  initials(name: string): string {
    return name.split(/\s+/).map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
  }
}
