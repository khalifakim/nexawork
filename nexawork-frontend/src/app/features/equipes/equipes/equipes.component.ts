import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { MembersService } from '@core/services/members.service';
import { ProjectsService } from '@core/services/projects.service';
import { SessionService } from '@core/services/session.service';
import { Member } from '@core/models/member.models';
import { slugify } from '@core/util/ui.util';
import { AjouterCollaborateursProjetComponent, AddCollaboratorsPayload } from '@features/equipes/modals/ajouter-collaborateurs-projet/ajouter-collaborateurs-projet.component';
import { CreerEquipeComponent, CreatedTeam } from '@features/equipes/modals/creer-equipe/creer-equipe.component';

interface TeamMember { name: string; role: string; color: string; }
interface Team { id: string; name: string; color: string; members: TeamMember[]; }
interface Loose { name: string; email: string; role: string; color: string; }
interface MemberPick { name: string; role?: string; color: string; me?: boolean; }

@Component({
  selector: 'app-equipes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AjouterCollaborateursProjetComponent, CreerEquipeComponent],
  template: `
    @if (openTeam(); as t) {
      <!-- ===== Détail d'une équipe (inline — reste sur l'onglet) ===== -->
      <div class="wrap">
        <div class="dhead">
          <button class="dback" (click)="closeTeam()"><app-icon name="chevronLeft" [size]="18" [stroke]="2.2" /></button>
          <span class="ddot" [style.background]="t.color"><app-icon name="teams" [size]="14" /></span>
          <div class="dtx">
            <div class="dn">{{ t.name }}</div>
            <div class="dc">{{ t.members.length }} membres · Refonte App Mobile</div>
          </div>
          @if (!readonly && canManageEff()) { <button class="dadd" (click)="openAddMember($event)"><app-icon name="plus" [size]="14" [stroke]="2" />Ajouter</button> }
        </div>
        <div class="dbody">
          <div class="dtbl">
            @for (m of t.members; track m.name; let i = $index) {
              <div class="drow" [class.drow--first]="i===0">
                <span class="dav" [style.background]="m.color">{{ ini(m.name) }}</span>
                <div class="db"><div class="dmn">{{ m.name }}</div><div class="dmr">{{ m.role }}</div></div>
                @if (!readonly && canManageEff()) { <button class="drm" title="Retirer de l'équipe" (click)="removeFromTeam(t.id, m.name)"><app-icon name="x" [size]="15" /></button> }
              </div>
            } @empty {
              <div class="dempty">Cette équipe n'a plus de membre.</div>
            }
          </div>
        </div>
      </div>

      <!-- Modal : ajouter un membre du projet (non assigné) à cette équipe -->
      @if (addOpen()) {
        <div class="mov" (click)="closeAddMember()">
          <div class="mcard" (click)="$event.stopPropagation()">
            <div class="mhd">
              <div class="mhd__t">
                <div class="mhd__title">Ajouter à l'équipe</div>
                <div class="mhd__sub">{{ t.name }} · membres du projet sans équipe</div>
              </div>
              <button class="mx" (click)="closeAddMember()"><app-icon name="x" [size]="16" /></button>
            </div>
            <div class="msearch">
              <app-icon name="search" [size]="16" />
              <input [value]="addQ()" (input)="addQ.set($any($event.target).value)" placeholder="Rechercher une personne…" autofocus />
            </div>
            <div class="mlist">
              @for (m of addCandidates(); track m.name) {
                @let picked = addPicked().has(m.name);
                <button class="mrow" [class.mrow--on]="picked" (click)="toggleAddPick(m.name)">
                  <span class="mrow__a" [style.background]="m.color">{{ ini(m.name) }}</span>
                  <span class="mrow__b">
                    <span class="mrow__n">{{ m.name }}</span>
                    <span class="mrow__r">{{ m.email }} · {{ m.role }}</span>
                  </span>
                  <span class="mrow__ck" [class.mrow__ck--on]="picked">
                    @if (picked) { <app-icon name="check" [size]="13" [stroke]="2.6" /> }
                  </span>
                </button>
              } @empty {
                <div class="mempty">Aucun membre disponible à ajouter.</div>
              }
            </div>
            <div class="mfoot">
              <span class="mfoot__c">{{ addPicked().size }} sélectionné{{ addPicked().size > 1 ? 's' : '' }}</span>
              <button class="mghost" (click)="closeAddMember()">Annuler</button>
              <button class="mprimary" [disabled]="!addPicked().size" (click)="commitAddToTeam(t.id)">
                <app-icon name="plus" [size]="15" [stroke]="2.2" />Ajouter à l'équipe
              </button>
            </div>
          </div>
        </div>
      }
    } @else {
      <!-- ===== Liste des équipes ===== -->
      <div class="wrap" (click)="closePopovers()">
        @if (standalone()) {
          <!-- En-tête projet — visible uniquement dans l'espace Équipes -->
          <div class="phead">
            <span class="pdot"><app-icon name="projects" [size]="14" /></span>
            <div class="ptx">
              <div class="pn">{{ projectName() }}</div>
              <div class="pc">{{ totalMembers() }} membres · {{ teams().length }} équipes</div>
            </div>
          </div>
        }
        <!-- Toolbar : search + chef de projet + bouton + -->
        <div class="toolbar">
          <div class="search">
            <app-icon name="search" [size]="16" />
            <input
              [value]="q()"
              (input)="q.set($any($event.target).value)"
              placeholder="Rechercher une équipe ou un membre…"
              aria-label="Rechercher une équipe ou un membre" />
          </div>
          <span class="spacer"></span>

          @if (!readonly && canManageEff()) {
            <div class="chefwrap">
              <button class="chef" [class.chef--on]="chefOpen()" [class.chef--set]="!!chef()" (click)="toggleChef($event)">
                @if (chef(); as c) {
                  <span class="chef__a" [style.background]="memberColor(c)">{{ ini(c) }}</span>
                  <span class="chef__t">
                    <span class="chef__l">Chef de projet</span>
                    <span class="chef__n">{{ c }}</span>
                  </span>
                  <span class="chef__cv"><app-icon name="chevronDown" [size]="15" /></span>
                } @else {
                  <span class="chef__i"><app-icon name="user" [size]="17" /></span>
                  <span class="chef__t">
                    <span class="chef__l chef__l--muted">Aucun chef de projet</span>
                  </span>
                  <span class="chef__as">Assigner</span>
                }
              </button>
              @if (chefOpen()) {
                <div class="picker" (click)="$event.stopPropagation()">
                  <div class="picker__hd">Désigner un chef de projet</div>
                  <input class="picker__q" [value]="chefQ()" (input)="chefQ.set($any($event.target).value)" placeholder="Rechercher une personne…" autofocus />
                  <div class="picker__list">
                    @if (filteredMembers().length === 0) {
                      <div class="picker__empty">Aucune personne trouvée</div>
                    }
                    @for (m of filteredMembers(); track m.name) {
                      <button class="picker__row" (click)="pickChef(m.name)">
                        <span class="picker__a" [style.background]="m.color">{{ ini(m.name) }}</span>
                        <span class="picker__b">
                          <span class="picker__n">{{ m.name }}@if (m.me) { <span class="picker__me"> (moi)</span> }</span>
                          <span class="picker__r">{{ m.role || 'Membre' }}</span>
                        </span>
                        @if (chef() === m.name) { <span class="picker__ck"><app-icon name="check" [size]="16" /></span> }
                      </button>
                    }
                  </div>
                  @if (chef()) {
                    <button class="picker__rm" (click)="removeChef()">
                      <app-icon name="x" [size]="14" />Retirer le chef de projet
                    </button>
                  }
                </div>
              }
            </div>

            <div class="addwrap">
              <button class="add" title="Ajouter"
                      [class.add--on]="addMenuOpen()"
                      (click)="toggleAddMenu($event)">
                <app-icon name="plus" [size]="18" />
              </button>
              @if (addMenuOpen()) {
                <div class="addmenu" (click)="$event.stopPropagation()">
                  <button type="button" class="addmenu__i" (click)="chooseAdd('member')">
                    <span class="addmenu__ic"><app-icon name="userPlus" [size]="16" /></span>
                    <span>Ajouter un membre</span>
                  </button>
                  <button type="button" class="addmenu__i" (click)="chooseAdd('team')">
                    <span class="addmenu__ic"><app-icon name="teams" [size]="16" /></span>
                    <span>Créer une équipe</span>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Cards d'équipes — filtrées par la recherche -->
        <div class="cards">
          @for (t of filteredTeams(); track t.id) {
            <div class="card" (click)="openTeamCard(t)">
              <div class="card__top">
                <span class="card__ic" [style.background]="t.color"><app-icon name="teams" [size]="19" /></span>
                <div class="card__m">
                  @if (editId() === t.id) {
                    <input class="card__rename"
                           [value]="editVal()"
                           (click)="$event.stopPropagation()"
                           (input)="editVal.set($any($event.target).value)"
                           (keydown.enter)="saveRename()"
                           (keydown.escape)="editId.set(null)"
                           (blur)="saveRename()" />
                  } @else {
                    <div class="card__n">{{ t.name }}</div>
                  }
                  <div class="card__s">{{ t.members.length }} membres</div>
                </div>
                @if (!readonly && canManageEff()) {
                  <div class="dotswrap">
                    <button class="dots" (click)="toggleTeamMenu(t.id, $event)"><app-icon name="dots" [size]="16" /></button>
                    @if (teamMenu() === t.id) {
                      <div class="tmenu" (click)="$event.stopPropagation()">
                        <button class="tmenu__i" (click)="startRename(t)"><app-icon name="edit" [size]="15" />Renommer l'équipe</button>
                        <div class="tmenu__sep"></div>
                        <button class="tmenu__i tmenu__i--danger" (click)="deleteTeam(t.id)"><app-icon name="trash" [size]="15" />Supprimer l'équipe</button>
                      </div>
                    }
                  </div>
                }
              </div>
              <div class="avs">
                @for (m of t.members; track $index; let i = $index) {
                  <span class="av" [style.background]="palette[i % palette.length]" [style.margin-left.px]="i ? -8 : 0">{{ ini(m.name) }}</span>
                }
              </div>
            </div>
          } @empty {
            @if (q().trim() && teams().length > 0) {
              <div class="cards__empty">Aucune équipe ne correspond à votre recherche.</div>
            } @else {
              <div class="cards__empty">Aucune équipe n'est encore créée pour ce projet.@if (!readonly && canManageEff()) { <span> Utilisez le bouton <b>+</b> pour en créer une.</span> }</div>
            }
          }
        </div>

        <!-- Membres sans équipe — filtrés par la recherche -->
        <div class="loose-h">Membres du projet sans équipe</div>
        <div class="loose">
          @for (m of filteredLoose(); track m.email; let i = $index) {
            <div class="lrow" [class.lrow--first]="i===0">
              <span class="lav" [style.background]="m.color">{{ ini(m.name) }}</span>
              <div class="b">
                <div class="ln">{{ m.name }}</div>
                <div class="le">{{ m.email }} · {{ m.role }}</div>
              </div>
              @if (!readonly && canManageEff()) {
                <div class="assignwrap">
                  <button class="assign" (click)="toggleAssign(m.name, $event)">
                    Assigner à une équipe<app-icon name="chevronDown" [size]="14" />
                  </button>
                  @if (assignOpen() === m.name) {
                    <div class="amenu" (click)="$event.stopPropagation()">
                      <div class="amenu__hd">Choisir une équipe</div>
                      @for (t of teams(); track t.id) {
                        <button class="amenu__row" (click)="assignLoose(m, t.id)">
                          <span class="amenu__dot" [style.background]="t.color"></span>
                          <span class="amenu__n">{{ t.name }}</span>
                          <span class="amenu__c">{{ t.members.length }}</span>
                        </button>
                      } @empty {
                        <div class="amenu__empty">Aucune équipe disponible.</div>
                      }
                    </div>
                  }
                </div>
              }
              @if (!readonly && canManageEff()) { <button class="rm" title="Retirer du projet" (click)="removeLoose(m.name)"><app-icon name="x" [size]="15" /></button> }
            </div>
          } @empty {
            @if (q().trim() && loose().length > 0) {
              <div class="loose__empty">Aucun membre ne correspond à votre recherche.</div>
            } @else {
              <div class="loose__empty">Aucun collaborateur du projet en dehors des équipes.@if (!readonly && canManageEff()) { <span> Utilisez le bouton <b>+</b> pour ajouter des collaborateurs.</span> }</div>
            }
          }
        </div>
      </div>
    }

    @if (addCollabOpen()) {
      <app-ajouter-collaborateurs-projet
        [projectName]="projectName()"
        [alreadyInProject]="alreadyInProjectNames()"
        (added)="onCollabAdded($event)"
        (closed)="addCollabOpen.set(false)" />
    }
    @if (createTeamOpen()) {
      <app-creer-equipe (created)="onTeamCreated($event)" (closed)="createTeamOpen.set(false)" />
    }
  `,
  styleUrl: './equipes.component.scss',
})
export class EquipesComponent implements OnInit, OnDestroy {
  @Input() readonly = false;
  /**
   * True when the current user is allowed to mutate teams: ADMIN, OWNER, or
   * chef de projet on this project (règles R9, R21). Defaults to false so the
   * standalone Équipes view (used by admins) can force it to `session.isAdmin`
   * or the project shell can compute the CP status.
   */
  @Input() canManage = false;
  private members = inject(MembersService);
  private el = inject(ElementRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private projectsSvc = inject(ProjectsService);
  private session = inject(SessionService);
  bus = inject(ShellBus);

  /** Effective manage flag — always true for ADMIN/OWNER (a project lead status is passed as input). */
  canManageEff = computed(() => this.canManage || this.session.isAdmin());
  /** Modal state for "Ajouter des collaborateurs au projet". */
  addCollabOpen = signal(false);
  /** Modal state for "Créer une équipe". */
  createTeamOpen = signal(false);
  /** Popover state for the "+" button menu (Ajouter membre / Créer équipe). */
  addMenuOpen = signal(false);

  /** Current URL, kept in sync with router navigation. */
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  /** True only in the standalone Équipes space (/app/equipes), not the project tab. */
  standalone = computed(() => this.currentUrl().split('?')[0] === '/app/equipes');
  /** Projects catalog of the active workspace. */
  private projects = toSignal(this.projectsSvc.list(), { initialValue: [] });
  /**
   * Project id resolved from the URL:
   * - `/app/projets/:id/equipes` — take the path segment;
   * - `/app/equipes?project=<id>` — take the query param (standalone Équipes rail);
   * - `/app/equipes` alone — fall back to the first project of the workspace so
   *   the standalone view always has a coherent context.
   */
  private projectId = computed<string | null>(() => {
    const url = this.currentUrl();
    const m = /^\/app\/projets\/([^\/?#]+)/.exec(url);
    if (m) return m[1];
    const q = /\?project=([^&#]+)/.exec(url);
    if (q) return decodeURIComponent(q[1]);
    // Standalone Équipes with no query param → use the first available project.
    return this.projects()[0]?.id ?? null;
  });
  /** Project the teams belong to — resolved from the URL. */
  projectName = computed<string>(() => {
    const id = this.projectId();
    if (!id) return 'Aucun projet';
    return this.projects().find(p => p.id === id)?.name ?? 'Projet';
  });

  palette = ['#F2693C', '#6C70F0', '#2BB673', '#E0497B', '#3AA9E0'];

  q        = signal('');
  chef     = signal<string | null>(null);
  chefOpen = signal(false);
  chefQ    = signal('');

  // team detail (inline) + card menu + rename
  openTeam = signal<Team | null>(null);
  teamMenu = signal<string | null>(null);
  editId   = signal<string | null>(null);
  editVal  = signal('');

  // add-member-to-team modal
  addOpen = signal(false);
  addQ    = signal('');
  /** Multi-selection state for the add-to-team modal (names cocheded/decocheded). */
  addPicked = signal<Set<string>>(new Set<string>());

  // "assigner à une équipe" dropdown (loose members table), keyed by member name
  assignOpen = signal<string | null>(null);

  /** Directory loaded once on init. */
  private directory = signal<Member[]>([]);

  /** Seed teams for a given project id — only "refonte-app-mobile" ships with a rich preset. */
  /**
   * Seed teams per project (mock demo data). Provides varied states so we can
   * exercise every empty-state message :
   *
   * - `refonte-app-mobile`   → cas nominal peuplé (3 équipes + membres sans équipe)
   * - `site-vitrine-2025`    → 1 équipe, aucun membre sans équipe
   * - `campagne-q3-marketing`→ aucune équipe créée, mais des membres sans équipe
   * - `migration-backend`    → aucune équipe et aucun membre (projet totalement vide)
   * - `design-system-nexa`   → aucune équipe et aucun membre (idem)
   */
  private seedTeamsFor(projectId: string | null): Team[] {
    if (projectId === 'refonte-app-mobile' || projectId === null) {
      return [
        { id: 'design-produit', name: 'Design produit', color: '#6C70F0', members: [
          { name: 'Sarah Diallo', role: 'Lead Design', color: '#F2693C' },
          { name: 'Aïda Ndiaye',  role: 'Designer UI', color: '#2BB673' },
          { name: 'Yacine Sow',   role: 'Designer UX', color: '#3AA9E0' },
        ] },
        { id: 'developpement', name: 'Développement', color: '#2BB673', members: [
          { name: 'Moussa Bâ',    role: 'Dev Frontend',  color: '#6C70F0' },
          { name: 'Akim Koné',    role: 'Dev Backend',   color: '#F5A623' },
          { name: 'Fatou Traoré', role: 'Dev Fullstack', color: '#3AA9E0' },
          { name: 'Yacine Sow',   role: 'Dev Mobile',    color: '#3AA9E0' },
        ] },
        { id: 'qa-tests', name: 'QA & Tests', color: '#E89A2C', members: [
          { name: 'Aïda Ndiaye', role: 'QA Lead',     color: '#2BB673' },
          { name: 'Moussa Bâ',   role: 'QA Engineer', color: '#6C70F0' },
        ] },
      ];
    }
    if (projectId === 'site-vitrine-2025') {
      // 1 équipe avec quelques membres → « aucun membre sans équipe » sera testable
      return [
        { id: 'site-team', name: 'Équipe projet', color: '#F2693C', members: [
          { name: 'Sarah Diallo', role: 'Chef de projet', color: '#F2693C' },
          { name: 'Akim Koné',    role: 'Administrateur', color: '#F5A623' },
          { name: 'Aïda Ndiaye',  role: 'Designer',       color: '#2BB673' },
        ] },
      ];
    }
    // campagne-q3-marketing / migration-backend / design-system-nexa → aucune équipe
    return [];
  }

  /** Seed loose members (workspace members added to the project, no team yet). */
  private seedLooseFor(projectId: string | null): Loose[] {
    if (projectId === 'refonte-app-mobile' || projectId === null) {
      return [
        { name: 'Akim Koné', email: 'akim.kone@nexa.io', role: 'Administrateur', color: '#F5A623' },
      ];
    }
    if (projectId === 'site-vitrine-2025') {
      // Tous les collaborateurs du projet sont assignés à l'équipe unique →
      // aucun membre sans équipe. On expose ainsi l'état "loose vide" alors
      // que le projet a bien du monde.
      return [];
    }
    if (projectId === 'campagne-q3-marketing') {
      // Aucune équipe créée, mais des collaborateurs déjà ajoutés au projet →
      // on veut voir le message "aucune équipe créée" tout en gardant du monde
      // dans la liste "sans équipe".
      return [
        { name: 'Akim Koné',    email: 'akim.kone@nexa.io',    role: 'Administrateur', color: '#F5A623' },
        { name: 'Sarah Diallo', email: 'sarah.diallo@ateliernexa.com', role: 'Chef de projet', color: '#F2693C' },
        { name: 'Fatou Traoré', email: 'fatou.traore@ateliernexa.com', role: 'Marketing',      color: '#3AA9E0' },
      ];
    }
    // migration-backend & design-system-nexa → projet totalement vide
    // (aucune équipe, aucun membre — même l'utilisateur courant doit être
    // ajouté explicitement pour tester le workflow d'ajout de zéro).
    return [];
  }

  teams = signal<Team[]>(this.seedTeamsFor(null));
  loose = signal<Loose[]>(this.seedLooseFor(null));

  constructor() {
    // Reset teams + loose whenever the active project changes so that navigating
    // between projects in the sidebar shows the right per-project state.
    let lastPid: string | null | undefined;
    effect(() => {
      const pid = this.projectId();
      if (pid === lastPid) return;
      lastPid = pid;
      this.teams.set(this.seedTeamsFor(pid));
      this.loose.set(this.seedLooseFor(pid));
      // Close inline detail when we navigate away.
      this.openTeam.set(null);
      this.addCollabOpen.set(false);
      this.addOpen.set(false);
      // Also drop the sidebar-2 "open team" chip: it belongs to the previous
      // project and must not persist under the newly-selected project.
      this.bus.openTeamNav.set(null);
    });
  }

  /** All members available for chef assignment (me first, then directory). */
  private allMembers = computed<MemberPick[]>(() => {
    const me  = { name: 'Akim Koné', role: 'Dev Backend', color: '#F5A623', me: true };
    return [me, ...this.directory().map(m => ({ name: m.name, role: m.role, color: m.color }))];
  });

  /** Distinct people across all teams + unassigned members (project header count). */
  totalMembers = computed<number>(() => {
    const names = new Set<string>();
    this.teams().forEach(t => t.members.forEach(m => names.add(m.name)));
    this.loose().forEach(m => names.add(m.name));
    return names.size;
  });

  ngOnInit(): void {
    this.members.directory().subscribe(list => this.directory.set(list));
  }

  ngOnDestroy(): void {
    // Leaving the space: clear the sidebar team indicator.
    if (this.standalone()) this.bus.openTeamNav.set(null);
  }

  /** Members filtered by the chef-picker search query. */
  filteredMembers = computed<MemberPick[]>(() => {
    const q = this.chefQ().toLowerCase().trim();
    return this.allMembers().filter(m => m.name.toLowerCase().includes(q));
  });

  /** Teams filtered by the toolbar search (matches team name OR any member inside). */
  filteredTeams = computed<Team[]>(() => {
    const q = this.q().toLowerCase().trim();
    if (!q) return this.teams();
    return this.teams().filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.members.some(m => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)),
    );
  });

  /** Loose members filtered by toolbar search (matches name, email, or role). */
  filteredLoose = computed<Loose[]>(() => {
    const q = this.q().toLowerCase().trim();
    if (!q) return this.loose();
    return this.loose().filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q),
    );
  });

  /** Project members with no team, filtered by the add-modal search. */
  addCandidates = computed<Loose[]>(() => {
    const q = this.addQ().toLowerCase().trim();
    const list = this.loose();
    if (!q) return list;
    return list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q),
    );
  });

  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }

  // ── Add a project member (unassigned) to the open team ────────────────────
  openAddMember(ev: Event): void {
    ev.stopPropagation();
    this.addQ.set('');
    this.addPicked.set(new Set<string>());
    this.addOpen.set(true);
  }
  closeAddMember(): void {
    this.addOpen.set(false);
    this.addPicked.set(new Set<string>());
  }

  /**
   * Toggle a candidate in the multi-select add-to-team modal. After chaque
   * (dé)coche on remet la recherche à zéro : la liste affiche à nouveau tout
   * le monde, et les personnes déjà cochées restent cochées (état porté par
   * `addPicked`).
   */
  toggleAddPick(name: string): void {
    this.addPicked.update(set => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
    this.addQ.set('');
  }

  addToTeam(teamId: string, m: Loose): void {
    // add to the team, remove from the unassigned list
    this.teams.update(list => list.map(t =>
      t.id === teamId
        ? { ...t, members: [...t.members, { name: m.name, role: m.role, color: m.color }] }
        : t,
    ));
    this.loose.update(list => list.filter(x => x.name !== m.name));
    const cur = this.openTeam();
    if (cur && cur.id === teamId) this.openTeam.set(this.teams().find(t => t.id === teamId) ?? null);
  }

  /** Finalise the multi-selection: add every picked member in one go. */
  commitAddToTeam(teamId: string): void {
    const names = [...this.addPicked()];
    if (!names.length) return;
    for (const n of names) {
      const m = this.loose().find(x => x.name === n);
      if (m) this.addToTeam(teamId, m);
    }
    this.addPicked.set(new Set<string>());
    this.addOpen.set(false);
  }

  // ── Assigner un membre sans équipe depuis le tableau ──────────────────────
  toggleAssign(name: string, ev: Event): void {
    ev.stopPropagation();
    this.assignOpen.set(this.assignOpen() === name ? null : name);
  }
  /** Assign a loose member to a team, then drop them from the unassigned list. */
  assignLoose(m: Loose, teamId: string): void {
    this.assignOpen.set(null);
    this.addToTeam(teamId, m);
  }
  removeLoose(name: string): void {
    this.assignOpen.set(null);
    this.loose.update(list => list.filter(x => x.name !== name));
  }

  // ── Ajouter des collaborateurs au projet (R10) ────────────────────────────
  /** Names of workspace members already in the project (all teams + unassigned). */
  alreadyInProjectNames = computed<string[]>(() => {
    const names = new Set<string>(['Akim Koné']); // ME is always in the project
    this.teams().forEach(t => t.members.forEach(m => names.add(m.name)));
    this.loose().forEach(m => names.add(m.name));
    return [...names];
  });

  openAddCollab(): void { this.addCollabOpen.set(true); }

  /** Newly-added collaborators are dropped in the "sans équipe" table. */
  onCollabAdded(payload: AddCollaboratorsPayload): void {
    const additions: Loose[] = payload.members.map(m => ({
      name: m.name, email: m.email, role: m.role, color: m.color,
    }));
    this.loose.update(list => [...list, ...additions]);
  }

  // ── Menu "+"  et création d'équipe ─────────────────────────────────────────
  toggleAddMenu(ev: Event): void { ev.stopPropagation(); this.addMenuOpen.update(v => !v); }

  chooseAdd(kind: 'member' | 'team'): void {
    this.addMenuOpen.set(false);
    if (kind === 'member') this.addCollabOpen.set(true);
    else this.createTeamOpen.set(true);
  }

  onTeamCreated(t: CreatedTeam): void {
    // Nouvelle équipe locale — id slugifié, membres vides. L'utilisateur
    // pourra ajouter des membres depuis la vue détail (multi-sélection).
    const baseId = slugify(t.name);
    let id = baseId;
    let i = 2;
    while (this.teams().some(x => x.id === id)) id = `${baseId}-${i++}`;
    const team: Team = { id, name: t.name, color: t.color, members: [] };
    this.teams.update(list => [...list, team]);
    this.createTeamOpen.set(false);
    // Ouvre directement le détail — l'utilisateur peut y ajouter des membres.
    this.openTeam.set(team);
    if (this.standalone()) this.bus.openTeamNav.set({ name: team.name, project: this.projectName() });
  }

  // ── Team detail (inline, no navigation) ──────────────────────────────────
  openTeamCard(t: Team): void {
    if (this.editId() === t.id) return;      // ignore card click while renaming
    this.teamMenu.set(null);
    this.openTeam.set(t);
    // Reflect the open team in sidebar-2 (only in the standalone Équipes space).
    if (this.standalone()) this.bus.openTeamNav.set({ name: t.name, project: this.projectName() });
  }
  closeTeam(): void {
    this.openTeam.set(null);
    if (this.standalone()) this.bus.openTeamNav.set(null);
  }

  removeFromTeam(teamId: string, name: string): void {
    this.teams.update(list => list.map(t =>
      t.id === teamId ? { ...t, members: t.members.filter(m => m.name !== name) } : t,
    ));
    // keep the open detail in sync
    const cur = this.openTeam();
    if (cur && cur.id === teamId) this.openTeam.set(this.teams().find(t => t.id === teamId) ?? null);
  }

  // ── Card 3-dots menu: rename / delete ────────────────────────────────────
  toggleTeamMenu(id: string, ev: Event): void {
    ev.stopPropagation();
    this.teamMenu.set(this.teamMenu() === id ? null : id);
  }

  startRename(t: Team): void {
    this.teamMenu.set(null);
    this.editId.set(t.id);
    this.editVal.set(t.name);
    setTimeout(() => {
      const inp = this.el.nativeElement.querySelector('.card__rename') as HTMLInputElement | null;
      inp?.select();
    }, 0);
  }
  saveRename(): void {
    const id = this.editId();
    const val = this.editVal().trim();
    if (id && val) this.teams.update(list => list.map(t => t.id === id ? { ...t, name: val } : t));
    this.editId.set(null);
  }

  /** Delete a team; its members return to the "sans équipe" list. */
  deleteTeam(id: string): void {
    const team = this.teams().find(t => t.id === id);
    this.teamMenu.set(null);
    if (!team) return;
    // re-add its members to the unassigned list (skip anyone already there)
    this.loose.update(list => {
      const existing = new Set(list.map(m => m.name));
      const added = team.members
        .filter(m => !existing.has(m.name))
        .map(m => ({ name: m.name, email: this.emailOf(m.name), role: m.role, color: m.color }));
      return [...list, ...added];
    });
    this.teams.update(list => list.filter(t => t.id !== id));
    if (this.openTeam()?.id === id) this.openTeam.set(null);
  }

  private emailOf(name: string): string {
    return slugify(name).replace(/-/g, '.') + '@nexa.io';
  }

  // ── Chef de projet ───────────────────────────────────────────────────────
  toggleChef(ev: Event): void {
    ev.stopPropagation();
    const wasOpen = this.chefOpen();
    this.chefOpen.set(!wasOpen);
    if (!wasOpen) this.chefQ.set('');
  }
  pickChef(name: string): void {
    this.chef.set(name);
    this.chefOpen.set(false);
    this.chefQ.set('');
  }
  removeChef(): void {
    this.chef.set(null);
    this.chefOpen.set(false);
    this.chefQ.set('');
  }
  closePopovers(): void {
    if (this.chefOpen()) this.chefOpen.set(false);
    if (this.teamMenu()) this.teamMenu.set(null);
    if (this.assignOpen()) this.assignOpen.set(null);
    if (this.addMenuOpen()) this.addMenuOpen.set(false);
  }
  memberColor(name: string): string {
    return this.allMembers().find(m => m.name === name)?.color ?? '#9b97a3';
  }
}
