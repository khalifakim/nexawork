import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output, computed, inject, signal } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@core/services/toast.service';
import { GedOverlayBus } from '@core/services/ged-overlay.bus';
import { GedService, GedGrantInput } from '@core/services/ged.service';
import { MembersService } from '@core/services/members.service';
import { ProjectsService } from '@core/services/projects.service';
import { AccessMode } from '@core/models/ged.models';
import { ProjectMember, ProjectTeam } from '@core/models/project.models';
import { environment } from '@environment/environment';
import { ME } from '@core/util/ui.util';

type Mode = 'open' | 'private' | 'shared';
type Level = 'READER' | 'EDITOR';
interface Grant { type: 'user' | 'team'; name: string; level: Level; granteeId?: string; }
interface Person { type: 'user' | 'team'; name: string; color: string; granteeId?: string; }

/**
 * Workspace-wide candidates. R16 — used as-is when the scope is `org`;
 * filtered to project members when the scope is `project`.
 */
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
/**
 * Placeholder project roster used when `scope === 'project'`. Real backend will
 * expose per-project membership; for the frontend-first phase we restrict to a
 * consistent subset that matches the "Refonte App Mobile" mock elsewhere.
 */
const PROJECT_USER_NAMES = new Set(['Sarah Diallo', 'Moussa Bâ', 'Aïda Ndiaye', 'Yacine Sow']);
const PROJECT_TEAM_NAMES = new Set(['Design produit', 'Développement']);

/**
 * « Gérer les accès » — reusable GED access modal, faithful to the prototype's
 * `accessModalView`. Three modes (tous / privé / partagé) with a people picker
 * and per-grant level (Lecteur / Éditeur).
 */
