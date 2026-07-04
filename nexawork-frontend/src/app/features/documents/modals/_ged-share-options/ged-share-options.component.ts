import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output, computed, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

type Mode = 'private' | 'shared';
type Level = 'READER' | 'EDITOR';
export interface GedShareGrant { type: 'user' | 'team'; name: string; level: Level; }
export interface GedShareValue { mode: Mode; grants: GedShareGrant[]; }
interface Person { type: 'user' | 'team'; name: string; color: string; }

const USERS: Person[] = [
  { type: 'user', name: 'Sarah Diallo', color: '#F2693C' },
  { type: 'user', name: 'Moussa Bâ',    color: '#6C70F0' },
  { type: 'user', name: 'Aïda Ndiaye',  color: '#2BB673' },
  { type: 'user', name: 'Yacine Sow',   color: '#E0497B' },
  { type: 'user', name: 'Fatou Traoré', color: '#3AA9E0' },
];
const TEAMS: Person[] = [
  { type: 'team', name: 'Design produit', color: '#6C70F0' },
  { type: 'team', name: 'Développement',  color: '#2BB673' },
  { type: 'team', name: 'QA & Tests',     color: '#E89A2C' },
];
const PROJECT_USER_NAMES = new Set(['Sarah Diallo', 'Moussa Bâ', 'Aïda Ndiaye', 'Yacine Sow']);
const PROJECT_TEAM_NAMES = new Set(['Design produit', 'Développement']);

/**
 * « Restreindre l'accès » — bloc radio (Privé / Partagé) + picker et grants.
 * Rendu conditionnellement sous l'interrupteur « Restreindre l'accès » dans les
 * modals Nouveau dossier / Importer un fichier, fidèle au prototype `gedShareOptions`.
 * Aussi réutilisable partout où une restriction GED doit être configurée en création.
 */
