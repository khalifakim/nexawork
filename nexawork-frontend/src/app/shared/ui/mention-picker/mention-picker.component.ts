import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { ProjectCatalogService } from '@core/services/project-catalog.service';
import { MentionTab } from '@core/models/mention.models';

/** A single result row in the mention picker. */
export interface MentionPickerItem {
  id: string;        // raw id used to build the token (member name, task id, doc id, channel slug)
  display: string;   // primary label
  sub?: string;      // secondary line (role, status, owner, members)
  icon?: string;     // optional accent (status color, avatar tint)
  initials?: string;// 2-letter initials (for member rows)
  tab: MentionTab;
}

const TABS: Array<{ key: MentionTab; label: string }> = [
  { key: 'personnes', label: 'Personnes'  },
  { key: 'taches',    label: 'Tâches'     },
  { key: 'documents', label: 'Documents'  },
  { key: 'canaux',    label: 'Canaux'     },
];

/**
 * Floating mention picker — compact variant (matches the prototype's
 * `mentionPopup(compact: true)` used inside the comment composer).
 *
 * - 4 text tabs (no chip prefix on each tab, just like the prototype).
 * - Live filter input — pre-fillable via `query` (the composer pushes the
 *   text typed after `@|@@|@@@|#` so suggestions are filtered in real time).
 * - "Parcourir" button opens the deep-search modal.
 * - Selecting a row emits the canonical token (e.g. `@Moussa Bâ`,
 *   `@@MOB-094`, `@@@Specs-fonctionnelles.pdf`, `#dev-frontend`).
 */
