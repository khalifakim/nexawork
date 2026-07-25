import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoaderComponent } from '@shared/ui/loader/loader.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { MembersService } from '@core/services/members.service';
import { ProjectsService } from '@core/services/projects.service';
import { SessionService } from '@core/services/session.service';
import { ToastService } from '@core/services/toast.service';
import { Member } from '@core/models/member.models';
import { ProjectMember } from '@core/models/project.models';
import { TasksService, BoardData } from '@core/services/tasks.service';
import { StatusCat } from '@core/models/task.models';
import { avatarColorFor } from '@core/util/ui.util';
import { AjouterCollaborateursProjetComponent, AddCollaboratorsPayload } from '@features/equipes/modals/ajouter-collaborateurs-projet/ajouter-collaborateurs-projet.component';
import { CreerEquipeComponent, CreatedTeam } from '@features/equipes/modals/creer-equipe/creer-equipe.component';

interface TeamMember { userId: string; name: string; role: string; color: string; }
interface Team { id: string; name: string; color: string; members: TeamMember[]; }
interface Loose { userId: string; name: string; email: string; role: string; color: string; }
interface MemberPick { userId: string; name: string; role?: string; color: string; me?: boolean; }
/** Ligne de la vue « Charge de travail » : compteurs de tâches d'un membre du projet. */
interface WorkloadRow {
  userId: string; name: string; color: string; role: string;
  todo: number; active: number; done: number; overdue: number; total: number; activeTotal: number;
  /** Progression = part des tâches terminées (0–100). */
  pct: number;
}
/** Progression agrégée d'une équipe (somme des tâches de ses membres). */
interface TeamWorkloadRow {
  id: string; name: string; color: string; count: number;
  todo: number; active: number; done: number; overdue: number; total: number; pct: number;
}