@Component({
  selector: 'app-ged-share-options',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="opt-wrap">
      <button type="button" class="opt" [class.opt--on]="mode()==='private'" (click)="setMode('private')">
        <span class="radio" [class.radio--on]="mode()==='private'"></span>
        <span class="opt__tx">
          <span class="opt__t">Accessible uniquement par moi</span>
          <span class="opt__d">Le document n'est visible que par vous.</span>
        </span>
      </button>
      <button type="button" class="opt" [class.opt--on]="mode()==='shared'" (click)="setMode('shared')">
        <span class="radio" [class.radio--on]="mode()==='shared'"></span>
        <span class="opt__tx">
          <span class="opt__t">Partagé avec des personnes spécifiques</span>
          <span class="opt__d">Choisissez les membres ou équipes et leur niveau d'accès.</span>
        </span>
      </button>

      @if (mode() === 'shared') {
        <div class="shared">
          <div class="picker">
            <div class="picker__in" [class.picker__in--on]="pickerOpen()">
              <app-icon name="search" [size]="16" />
              <input [value]="query()"
                     (focus)="pickerOpen.set(true)"
                     (input)="query.set($any($event.target).value); pickerOpen.set(true)"
                     placeholder="Ajouter une personne ou une équipe…" />
            </div>
            @if (pickerOpen()) {
              <div class="picker__dd">
                @for (p of suggestions(); track p.type + ':' + p.name) {
                  <button type="button" class="picker__row" (click)="addGrant(p)">
                    <span class="chip" [class.chip--team]="p.type==='team'" [style.background]="p.color">{{ p.name[0] }}</span>
                    <span class="picker__n">{{ p.name }}</span>
                    <span class="picker__ty">{{ p.type === 'team' ? 'Équipe' : 'Membre' }}</span>
                  </button>
                } @empty {
                  <div class="picker__empty">Aucun résultat</div>
                }
              </div>
            }
          </div>

          @if (grants().length) {
            <div class="grants">
              @for (g of grants(); track g.type + ':' + g.name) {
                <div class="grant">
                  <span class="chip" [class.chip--team]="g.type==='team'" [style.background]="colorOf(g)">{{ g.name[0] }}</span>
                  <div class="grant__tx"><div class="grant__n">{{ g.name }}</div><div class="grant__r">{{ g.type === 'team' ? 'Équipe' : 'Membre' }}</div></div>
                  <div class="seg">
                    <button type="button" [class.seg--on]="g.level==='READER'" (click)="setLevel(g, 'READER')">Lecteur</button>
                    <button type="button" [class.seg--on]="g.level==='EDITOR'" (click)="setLevel(g, 'EDITOR')">Éditeur</button>
                  </div>
                  <button type="button" class="grant__rm" (click)="removeGrant(g)"><app-icon name="x" [size]="15" /></button>
                </div>
              }
            </div>
          } @else {
            <div class="grants__empty">Personne ajoutée pour l'instant.</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .opt-wrap { display: flex; flex-direction: column; gap: 0; }
    .opt { display: flex; align-items: flex-start; gap: 11px; text-align: left; width: 100%; box-sizing: border-box; padding: 12px 13px; border: 1px solid #E2DFD8; border-radius: 11px; background: #fff; cursor: pointer; font-family: inherit; margin-bottom: 8px; }
    .opt--on { border-color: var(--nx-indigo); background: rgba(91,95,233,.05); }
    .radio { width: 18px; height: 18px; flex: none; margin-top: 1px; border-radius: 50%; border: 2px solid #cfccc4; display: flex; align-items: center; justify-content: center; }
    .radio--on { border-color: var(--nx-indigo); }
    .radio--on::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: var(--nx-indigo); }
    .opt__tx { flex: 1; min-width: 0; }
    .opt__t { display: block; font-size: 13.5px; font-weight: 600; color: var(--nx-text); }
    .opt__d { display: block; font-size: 12px; color: var(--nx-text-500); margin-top: 2px; line-height: 1.4; }

    .shared { margin-top: 4px; padding-top: 12px; border-top: 1px solid #F0EEE9; }
    .picker { position: relative; margin-bottom: 10px; }
    .picker__in { display: flex; align-items: center; gap: 9px; height: 40px; padding: 0 12px; background: #fff; border: 1px solid #DDD9D1; border-radius: 10px; color: var(--nx-text-400); }
    .picker__in--on { border-color: var(--nx-indigo); }
    .picker__in input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: var(--nx-text); }
    .picker__dd { position: absolute; top: 46px; left: 0; right: 0; z-index: 30; background: #fff; border-radius: 11px; border: 1px solid #ECEAE4; box-shadow: 0 14px 38px rgba(20,15,40,.18); padding: 7px; max-height: 260px; overflow-y: auto; overscroll-behavior: contain; }
    .picker__row { width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 8px 9px; border: none; border-radius: 8px; background: transparent; cursor: pointer; font-family: inherit; text-align: left; }
    .picker__row:hover { background: var(--nx-surface-2); }
    .picker__n { flex: 1; font-size: 13.5px; font-weight: 600; color: var(--nx-text); }
    .picker__ty { font-size: 11px; font-weight: 600; color: var(--nx-text-400); text-transform: uppercase; letter-spacing: .04em; }
    .picker__empty { padding: 14px; text-align: center; font-size: 12.5px; color: var(--nx-text-400); }

    .chip { width: 30px; height: 30px; flex: none; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
    .chip--team { border-radius: 7px; }
    .grants { display: flex; flex-direction: column; gap: 4px; }
    .grants__empty { font-size: 12.5px; color: var(--nx-text-400); padding: 10px 2px; }
    .grant { display: flex; align-items: center; gap: 10px; padding: 7px 6px; }
    .grant__tx { flex: 1; min-width: 0; }
    .grant__n { font-size: 13.5px; font-weight: 600; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .grant__r { font-size: 11.5px; color: var(--nx-text-400); }
    .seg { display: inline-flex; background: var(--nx-surface-2); border-radius: 8px; padding: 2px; gap: 2px; flex: none; }
    .seg button { padding: 5px 11px; border: none; border-radius: 6px; background: transparent; color: var(--nx-text-500); font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
    .seg button.seg--on { background: #fff; color: var(--nx-text); box-shadow: 0 1px 3px rgba(20,15,40,.12); }
    .grant__rm { width: 30px; height: 30px; flex: none; border: none; border-radius: 7px; background: transparent; color: var(--nx-text-300); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .grant__rm:hover { background: #FDECEB; color: var(--nx-danger); }
  `],
})
export class GedShareOptionsComponent {
  /** R16 — restrict candidates to the project's roster when the item is being
   *  created inside a project's GED. Defaults to `org` (full workspace roster). */
  @Input() scope: 'org' | 'project' = 'org';
  /** Two-way-friendly output emitted whenever the internal value changes. */
  @Output() valueChange = new EventEmitter<GedShareValue>();

  private host = inject(ElementRef<HTMLElement>);

  mode = signal<Mode>('private');
  grants = signal<GedShareGrant[]>([]);
  query = signal('');
  pickerOpen = signal(false);

  /**
   * Close the dropdown when the user clicks anywhere outside the picker area.
   * We avoid using a fixed-position backdrop because that would eat the modal's
   * wheel events and break scrolling inside the parent panel.
   */
  @HostListener('document:mousedown', ['$event'])
  onDocMouseDown(ev: MouseEvent): void {
    if (!this.pickerOpen()) return;
    if (!this.host.nativeElement.contains(ev.target as Node)) this.pickerOpen.set(false);
  }

  private allPool: Person[] = [...TEAMS, ...USERS];
  private pool = computed<Person[]>(() =>
    this.allPool.filter(p =>
      this.scope === 'org'
        || (p.type === 'user' ? PROJECT_USER_NAMES.has(p.name) : PROJECT_TEAM_NAMES.has(p.name)),
    ),
  );

  suggestions = computed<Person[]>(() => {
    const q = this.query().toLowerCase().trim();
    const taken = new Set(this.grants().map(g => g.type + ':' + g.name));
    return this.pool().filter(p => !taken.has(p.type + ':' + p.name) && p.name.toLowerCase().includes(q));
  });

  colorOf(g: GedShareGrant): string {
    return this.allPool.find(p => p.type === g.type && p.name === g.name)?.color ?? '#86828e';
  }

  setMode(m: Mode): void { this.mode.set(m); this.emit(); }

  addGrant(p: Person): void {
    this.grants.update(l => [...l, { type: p.type, name: p.name, level: 'READER' }]);
    // Reset the search field and close the dropdown so the user can start a
    // fresh search on the next click — but the added row stays visible below.
    this.query.set('');
    this.pickerOpen.set(false);
    this.emit();
  }
  setLevel(g: GedShareGrant, level: Level): void {
    this.grants.update(l => l.map(x => x.name === g.name && x.type === g.type ? { ...x, level } : x));
    this.emit();
  }
  removeGrant(g: GedShareGrant): void {
    this.grants.update(l => l.filter(x => !(x.name === g.name && x.type === g.type)));
    this.emit();
  }

  /** Current value snapshot — useful for parents that read on submit. */
  value(): GedShareValue { return { mode: this.mode(), grants: this.grants() }; }

  private emit(): void { this.valueChange.emit(this.value()); }
}