@Component({
  selector: 'app-ged-access-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="card" (click)="$event.stopPropagation()">
        <div class="hd">
          <div class="hd__t"><div class="hd__title">Gérer les accès</div><div class="hd__sub">{{ name }}</div></div>
          <button class="x" (click)="closed.emit()"><app-icon name="x" [size]="16" /></button>
        </div>

        <div class="bd">
          <button class="opt" [class.opt--on]="mode()==='open'" (click)="mode.set('open')">
            <span class="radio" [class.radio--on]="mode()==='open'"></span>
            <span class="opt__i"><app-icon name="teams" [size]="17" /></span>
            <span class="opt__tx"><span class="opt__t">Tous les membres de l'espace</span><span class="opt__d">Comportement par défaut — aucune restriction.</span></span>
          </button>
          <button class="opt" [class.opt--on]="mode()==='private'" (click)="mode.set('private')">
            <span class="radio" [class.radio--on]="mode()==='private'"></span>
            <span class="opt__i"><app-icon name="lock" [size]="17" /></span>
            <span class="opt__tx"><span class="opt__t">Accessible uniquement par moi</span><span class="opt__d">Visible seulement par vous, le créateur.</span></span>
          </button>
          <button class="opt" [class.opt--on]="mode()==='shared'" (click)="mode.set('shared')">
            <span class="radio" [class.radio--on]="mode()==='shared'"></span>
            <span class="opt__i"><app-icon name="share" [size]="17" /></span>
            <span class="opt__tx"><span class="opt__t">Personnes spécifiques</span><span class="opt__d">Choisissez les membres / équipes et leur niveau.</span></span>
          </button>

          @if (mode()==='shared') {
            <div class="shared">
              <div class="picker">
                <div class="picker__in" [class.picker__in--on]="pickerOpen()">
                  <app-icon name="search" [size]="16" />
                  <input [value]="query()" (focus)="pickerOpen.set(true)" (input)="query.set($any($event.target).value); pickerOpen.set(true)" placeholder="Ajouter une personne ou une équipe…" />
                </div>
                @if (pickerOpen()) {
                  <div class="picker__dd">
                    @for (p of suggestions(); track p.name) {
                      <button class="picker__row" (click)="addGrant(p)">
                        <span class="chip" [class.chip--team]="p.type==='team'" [style.background]="p.color">{{ p.name[0] }}</span>
                        <span class="picker__n">{{ p.name }}</span>
                        <span class="picker__ty">{{ p.type==='team' ? 'Équipe' : 'Membre' }}</span>
                      </button>
                    } @empty {
                      <div class="picker__empty">Aucun résultat</div>
                    }
                  </div>
                }
              </div>

              <div class="grants">
                <!-- R13 — Propriétaire verrouillé, toujours affiché en tête, non retirable. -->
                @if (ownerName(); as ow) {
                  <div class="grant grant--owner" [title]="ow + ' — propriétaire, non retirable'">
                    <span class="chip" [style.background]="'#F5A623'">{{ ow[0] }}</span>
                    <div class="grant__tx">
                      <div class="grant__n">{{ ow }}<span class="grant__badge">Propriétaire</span></div>
                      <div class="grant__r">Accès total · non retirable</div>
                    </div>
                    <span class="seg seg--locked">
                      <span class="seg--on">Propriétaire</span>
                    </span>
                    <button class="grant__rm grant__rm--disabled" disabled title="Le propriétaire ne peut pas être retiré">
                      <app-icon name="lock" [size]="15" />
                    </button>
                  </div>
                }

                @for (g of grants(); track g.name) {
                  <div class="grant">
                    <span class="chip" [class.chip--team]="g.type==='team'" [style.background]="colorOf(g)">{{ g.name[0] }}</span>
                    <div class="grant__tx"><div class="grant__n">{{ g.name }}</div><div class="grant__r">{{ g.type==='team' ? 'Équipe' : 'Membre' }}</div></div>
                    <div class="seg">
                      <button [class.seg--on]="g.level==='READER'" (click)="setLevel(g, 'READER')">Lecteur</button>
                      <button [class.seg--on]="g.level==='EDITOR'" (click)="setLevel(g, 'EDITOR')">Éditeur</button>
                    </div>
                    <button class="grant__rm" (click)="removeGrant(g)"><app-icon name="x" [size]="15" /></button>
                  </div>
                } @empty {
                  @if (!ownerName()) {
                    <div class="grants__empty">Personne ajoutée pour l'instant.</div>
                  }
                }
              </div>
            </div>
          }
        </div>

        <div class="ft">
          <button class="ft__cancel" (click)="closed.emit()">Annuler</button>
          <button class="ft__save" (click)="save()">Enregistrer</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ov { position: fixed; inset: 0; z-index: 150; background: rgba(22,19,31,.5); backdrop-filter: blur(2px); display: flex; align-items: flex-start; justify-content: center; padding-top: 60px; }
    .card { width: 540px; max-width: 94vw; max-height: 85vh; background: #fff; border-radius: 16px; box-shadow: 0 24px 70px rgba(20,15,40,.4); display: flex; flex-direction: column; overflow: hidden; animation: nxFade .18s ease; }
    .hd { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 14px; border-bottom: 1px solid #F0EEE9; flex: none; }
    .hd__t { flex: 1; min-width: 0; }
    .hd__title { font-size: 16px; font-weight: 700; letter-spacing: -.01em; }
    .hd__sub { font-size: 12.5px; color: #86828e; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .x { width: 30px; height: 30px; flex: none; border: none; border-radius: 8px; background: transparent; color: #9b97a3; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .x:hover { background: #F4F2ED; }
    .bd { padding: 18px 20px; overflow-y: auto; }
    .opt { display: flex; align-items: flex-start; gap: 11px; text-align: left; width: 100%; box-sizing: border-box; padding: 12px 13px; border: 1px solid #E2DFD8; border-radius: 11px; background: #fff; cursor: pointer; font-family: inherit; margin-bottom: 8px; }
    .opt--on { border-color: var(--nx-indigo); background: rgba(91,95,233,.05); }
    .radio { width: 18px; height: 18px; flex: none; margin-top: 1px; border-radius: 50%; border: 2px solid #cfccc4; display: flex; align-items: center; justify-content: center; }
    .radio--on { border-color: var(--nx-indigo); }
    .radio--on::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: var(--nx-indigo); }
    .opt__i { display: flex; flex: none; margin-top: 1px; color: #7a7682; }
    .opt__tx { flex: 1; min-width: 0; }
    .opt__t { display: block; font-size: 13.5px; font-weight: 600; color: #1d1b25; }
    .opt__d { display: block; font-size: 12px; color: #86828e; margin-top: 2px; line-height: 1.4; }
    .shared { margin-top: 4px; padding-top: 14px; border-top: 1px solid #F0EEE9; }
    .picker { position: relative; margin-bottom: 10px; }
    .picker__in { display: flex; align-items: center; gap: 9px; height: 40px; padding: 0 12px; background: #fff; border: 1px solid #DDD9D1; border-radius: 10px; color: #9b97a3; }
    .picker__in--on { border-color: var(--nx-indigo); }
    .picker__in input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: #1d1b25; }
    .picker__dd { position: absolute; top: 46px; left: 0; right: 0; z-index: 30; background: #fff; border-radius: 11px; border: 1px solid #ECEAE4; box-shadow: 0 14px 38px rgba(20,15,40,.18); padding: 7px; max-height: 260px; overflow-y: auto; overscroll-behavior: contain; }
    .picker__row { width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 8px 9px; border: none; border-radius: 8px; background: transparent; cursor: pointer; font-family: inherit; text-align: left; }
    .picker__row:hover { background: #F4F2ED; }
    .picker__n { flex: 1; font-size: 13.5px; font-weight: 600; color: #1d1b25; }
    .picker__ty { font-size: 11px; font-weight: 600; color: #a8a4af; text-transform: uppercase; letter-spacing: .04em; }
    .picker__empty { padding: 14px; text-align: center; font-size: 12.5px; color: #a8a4af; }
    .chip { width: 30px; height: 30px; flex: none; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
    .chip--team { border-radius: 7px; }
    .grants { display: flex; flex-direction: column; gap: 4px; }
    .grants__empty { font-size: 12.5px; color: #a8a4af; padding: 10px 2px; }
    .grant { display: flex; align-items: center; gap: 10px; padding: 7px 6px; }
    .grant--owner { background: #FFF9E6; border: 1px solid #F4E2A3; border-radius: 8px; padding: 8px 8px; }
    .grant__badge { display: inline-block; margin-left: 8px; padding: 2px 7px; border-radius: 5px; background: #FCE9AC; color: #7A5B00; font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .seg--locked { display: inline-flex; padding: 2px; background: #FCE9AC; border-radius: 8px; color: #7A5B00; font-size: 12px; font-weight: 700; flex: none; }
    .seg--locked .seg--on { padding: 5px 11px; }
    .grant__rm--disabled { cursor: not-allowed; opacity: .55; color: #A5915B; }
    .grant__rm--disabled:hover { background: transparent; color: #A5915B; }
    .grant__tx { flex: 1; min-width: 0; }
    .grant__n { font-size: 13.5px; font-weight: 600; color: #1d1b25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .grant__r { font-size: 11.5px; color: #a8a4af; }
    .seg { display: inline-flex; background: #EFEDE7; border-radius: 8px; padding: 2px; gap: 2px; flex: none; }
    .seg button { padding: 5px 11px; border: none; border-radius: 6px; background: transparent; color: #86828e; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
    .seg button.seg--on { background: #fff; color: #1d1b25; box-shadow: 0 1px 3px rgba(20,15,40,.12); }
    .grant__rm { width: 30px; height: 30px; flex: none; border: none; border-radius: 7px; background: transparent; color: #b4b0bb; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .grant__rm:hover { background: #FDECEB; color: #F5564E; }
    .ft { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid #F0EEE9; flex: none; }
    .ft__cancel { height: 38px; padding: 0 16px; border: 1px solid #D9D6CE; border-radius: 9px; background: #fff; color: #46434e; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .ft__save { height: 38px; padding: 0 18px; border: none; border-radius: 9px; background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  `],
})
export class GedAccessModalComponent {
  private toast = inject(ToastService);
  private overlay = inject(GedOverlayBus);
  private ged = inject(GedService);
  private membersSvc = inject(MembersService);
  private projectsSvc = inject(ProjectsService);

  /** Mode réel : les grants viennent du backend (par UUID) ; sinon du bus local. */
  private readonly real = !environment.mock.ged;

  /** Pre-loads the current restriction of the document when set. */
  @Input({ required: true }) set name(value: string) {
    this._name = value;

    const item = this.overlay.targetItem();
    if (this.real && item?.id) {
      // Mode réel : le mode d'accès et les bénéficiaires viennent du serveur.
      this.mode.set(item.restricted ? 'shared' : 'open');
      this.ged.grantsOf(item).subscribe(list => {
        const owner = list.find(g => g.owner);
        this._loadedOwner.set(owner?.name ?? this.meName());
        this.grants.set(list.filter(g => !g.owner)
          .map(g => ({ type: g.type, name: g.name, level: g.level, granteeId: g.granteeId })));
        // Restreint sans bénéficiaire = privé ; avec bénéficiaires = partagé.
        if (item.restricted) this.mode.set(list.some(g => !g.owner) ? 'shared' : 'private');
      });
      return;
    }

    const r = this.overlay.restrictionOf(value);
    this.mode.set(r.mode);
    this.grants.set(r.grants.map(g => ({ ...g })));
    // Fall back to ME as the owner if none is on file — the demo user is
    // implicitly the creator of any document that has no explicit owner.
    this._loadedOwner.set(r.owner ?? ME);
  }

  private meName(): string { return ME; }
  get name(): string { return this._name; }
  private _name = '';
  /**
   * Scope of the item being managed. R16 — `org` uses the full workspace
   * roster ; `project` restricts candidates to the project's members/teams.
   */
  @Input() scope: 'org' | 'project' = 'org';
  @Output() closed = new EventEmitter<void>();

  private host = inject(ElementRef<HTMLElement>);

  mode = signal<Mode>('open');
  grants = signal<Grant[]>([]);
  query = signal('');
  pickerOpen = signal(false);
  private _loadedOwner = signal<string>(ME);

  /**
   * Close the dropdown when the user clicks anywhere outside the picker area.
   * Avoiding a fixed-position backdrop lets the modal scroll normally.
   */
  @HostListener('document:mousedown', ['$event'])
  onDocMouseDown(ev: MouseEvent): void {
    if (!this.pickerOpen()) return;
    const t = ev.target as Node;
    // Match anything inside the picker (input, dropdown row, etc.).
    const picker = this.host.nativeElement.querySelector('.picker');
    if (picker && !picker.contains(t)) this.pickerOpen.set(false);
  }

  /** R13 — owner display name, always shown as the locked first row. */
  ownerName = computed(() => this._loadedOwner());

  /** Annuaire réel (mode HTTP) — les bénéficiaires sont des membres du workspace. */
  private directory = toSignal(this.membersSvc.directory(), { initialValue: [] });

  /** Projet du document ciblé (vide = document d'organisation). */
  private projectId = computed(() => this.overlay.targetItem()?.projectId ?? null);

  /**
   * R16 — pour un document de projet, les bénéficiaires possibles sont les
   * **membres du projet** (et ses **équipes**), pas tout le workspace.
   */
  private projectMembers = toSignal(
    toObservable(this.projectId).pipe(
      switchMap(pid => pid ? this.projectsSvc.members(pid) : of([] as ProjectMember[])),
    ),
    { initialValue: [] as ProjectMember[] },
  );
  private projectTeams = toSignal(
    toObservable(this.projectId).pipe(
      switchMap(pid => pid ? this.projectsSvc.teams(pid) : of([] as ProjectTeam[])),
    ),
    { initialValue: [] as ProjectTeam[] },
  );

  private allPoolMock = [...TEAMS, ...USERS];

  /** Pool complet selon le mode (réel = annuaire + équipes ; mock = fixtures). */
  private allPool = computed<Person[]>(() => {
    if (!this.real) return this.allPoolMock;

    const pid = this.projectId();
    const dir = this.directory();
    if (!pid) {
      // Document d'organisation : tout le workspace, pas d'équipes (notion projet).
      return dir.map(m => ({ type: 'user' as const, name: m.name, color: m.color, granteeId: m.userId }));
    }

    // R16 — document de projet : membres du projet uniquement + équipes du projet.
    const memberIds = new Set(this.projectMembers().map(m => m.userId));
    const users: Person[] = dir
      .filter(m => m.userId && memberIds.has(m.userId))
      .map(m => ({ type: 'user' as const, name: m.name, color: m.color, granteeId: m.userId }));
    const teams: Person[] = this.projectTeams()
      .map(t => ({ type: 'team' as const, name: t.name, color: t.color ?? '#6C70F0', granteeId: t.id }));
    return [...teams, ...users];
  });

  /**
   * Candidate pool computed from the scope. The owner is excluded because
   * they are represented by the dedicated locked row above the list.
   */
  private pool = computed<Person[]>(() => {
    const ownerN = this.ownerName();
    return this.allPool()
      .filter(p => this.real || this.scope === 'org' || (p.type === 'user'
        ? PROJECT_USER_NAMES.has(p.name)
        : PROJECT_TEAM_NAMES.has(p.name)))
      .filter(p => !(p.type === 'user' && p.name === ownerN));
  });

  suggestions = computed<Person[]>(() => {
    const q = this.query().toLowerCase().trim();
    const taken = new Set(this.grants().map(g => g.type + ':' + g.name));
    return this.pool().filter(p => !taken.has(p.type + ':' + p.name) && p.name.toLowerCase().includes(q));
  });

  colorOf(g: Grant): string { return this.allPool().find(p => p.type === g.type && p.name === g.name)?.color ?? '#86828e'; }

  addGrant(p: Person): void {
    this.grants.update(l => [...l, { type: p.type, name: p.name, level: 'READER', granteeId: p.granteeId }]);
    // Reset the search field and close the dropdown after each pick — matches
    // the UX asked by the user: the picked row appears below, the input clears,
    // and the next keystroke re-opens the picker with a fresh query.
    this.query.set('');
    this.pickerOpen.set(false);
  }
  setLevel(g: Grant, level: Level): void {
    this.grants.update(l => l.map(x => x.name === g.name && x.type === g.type ? { ...x, level } : x));
  }
  removeGrant(g: Grant): void {
    // R13 — safety net: never remove the owner even if it somehow ended up
    // in the grants list.
    if (g.type === 'user' && g.name === this.ownerName()) return;
    this.grants.update(l => l.filter(x => !(x.name === g.name && x.type === g.type)));
  }

  save(): void {
    const item = this.overlay.targetItem();
    if (this.real && item?.id) {
      // Mode réel : bascule de l'accessMode + réconciliation des grants (UUID).
      const mode: AccessMode = this.mode() === 'open' ? 'OPEN' : this.mode() === 'private' ? 'PRIVATE' : 'SHARED';
      const grants: GedGrantInput[] = this.mode() === 'shared'
        ? this.grants()
            .filter(g => !!g.granteeId)
            .map(g => ({ granteeId: g.granteeId!, type: g.type, level: g.level }))
        : [];
      this.ged.saveAccess(item, mode, grants).subscribe(() => {
        this.toast.show({ message: 'Accès mis à jour pour « ' + this.name + ' »' });
        this.closed.emit();
      });
      return;
    }

    this.overlay.setRestriction(this.name, { mode: this.mode(), grants: this.grants(), owner: this._loadedOwner() });
    this.toast.show({ message: 'Accès mis à jour pour « ' + this.name + ' »' });
    this.closed.emit();
  }
}
