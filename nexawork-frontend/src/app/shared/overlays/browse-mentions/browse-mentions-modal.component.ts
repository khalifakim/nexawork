import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output, computed, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ProjectCatalogService } from '@core/services/project-catalog.service';
import { MentionTab } from '@core/models/mention.models';

interface BrowseRow {
  id: string;        // raw id used to build the token
  label: string;     // primary line (id for tasks/docs/channels, name for persons)
  sub: string;       // secondary line
  initials?: string; // member avatar
  photoUrl?: string; // photo de profil (remplace les initiales quand elle existe)
  color?: string;    // member avatar / doc tile color
  ext?: string;      // doc extension chip
  status?: string;
  prio?: string;
  role?: string;
  type?: string;     // channel access type
  tab: MentionTab;
}

const TABS: Array<{ key: MentionTab; label: string }> = [
  { key: 'personnes', label: 'Personnes' },
  { key: 'taches',    label: 'Tâches'    },
  { key: 'documents', label: 'Documents' },
  { key: 'canaux',    label: 'Canaux'    },
];

const PRIORITY_COLOR: Record<string, string> = {
  Urgente:  '#E5484D',
  Haute:    '#F2693C',
  Moyenne:  '#2E7BC4',
  Basse:    '#A9A5B0',
};

const STATUS_COLOR: Record<string, string> = {
  'À faire':    '#A9A5B0',
  'En cours':   '#5B8DEF',
  'En révision':'#F2693C',
  'Validé':     '#2BB673',
};

/**
 * Deep-search modal for mentions. Opened by the "Parcourir" button in the
 * MentionPicker. Mirrors `browseMentionModal()` in the prototype: 4 tabs,
 * a search field with contextual placeholder, and a list of all items in the
 * current project. Selecting a row emits a `{tab, token}` pair (the token
 * includes its `@`/`@@`/`@@@`/`#` prefix).
 */