@Component({
  selector: 'app-mention-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mp" (click)="$event.stopPropagation()" role="dialog" aria-label="Choisir une mention">
      <div class="mp__tabs">
        @for (t of tabs; track t.key) {
          <button class="mp__t" [class.mp__t--on]="active() === t.key" (click)="onTab(t.key)">{{ t.label }}</button>
        }
      </div>
      <div class="mp__bar">
        <div class="mp__si">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input class="mp__q" #q [value]="query()" (input)="query.set($any(q).value)" placeholder="Filtrer…" />
        </div>
        <button class="mp__br" (click)="browse.emit(active())">Parcourir</button>
      </div>
      <div class="mp__lbl">{{ sectionLabel() }}</div>
      <div class="mp__list">
        @if (visible().length === 0) {
          <div class="mp__empty">{{ emptyLabel() }}</div>
        }
        @for (it of visible(); track it.id; let i = $index) {
          <button class="mp__row" [class.mp__row--on]="i === 0" (click)="pick(it)">
            @if (it.tab === 'personnes') {
              <span class="mp__av" [style.background]="it.icon">{{ it.initials || it.display[0] }}</span>
            } @else if (it.tab === 'taches') {
              <span class="mp__tile mp__tile--task" [style.background]="tileBg(it.icon)" [style.color]="it.icon || 'var(--nx-indigo)'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </span>
            } @else if (it.tab === 'documents') {
              <span class="mp__tile mp__tile--doc" [style.background]="tileBg(it.icon)" [style.color]="it.icon || 'var(--nx-text-500)'">{{ docExt(it.id) }}</span>
            } @else if (it.tab === 'canaux') {
              <span class="mp__tile mp__tile--hash">#</span>
            }
            <span class="mp__b">
              <span class="mp__n" [class.mp__n--mono]="it.tab === 'taches'">{{ it.display }}</span>
              @if (it.sub) { <span class="mp__s">{{ it.sub }}</span> }
            </span>
          </button>
        }
      </div>
      <div class="mp__sh">
        @for (s of SHORTCUTS; track s.tab) {
          <span class="mp__scut" (click)="onTab(s.tab)"><code>{{ s.code }}</code><span>{{ s.label }}</span></span>
        }
      </div>
    </div>
  `,
  styles: [`
    .mp { width: 100%; max-height: 280px; display: flex; flex-direction: column;
      background: #fff; border-radius: 11px; border: 1px solid var(--nx-border);
      box-shadow: 0 16px 40px rgba(20,15,40,.18); overflow: hidden; }
    .mp__tabs { display: flex; gap: 2px; padding: 4px 12px 0; border-bottom: 1px solid var(--nx-border-card); }
    .mp__t { padding: 7px 8px; border: none; background: transparent; cursor: pointer;
      font-family: inherit; font-size: 12px; font-weight: 500; color: var(--nx-text-500);
      border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .mp__t--on { font-weight: 700; color: var(--nx-text); border-bottom-color: var(--nx-indigo); }
    .mp__bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px 4px; }
    .mp__si { flex: 1; height: 32px; border-radius: 8px; background: var(--nx-surface-3);
      display: flex; align-items: center; gap: 7px; padding: 0 10px; color: var(--nx-text-400); }
    .mp__si:focus-within { background: var(--nx-surface-2); }
    .mp__q { flex: 1; border: none; background: transparent; outline: none;
      font-size: 13px; color: var(--nx-text); font-family: inherit; }
    .mp__br { height: 32px; padding: 0 12px; border: none; border-radius: 8px;
      background: var(--nx-indigo-50); color: var(--nx-indigo); font-family: inherit;
      font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; }
    .mp__br:hover { background: #E0DEFA; }
    .mp__lbl { padding: 0 10px 2px; font-size: 11px; font-weight: 700;
      letter-spacing: .06em; text-transform: uppercase; color: var(--nx-text-400); }
    .mp__list { padding: 0 6px 6px; max-height: 140px; overflow-y: auto; }
    .mp__empty { padding: 14px 10px; text-align: center; color: var(--nx-text-400); font-size: 13px; }
    .mp__row { width: 100%; display: flex; align-items: center; gap: 9px; padding: 7px 8px; border: none;
      border-radius: 8px; background: transparent; text-align: left; font-family: inherit; cursor: pointer; color: var(--nx-text); }
    .mp__row--on, .mp__row:hover { background: var(--nx-surface-2); }
    .mp__av { width: 26px; height: 26px; flex: none; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; }
    .mp__tile { width: 26px; height: 26px; flex: none; border-radius: 7px;
      display: flex; align-items: center; justify-content: center; }
    .mp__tile--task { /* color set inline */ }
    .mp__tile--doc { font-size: 9px; font-weight: 700; font-family: var(--nx-mono); }
    .mp__tile--hash { background: var(--nx-indigo-50); color: var(--nx-indigo); font-size: 14px; font-weight: 700; }
    .mp__b { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .mp__n { font-size: 12.5px; font-weight: 600; color: var(--nx-text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mp__n--mono { font-family: var(--nx-mono); }
    .mp__s { font-size: 11.5px; color: var(--nx-text-500);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mp__sh { border-top: 1px solid var(--nx-border-card); padding: 6px 12px 7px;
      display: flex; gap: 10px; flex-wrap: wrap; }
    .mp__scut { display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
      font-size: 11px; font-weight: 600; color: var(--nx-text-400); }
    .mp__scut code { font-family: var(--nx-mono); background: var(--nx-surface-3);
      padding: 1px 4px; border-radius: 4px; font-size: 10.5px; color: var(--nx-text-600); }
  `],
})
export class MentionPickerComponent {
  private readonly catalog = inject(ProjectCatalogService);

  @Input() set tab(value: MentionTab) { this.active.set(value); }
  /** Initial filter (text typed after the @ prefix). Synced on every change. */
  @Input() set initialQuery(value: string) { this.query.set(value); }
  @Output() tabChange = new EventEmitter<MentionTab>();
  @Output() picked    = new EventEmitter<{ tab: MentionTab; token: string }>();
  @Output() browse    = new EventEmitter<MentionTab>();

  protected readonly tabs = TABS;
  /** Always-visible shortcut hints (click to jump to a tab), like the prototype. */
  protected readonly SHORTCUTS: Array<{ code: string; label: string; tab: MentionTab }> = [
    { code: '@',   label: 'personnes', tab: 'personnes' },
    { code: '@@',  label: 'tâches',    tab: 'taches'    },
    { code: '@@@', label: 'documents', tab: 'documents' },
    { code: '#',   label: 'canaux',    tab: 'canaux'    },
  ];
  protected readonly active = signal<MentionTab>('personnes');
  protected readonly query = signal('');
  protected readonly hover = signal(0);

  /** Éléments de l'onglet actif, avant filtrage par la saisie. */
  protected readonly allItems = computed<MentionPickerItem[]>(() => this.itemsFor(this.active()));

  protected readonly visible = computed<MentionPickerItem[]>(() => {
    const q = this.query().trim().toLowerCase();
    const items = this.allItems();
    if (!q) return items;
    return items.filter(it =>
      it.display.toLowerCase().includes(q) ||
      it.id.toLowerCase().includes(q) ||
      (it.sub?.toLowerCase().includes(q) ?? false),
    );
  });

  /**
   * Message d'état vide : si l'onglet ne contient **aucun** élément → message
   * explicite par catégorie ; s'il en contient mais que le filtre ne matche rien
   * → « Aucun résultat ».
   */
  protected readonly emptyLabel = computed<string>(() => {
    if (this.allItems().length > 0) return 'Aucun résultat';
    switch (this.active()) {
      case 'personnes': return "Aucun membre dans ce projet.";
      case 'taches':    return "Aucune tâche n'a encore été créée.";
      case 'documents': return "Aucun document n'a encore été créé.";
      case 'canaux':    return "Aucun canal n'a encore été créé.";
    }
  });

  protected readonly sectionLabel = computed(() => {
    switch (this.active()) {
      case 'personnes': return 'Membres du projet';
      case 'taches':    return 'Tâches du projet';
      case 'documents': return 'Documents du projet';
      case 'canaux':    return 'Canaux';
    }
  });

  private itemsFor(tab: MentionTab): MentionPickerItem[] {
    switch (tab) {
      case 'personnes': return this.catalog.members().map(m => ({
        id: m.name, display: m.name, sub: m.role, icon: m.color,
        initials: m.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(),
        tab: 'personnes',
      }));
      case 'taches': return this.catalog.tasks().map(t => ({
        id: t.id, display: t.id, sub: t.title, icon: t.color, tab: 'taches',
      }));
      case 'documents': return this.catalog.documents().map(d => ({
        id: d.id, display: d.name, sub: d.owner, icon: this.docColor(d.type), tab: 'documents',
      }));
      case 'canaux': return this.catalog.channels().map(c => ({
        id: c.id, display: c.name, sub: c.isProject ? 'Canal de projet' : 'Canal d\'organisation',
        tab: 'canaux',
      }));
    }
  }

  protected tileBg(color?: string): string { return color ? color + '22' : 'transparent'; }
  protected docExt(name: string): string {
    const m = name.match(/\.([a-z0-9]+)$/i);
    return (m ? m[1] : 'FILE').slice(0, 3).toUpperCase();
  }

  private docColor(type: string): string {
    switch (type) {
      case 'pdf':   return '#F5564E';
      case 'doc':   return '#3AA9E0';
      case 'img':   return '#2BB673';
      case 'sheet': return '#1F8A5B';
      case 'fig':   return '#A259FF';
      default:      return '#E89A2C';
    }
  }

  protected onTab(t: MentionTab): void {
    this.active.set(t);
    this.hover.set(0);
    this.query.set('');
    this.tabChange.emit(t);
  }

  protected pick(it: MentionPickerItem): void {
    const prefix = this.tabChip(it.tab);
    this.picked.emit({ tab: it.tab, token: prefix + it.id });
  }

  private tabChip(t: MentionTab): string {
    return ({ personnes: '@', taches: '@@', documents: '@@@', canaux: '#' } as const)[t];
  }
}