@Component({
  selector: 'app-equipes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AjouterCollaborateursProjetComponent, CreerEquipeComponent, LoaderComponent],
  template: `
    @if (openTeam(); as t) {
      <!-- ===== Détail d'une équipe (inline — reste sur l'onglet) ===== -->
      <div class="wrap">
        <div class="dhead">
          <button class="dback" (click)="closeTeam()"><app-icon name="chevronLeft" [size]="18" [stroke]="2.2" /></button>
          <span class="ddot" [style.background]="t.color"><app-icon name="teams" [size]="14" /></span>
          <div class="dtx">
            <div class="dn">{{ t.name }}</div>
            <div class="dc">{{ t.members.length }} membres · {{ projectName() }}</div>
          </div>
          @if (!readonly && canManageEff()) { <button class="dadd" (click)="openAddMember($event)"><app-icon name="plus" [size]="14" [stroke]="2" />Ajouter</button> }
        </div>
        <div class="dbody">
          <div class="dtbl">
            @for (m of t.members; track m.name; let i = $index) {
              <div class="drow" [class.drow--first]="i===0">
                <span class="dav" [style.background]="m.color">{{ ini(m.name) }}</span>
                <div class="db"><div class="dmn">{{ m.name }}</div><div class="dmr">{{ m.role }}</div></div>
                @if (!readonly && canManageEff()) { <button class="drm" title="Retirer de l'équipe" (click)="removeFromTeam(t.id, m)"><app-icon name="x" [size]="15" /></button> }
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
              @for (m of addCandidates(); track m.userId) {
                @let picked = addPicked().has(m.userId);
                <button class="mrow" [class.mrow--on]="picked" (click)="toggleAddPick(m.userId)">
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
    } @else if (projects().length === 0) {
      <!-- ===== Aucun projet : pas d'équipes possibles ===== -->
      <div class="wrap">
        <div class="noproj">
          <span class="noproj__ic"><app-icon name="teams" [size]="30" /></span>
          <h2>Aucun projet n'a encore été créé</h2>
          <p>Créez d'abord un projet afin de pouvoir créer et gérer vos équipes.</p>
          <button class="noproj__cta" (click)="goToProjects()"><app-icon name="plus" [size]="17" [stroke]="2.2" />Créer un projet</button>
        </div>
      </div>
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
        <!-- Bascule Membres du projet / Progression (identique dans /app/equipes et l'onglet projet) -->
        <div class="viewtabs">
          <button type="button" [class.viewtabs__on]="view()==='composition'" (click)="setView('composition')"><app-icon name="teams" [size]="15" />Membres du projet</button>
          <button type="button" [class.viewtabs__on]="view()==='charge'" (click)="setView('charge')"><app-icon name="dashboard" [size]="15" />Progression par membre / équipe</button>
        </div>

        @if (view() === 'composition') {
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
              <button class="chef" [class.chef--on]="chefOpen()" [class.chef--set]="!!chef()" [disabled]="chefSaving()" (click)="toggleChef($event)">
                @if (chefSaving()) {
                  <span class="chef__spin"></span>
                  <span class="chef__t">
                    <span class="chef__l">Chef de projet</span>
                    <span class="chef__n">Assignation de {{ pendingChefName() }}…</span>
                  </span>
                } @else if (chef(); as c) {
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
                    @for (m of filteredMembers(); track m.userId) {
                      <button class="picker__row" (click)="pickChef(m)">
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

        @if (loading()) {
          <app-loader label="Chargement des équipes…" [minHeight]="260" />
        } @else {
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
              @if (!readonly && canManageEff()) { <button class="rm" title="Retirer du projet" (click)="removeLoose(m)"><app-icon name="x" [size]="15" /></button> }
            </div>
          } @empty {
            @if (q().trim() && loose().length > 0) {
              <div class="loose__empty">Aucun membre ne correspond à votre recherche.</div>
            } @else {
              <div class="loose__empty">Aucun collaborateur du projet en dehors des équipes.@if (!readonly && canManageEff()) { <span> Utilisez le bouton <b>+</b> pour ajouter des collaborateurs.</span> }</div>
            }
          }
        </div>
        }
        } @else {
          <!-- ===== Charge de travail par membre (identique /app/equipes et onglet projet) ===== -->
          @if (chargeLoading()) {
            <app-loader label="Calcul de la charge…" [minHeight]="200" />
          } @else {
            <div class="chg__h">
              <div class="chg__tt">
                <span class="chg__t">{{ chargeBy()==='team' ? 'Progression par équipe' : 'Progression par membre' }}</span>
                <span class="chg__s">Répartition des tâches et progression (part des tâches terminées) sur « {{ projectName() }} ».</span>
              </div>
              <div class="viewtabs viewtabs--sm">
                <button type="button" [class.viewtabs__on]="chargeBy()==='member'" (click)="chargeBy.set('member')">Par membre</button>
                <button type="button" [class.viewtabs__on]="chargeBy()==='team'" (click)="chargeBy.set('team')">Par équipe</button>
              </div>
            </div>
            <div class="chg">
              @if (chargeBy() === 'member') {
                @for (r of workload(); track r.userId) {
                  <div class="chgrow">
                    <span class="chgav" [style.background]="r.color">{{ ini(r.name) }}</span>
                    <div class="chgb">
                      <div class="chgtop">
                        <span class="chgn">{{ r.name }}<span class="chgrole">{{ r.role }}</span></span>
                        <span class="chgcounts">
                          <span class="ct ct--todo">{{ r.todo }} à faire</span>
                          <span class="ct ct--active">{{ r.active }} en cours</span>
                          <span class="ct ct--done">{{ r.done }} terminé{{ r.done > 1 ? 's' : '' }}</span>
                          @if (r.overdue) { <span class="ct ct--late"><app-icon name="alert" [size]="11" [stroke]="2" />{{ r.overdue }} en retard</span> }
                        </span>
                      </div>
                      <div class="chgprog" [title]="r.done + ' / ' + r.total + ' tâches terminées'">
                        <div class="chgprog__track"><div class="chgprog__fill" [style.width.%]="r.pct"></div></div>
                        <span class="chgprog__pct">{{ r.total ? r.pct + '%' : '—' }}</span>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="chg__empty">Aucun membre sur ce projet.</div>
                }
                @if (unassignedCount()) {
                  <div class="chgrow chgrow--un">
                    <span class="chgav chgav--un"><app-icon name="user" [size]="16" /></span>
                    <div class="chgb"><span class="chgn">Non assigné<span class="chgrole">{{ unassignedCount() }} tâche{{ unassignedCount() > 1 ? 's' : '' }} sans responsable</span></span></div>
                  </div>
                }
              } @else {
                @for (t of workloadByTeam(); track t.id) {
                  <div class="chgrow">
                    <span class="chgav" [style.background]="t.color">{{ ini(t.name) }}</span>
                    <div class="chgb">
                      <div class="chgtop">
                        <span class="chgn">{{ t.name }}<span class="chgrole">{{ t.count }} membre{{ t.count > 1 ? 's' : '' }}</span></span>
                        <span class="chgcounts">
                          <span class="ct ct--todo">{{ t.todo }} à faire</span>
                          <span class="ct ct--active">{{ t.active }} en cours</span>
                          <span class="ct ct--done">{{ t.done }} terminé{{ t.done > 1 ? 's' : '' }}</span>
                          @if (t.overdue) { <span class="ct ct--late"><app-icon name="alert" [size]="11" [stroke]="2" />{{ t.overdue }} en retard</span> }
                        </span>
                      </div>
                      <div class="chgprog" [title]="t.done + ' / ' + t.total + ' tâches terminées'">
                        <div class="chgprog__track"><div class="chgprog__fill" [style.width.%]="t.pct"></div></div>
                        <span class="chgprog__pct">{{ t.total ? t.pct + '%' : '—' }}</span>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="chg__empty">Aucune équipe sur ce projet.</div>
                }
              }
            </div>
          }
        }
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
  private tasksSvc = inject(TasksService);
  private el = inject(ElementRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private projectsSvc = inject(ProjectsService);
  private session = inject(SessionService);
  private toast = inject(ToastService);
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
  protected projects = toSignal(this.projectsSvc.list(), { initialValue: [] });
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
  /** Assignation du chef de projet en cours (loader dans le champ). */
  chefSaving = signal(false);
  /** Nom du membre en cours d'assignation comme chef (affiché pendant le chargement). */
  pendingChefName = signal<string | null>(null);
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

  /** Équipes réelles du projet courant (avec leurs membres résolus). */
  teams = signal<Team[]>([]);
  /** Membres du projet sans équipe (réels). */
  loose = signal<Loose[]>([]);
  /** Vrai pendant le chargement des équipes/membres. */
  loading = signal(false);

  // ── Charge de travail (vue « Charge ») ──────────────────────────────────────
  /** Vue active de l'onglet Équipes : composition (équipes/membres) ou charge. */
  view = signal<'composition' | 'charge'>('composition');
  /** Dans la vue Progression : agrégation par membre ou par équipe. */
  chargeBy = signal<'member' | 'team'>('member');
  /** Board du projet (statuts + cartes) chargé à la demande pour calculer la charge. */
  private board = signal<BoardData | null>(null);
  /** Projet pour lequel `board` est chargé (évite un rechargement inutile). */
  private boardPid: string | null = null;
  chargeLoading = signal(false);

  /** statusId → catégorie de statut (à faire / actif / terminé). */
  private catOf = computed(() => {
    const m = new Map<string, StatusCat>();
    for (const c of this.board()?.columns ?? []) m.set(c.id, c.cat);
    return m;
  });

  /** Une ligne de charge par membre du projet (équipes + sans équipe), triée par charge. */
  workload = computed<WorkloadRow[]>(() => {
    const b = this.board();
    if (!b) return [];
    const cat = this.catOf();
    const cards = Object.values(b.cards).flat();
    // Membres du projet = union (par userId) des membres d'équipe et des « sans équipe ».
    const map = new Map<string, { userId: string; name: string; color: string; role: string }>();
    for (const t of this.teams()) for (const m of t.members) map.set(m.userId, { userId: m.userId, name: m.name, color: m.color, role: m.role });
    for (const l of this.loose()) if (!map.has(l.userId)) map.set(l.userId, { userId: l.userId, name: l.name, color: l.color, role: l.role });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const rows = [...map.values()].map(m => {
      let todo = 0, active = 0, done = 0, overdue = 0;
      for (const c of cards) {
        if (c.assigneeType === 'TEAM' || c.assigneeId !== m.userId) continue;
        const k = cat.get(c.statusId);
        if (k === 'done' || k === 'closed') { done++; continue; }
        if (k === 'active') active++; else todo++;
        if (c.dueDate) { const d = new Date(c.dueDate); if (!isNaN(d.getTime()) && d < today) overdue++; }
      }
      const total = todo + active + done;
      return {
        ...m, todo, active, done, overdue, total,
        activeTotal: todo + active,
        pct: total ? Math.round((done / total) * 100) : 0,
      };
    });
    rows.sort((a, b2) => (b2.activeTotal - a.activeTotal) || (b2.overdue - a.overdue) || a.name.localeCompare(b2.name));
    return rows;
  });

  /** Progression agrégée PAR ÉQUIPE : somme des tâches des membres de chaque équipe. */
  workloadByTeam = computed<TeamWorkloadRow[]>(() => {
    const byUser = new Map(this.workload().map(r => [r.userId, r]));
    return this.teams().map(t => {
      let todo = 0, active = 0, done = 0, overdue = 0;
      for (const m of t.members) {
        const r = byUser.get(m.userId);
        if (r) { todo += r.todo; active += r.active; done += r.done; overdue += r.overdue; }
      }
      const total = todo + active + done;
      return {
        id: t.id, name: t.name, color: t.color, count: t.members.length,
        todo, active, done, overdue, total,
        pct: total ? Math.round((done / total) * 100) : 0,
      };
    }).sort((a, b2) => (b2.active - a.active) || (b2.overdue - a.overdue) || a.name.localeCompare(b2.name));
  });

  /** Tâches ouvertes non assignées à une personne (info complémentaire de la charge). */
  unassignedCount = computed(() => {
    const b = this.board();
    if (!b) return 0;
    const cat = this.catOf();
    return Object.values(b.cards).flat().filter(c => {
      if (c.assigneeId && c.assigneeType !== 'TEAM') return false;
      const k = cat.get(c.statusId);
      return k !== 'done' && k !== 'closed';
    }).length;
  });

  /** Bascule la vue ; charge le board à la première ouverture de « Charge ». */
  setView(v: 'composition' | 'charge'): void {
    this.view.set(v);
    if (v === 'charge') this.ensureBoard();
  }

  /** Charge le board du projet courant si nécessaire (une fois par projet). */
  private ensureBoard(): void {
    const pid = this.projectId();
    if (!pid || pid === this.boardPid) return;
    this.chargeLoading.set(true);
    this.tasksSvc.loadBoard(pid).subscribe({
      next: b => { this.board.set(b); this.boardPid = pid; this.chargeLoading.set(false); },
      error: () => this.chargeLoading.set(false),
    });
  }

  /**
   * Charge les équipes + membres réels du projet et construit `teams`/`loose`.
   * Les noms/couleurs/emails sont résolus via l'annuaire du workspace.
   */
  private reload(pid: string | null): void {
    if (!pid) { this.teams.set([]); this.loose.set([]); return; }
    this.loading.set(true);
    forkJoin({
      teams: this.projectsSvc.teams(pid),
      members: this.projectsSvc.members(pid),
      dir: this.members.directory(),
    }).subscribe({
      next: ({ teams, members, dir }) => {
        const byId = new Map(dir.filter(m => m.userId).map(m => [m.userId!, m] as const));
        const resolve = (pm: ProjectMember): TeamMember => {
          const m = byId.get(pm.userId);
          return {
            userId: pm.userId,
            name: m?.name ?? 'Membre',
            role: m?.role || (pm.isProjectLead ? 'Chef de projet' : 'Membre'),
            color: m?.color ?? avatarColorFor(pm.userId),
          };
        };
        this.teams.set(teams.map(t => ({
          id: t.id, name: t.name, color: t.color ?? '#6C70F0',
          members: members.filter(pm => pm.teamId === t.id).map(resolve),
        })));
        this.loose.set(members.filter(pm => !pm.teamId).map(pm => ({
          ...resolve(pm), email: byId.get(pm.userId)?.email ?? '',
        })));
        // Chef de projet réel = ownerUserId du projet, résolu en nom.
        const proj = this.projects().find(p => p.id === pid);
        this.chef.set(proj?.ownerUserId ? (byId.get(proj.ownerUserId)?.name ?? null) : null);
        // Garde le détail d'équipe ouvert synchronisé.
        const open = this.openTeam();
        if (open) this.openTeam.set(this.teams().find(t => t.id === open.id) ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  constructor() {
    // Reset teams + loose whenever the active project changes so that navigating
    // between projects in the sidebar shows the right per-project state.
    let lastPid: string | null | undefined;
    effect(() => {
      const pid = this.projectId();
      if (pid === lastPid) return;
      lastPid = pid;
      this.reload(pid);
      // La charge dépend du board du nouveau projet : on l'invalide (et on recharge
      // seulement si l'utilisateur est déjà sur la vue « Charge »).
      this.board.set(null);
      this.boardPid = null;
      if (untracked(this.view) === 'charge') this.ensureBoard();
      // Close inline detail when we navigate away.
      this.openTeam.set(null);
      this.addCollabOpen.set(false);
      this.addOpen.set(false);
      // Also drop the sidebar-2 "open team" chip: it belongs to the previous
      // project and must not persist under the newly-selected project.
      this.bus.openTeamNav.set(null);
    });
  }

  /** Tous les membres du workspace (annuaire réel) — pour la désignation du chef. */
  private allMembers = computed<MemberPick[]>(() => {
    const meId = this.session.user()?.id;
    return this.directory().filter(m => m.userId).map(m => ({
      userId: m.userId!, name: m.name, role: m.role, color: m.color, me: m.userId === meId,
    }));
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
  toggleAddPick(userId: string): void {
    this.addPicked.update(set => {
      const next = new Set(set);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
    this.addQ.set('');
  }

  /** Assigne un membre (sans équipe) à une équipe — backend puis rechargement. */
  addToTeam(teamId: string, m: Loose): void {
    const pid = this.projectId();
    if (!pid) return;
    this.projectsSvc.setMemberTeam(pid, m.userId, teamId).subscribe(() => this.reload(pid));
  }

  /** Finalise la multi-sélection : ajoute tous les membres cochés d'un coup. */
  commitAddToTeam(teamId: string): void {
    const ids = [...this.addPicked()];
    const pid = this.projectId();
    if (!ids.length || !pid) return;
    forkJoin(ids.map(uid => this.projectsSvc.setMemberTeam(pid, uid, teamId))).subscribe(() => {
      this.reload(pid);
      this.toast.show({ message: ids.length + (ids.length > 1 ? ' membres ajoutés' : ' membre ajouté') + ' à l\'équipe' });
    });
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
  removeLoose(m: Loose): void {
    this.assignOpen.set(null);
    const pid = this.projectId();
    if (!pid) return;
    this.projectsSvc.removeMember(pid, m.userId).subscribe(() => {
      this.reload(pid);
      this.toast.show({ message: m.name + ' retiré du projet' });
    });
  }

  // ── Ajouter des collaborateurs au projet (R10) ────────────────────────────
  /** Names of workspace members already in the project (all teams + unassigned). */
  alreadyInProjectNames = computed<string[]>(() => {
    const names = new Set<string>();
    this.teams().forEach(t => t.members.forEach(m => names.add(m.name)));
    this.loose().forEach(m => names.add(m.name));
    return [...names];
  });

  openAddCollab(): void { this.addCollabOpen.set(true); }

  /** Ajoute les collaborateurs choisis au projet (résolution nom → userId via l'annuaire). */
  onCollabAdded(payload: AddCollaboratorsPayload): void {
    const pid = this.projectId();
    if (!pid) return;
    const dir = this.directory();
    const ids = payload.members
      .map(m => dir.find(d => d.name === m.name)?.userId)
      .filter((id): id is string => !!id);
    if (!ids.length) return;
    forkJoin(ids.map(uid => this.projectsSvc.addMember(pid, uid))).subscribe(() => {
      this.reload(pid);
      this.toast.show({ message: ids.length + (ids.length > 1 ? ' collaborateurs ajoutés' : ' collaborateur ajouté') + ' au projet' });
    });
  }

  // ── Menu "+"  et création d'équipe ─────────────────────────────────────────
  toggleAddMenu(ev: Event): void { ev.stopPropagation(); this.addMenuOpen.update(v => !v); }

  chooseAdd(kind: 'member' | 'team'): void {
    this.addMenuOpen.set(false);
    if (kind === 'member') this.addCollabOpen.set(true);
    else this.createTeamOpen.set(true);
  }

  onTeamCreated(t: CreatedTeam): void {
    const pid = this.projectId();
    this.createTeamOpen.set(false);
    if (!pid) return;
    this.projectsSvc.createTeam(pid, t.name, t.color).subscribe(() => {
      this.reload(pid);
      this.toast.show({ message: 'Équipe « ' + t.name + ' » créée' });
    });
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

  removeFromTeam(teamId: string, m: TeamMember): void {
    const pid = this.projectId();
    if (!pid) return;
    this.projectsSvc.setMemberTeam(pid, m.userId, null).subscribe(() => this.reload(pid));
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
    this.editId.set(null);
    const pid = this.projectId();
    if (!id || !val || !pid) return;
    // Optimiste puis persistance ; on recharge en cas d'échec.
    this.teams.update(list => list.map(t => t.id === id ? { ...t, name: val } : t));
    this.projectsSvc.updateTeam(pid, id, { name: val }).subscribe({ error: () => this.reload(pid) });
  }

  /** Supprime une équipe ; ses membres repassent « sans équipe » (backend). */
  deleteTeam(id: string): void {
    this.teamMenu.set(null);
    const pid = this.projectId();
    if (!pid) return;
    this.projectsSvc.deleteTeam(pid, id).subscribe(() => {
      if (this.openTeam()?.id === id) this.openTeam.set(null);
      this.reload(pid);
      this.toast.show({ message: 'Équipe supprimée' });
    });
  }

  // ── Chef de projet ───────────────────────────────────────────────────────
  toggleChef(ev: Event): void {
    ev.stopPropagation();
    const wasOpen = this.chefOpen();
    this.chefOpen.set(!wasOpen);
    if (!wasOpen) this.chefQ.set('');
  }
  pickChef(m: MemberPick): void {
    this.chefOpen.set(false);
    this.chefQ.set('');
    const pid = this.projectId();
    if (!pid) return;
    // Pas d'affichage optimiste : on montre un loader tant que le serveur n'a pas
    // confirmé, puis on applique le chef (et le toast) — l'assignation est alors
    // réellement effective.
    this.pendingChefName.set(m.name);
    this.chefSaving.set(true);
    this.projectsSvc.setProjectChief(pid, m.userId).subscribe({
      next: () => {
        this.chef.set(m.name);
        this.chefSaving.set(false);
        this.pendingChefName.set(null);
        this.toast.show({ message: m.name + ' est désormais chef de projet' });
      },
      error: () => {
        this.chefSaving.set(false);
        this.pendingChefName.set(null);
        this.toast.show({ message: 'Impossible de désigner le chef de projet. Réessayez.', icon: 'warning' });
      },
    });
  }
  removeChef(): void {
    // Pas d'endpoint de retrait dédié : on efface l'affichage (le chef reste tant
    // qu'un autre n'est pas désigné côté serveur).
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

  /** Redirige vers la page Projets (pour créer un premier projet). */
  goToProjects(): void { this.router.navigate(['/app/projets']); }
}