@Component({
  selector: 'app-browse-mentions-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <div class="hd">
          <div class="row">
            <div class="search">
              <app-icon name="search" [size]="16" [stroke]="2" />
              <input
                #q
                autofocus
                [value]="query()"
                (input)="query.set($any(q).value)"
                [placeholder]="placeholder()"
              />
              @if (query()) {
                <button class="clear" (click)="query.set('')" aria-label="Effacer">
                  <app-icon name="x" [size]="11" [stroke]="2.5" />
                </button>
              }
            </div>
            <button class="close" (click)="closed.emit()" aria-label="Fermer">
              <app-icon name="x" [size]="16" [stroke]="2.2" />
            </button>
          </div>
          <div class="tabs">
            @for (t of tabs; track t.key) {
              <button class="tab" [class.tab--on]="tab() === t.key" (click)="setTab(t.key)">{{ t.label }}</button>
            }
          </div>
        </div>
        <div class="body">
          @if (items().length === 0) {
            <div class="empty">Aucun résultat pour « {{ query() }} »</div>
          }
          @for (it of items(); track it.id; let i = $index; let last = $last) {
            <div class="row-item" [class.row-item--last]="last">
              @if (it.tab === 'personnes') {
                @if (it.photoUrl) {
                  <img class="av av--img" [src]="it.photoUrl" alt="" />
                } @else {
                  <span class="av" [style.background]="it.color">{{ it.initials }}</span>
                }
              } @else if (it.tab === 'taches') {
                <span class="tile" [style.background]="statusBg(it.status)" [style.color]="statusColor(it.status)">
                  <app-icon name="taskCheck" [size]="17" [stroke]="2.2" />
                </span>
              } @else if (it.tab === 'documents') {
                <span class="tile doc" [style.background]="it.color + '22'" [style.color]="it.color">{{ it.ext }}</span>
              } @else if (it.tab === 'canaux') {
                <span class="tile hash">#</span>
              }
              <div class="b">
                <div class="n" [class.n--mono]="it.tab === 'taches'">{{ it.label }}</div>
                <div class="s">{{ it.sub }}</div>
              </div>
              @if (it.tab === 'taches') {
                <div class="badges">
                  <span class="badge" [style.color]="statusColor(it.status)" [style.background]="statusBg(it.status)">{{ it.status }}</span>
                  @if (it.prio) {
                    <span class="badge" [style.color]="prioColor(it.prio)" [style.background]="prioColor(it.prio) + '22'">{{ it.prio }}</span>
                  }
                </div>
              } @else if (it.tab === 'canaux') {
                <span class="badge badge--muted">{{ it.type }}</span>
              } @else if (it.tab === 'personnes' && it.role) {
                <span class="badge" [style.color]="accentColor" [style.background]="accentColor + '18'">{{ it.role }}</span>
              }
              <button class="sel" (click)="pick(it)">Mentionner</button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ov { position: fixed; inset: 0; background: rgba(20,15,40,.45); z-index: 9000;
      display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px);
      animation: nxFadeIn .15s ease-out; }
    .panel { width: 640px; max-width: 94vw; max-height: 80vh; background: #fff;
      border-radius: 18px; box-shadow: 0 32px 80px rgba(20,15,40,.36);
      display: flex; flex-direction: column; overflow: hidden; }
    .hd { padding: 20px 24px 0; border-bottom: 1px solid var(--nx-border-card); }
    .row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .search { flex: 1; height: 40px; border-radius: 10px; background: var(--nx-surface-3);
      display: flex; align-items: center; gap: 10px; padding: 0 14px; color: var(--nx-text-500); }
    .search input { flex: 1; border: none; background: transparent; outline: none;
      font-size: 14px; color: var(--nx-text); font-family: inherit; }
    .clear { width: 22px; height: 22px; border: none; border-radius: 6px;
      background: var(--nx-surface-2); color: var(--nx-text-500); cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex: none; }
    .clear:hover { background: var(--nx-border); }
    .close { width: 38px; height: 38px; flex: none; border: 1px solid var(--nx-border);
      border-radius: 10px; background: #fff; color: var(--nx-text-500); cursor: pointer;
      display: flex; align-items: center; justify-content: center; }
    .close:hover { background: var(--nx-surface-3); color: var(--nx-text); }
    .tabs { display: flex; gap: 2px; }
    .tab { padding: 10px 16px; border: none; background: transparent; cursor: pointer;
      font-family: inherit; font-size: 13.5px; font-weight: 500; color: var(--nx-text-500);
      border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .tab--on { font-weight: 700; color: var(--nx-text); border-bottom-color: var(--nx-indigo); }
    .body { flex: 1; overflow-y: auto; padding: 10px 16px 16px; }
    .empty { padding: 40px 0; text-align: center; color: var(--nx-text-400); font-size: 14px; }
    .row-item { display: flex; align-items: center; gap: 13px; padding: 11px 10px;
      border-radius: 10px; cursor: pointer; border-bottom: 1px solid var(--nx-surface-2); }
    .row-item:hover { background: var(--nx-surface-3); }
    .row-item--last { border-bottom: none; }
    .av--img { object-fit: cover; display: block; }
    .av { width: 40px; height: 40px; border-radius: 50%; color: #fff; font-weight: 700;
      font-size: 14px; flex: none; display: flex; align-items: center; justify-content: center; }
    .tile { width: 36px; height: 36px; border-radius: 9px; flex: none; display: flex;
      align-items: center; justify-content: center; }
    .tile.doc { font-size: 11px; font-weight: 700; font-family: var(--nx-mono); }
    .tile.hash { background: var(--nx-indigo-50); color: var(--nx-indigo); font-size: 18px; font-weight: 700; }
    .b { flex: 1; min-width: 0; }
    .n { font-size: 14px; font-weight: 600; color: var(--nx-text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .n--mono { font-family: var(--nx-mono); }
    .s { font-size: 12.5px; color: var(--nx-text-500); margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .badges { display: flex; gap: 6px; flex: none; }
    .badge { font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 6px; flex: none; }
    .badge--muted { color: var(--nx-text-500); background: var(--nx-surface-3); }
    .sel { height: 32px; padding: 0 14px; border: none; border-radius: 8px;
      background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13px;
      font-weight: 600; cursor: pointer; flex: none; }
    .sel:hover { filter: brightness(1.05); }
  `],
})
export class BrowseMentionsModalComponent {
  private readonly catalog = inject(ProjectCatalogService);

  @Input() set initialTab(value: MentionTab) { this.tab.set(value); }
  @Output() closed = new EventEmitter<void>();
  @Output() picked = new EventEmitter<{ tab: MentionTab; token: string }>();

  protected readonly tabs = TABS;
  protected readonly tab = signal<MentionTab>('personnes');
  protected readonly query = signal('');
  protected readonly accentColor = '#5B5FE9';

  protected readonly placeholder = computed(() => {
    switch (this.tab()) {
      case 'personnes': return 'Rechercher un membre…';
      case 'taches':    return 'Rechercher une tâche…';
      case 'documents': return 'Rechercher un document…';
      case 'canaux':    return 'Rechercher un canal…';
    }
  });

  protected readonly items = computed<BrowseRow[]>(() => {
    const ql = this.query().toLowerCase().trim();
    return this.allForTab(this.tab()).filter(it => {
      if (!ql) return true;
      const hay = (it.label + ' ' + it.sub + ' ' + it.id).toLowerCase();
      return hay.includes(ql);
    });
  });

  @HostListener('document:keydown.escape') onEsc(): void { this.closed.emit(); }

  protected setTab(t: MentionTab): void { this.tab.set(t); this.query.set(''); }

  protected pick(it: BrowseRow): void {
    this.picked.emit({ tab: it.tab, token: this.chipFor(it.tab) + it.id });
  }

  protected statusColor(s?: string): string { return STATUS_COLOR[s ?? ''] ?? '#A9A5B0'; }
  protected statusBg(s?: string):    string { return this.statusColor(s) + '22'; }
  protected prioColor(p?: string):   string { return PRIORITY_COLOR[p ?? ''] ?? '#A9A5B0'; }

  private chipFor(t: MentionTab): string {
    return ({ personnes: '@', taches: '@@', documents: '@@@', canaux: '#' } as const)[t];
  }

  private allForTab(tab: MentionTab): BrowseRow[] {
    switch (tab) {
      case 'personnes':
        return this.catalog.members().map(m => ({
          id: m.name, label: m.name, sub: m.role,
          initials: m.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(),
          photoUrl: m.photoUrl,
          color: m.color, role: m.role, tab: 'personnes',
        }));
      case 'taches':
        return this.catalog.tasks().map(t => ({
          id: t.id, label: t.id, sub: t.title, status: t.status, tab: 'taches',
        }));
      case 'documents':
        return this.catalog.documents().map(d => ({
          id: d.id, label: d.name, sub: d.owner ?? 'Document du projet',
          ext: this.extFor(d.type), color: this.colorFor(d.type), tab: 'documents',
        }));
      case 'canaux':
        return this.catalog.channels().map(c => ({
          id: c.id, label: '#' + c.name,
          sub: (c.isProject ? 'Canal de projet · ' : 'Canal d\'organisation · ') + (c.members ?? 0) + ' membres',
          type: c.isProject ? 'Projet' : 'Organisation', tab: 'canaux',
        }));
    }
  }

  private extFor(type: string): string {
    return ({ pdf: 'PDF', doc: 'DOC', img: 'IMG', sheet: 'XLS', fig: 'FIG', folder: 'DOS' } as const)[type as 'pdf'] ?? 'FILE';
  }

  private colorFor(type: string): string {
    return ({ pdf: '#E5484D', doc: '#2E7BC4', img: '#2BB673', sheet: '#2BB673', fig: '#5B5FE9', folder: '#E89A2C' } as const)[type as 'pdf'] ?? '#86828e';
  }
}
