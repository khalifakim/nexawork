import {
  ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges,
  Output, ViewChild, computed, effect, inject, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CommentComposerComponent } from '@shared/ui/comment-composer/comment-composer.component';
import { MentionChipComponent, MentionChipEvent } from '@shared/ui/mention-chip/mention-chip.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { TaskCard, TaskComment, AttachedRef, KanbanColumn, TaskPriority, UpdateTaskPayload } from '@core/models/task.models';
import { Member } from '@core/models/member.models';
import { chipTabFor as chipTabForUtil, parseRichText, RichPart } from '@core/util/mention.util';
import { MentionRef } from '@core/models/mention.models';
import { avatarColorFor } from '@core/util/ui.util';
import { TasksService } from '@core/services/tasks.service';
import { MembersService } from '@core/services/members.service';
import { ProjectsService } from '@core/services/projects.service';
import { SessionService } from '@core/services/session.service';
import { FilesHttpService } from '@core/http/files.http.service';
import { ToastService } from '@core/services/toast.service';
import { extractApiError } from '@core/http/response.model';
import { HttpErrorResponse } from '@angular/common/http';

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'LOW',    label: 'Basse',   color: '#2BB673' },
  { value: 'MEDIUM', label: 'Moyenne', color: '#E89A2C' },
  { value: 'HIGH',   label: 'Haute',   color: '#F5564E' },
  { value: 'URGENT', label: 'Urgente', color: '#E0497B' },
];

/** Vue d'affichage d'une sous-tâche. */
interface SubRow { id: string; title: string; done: boolean; }

/** Vue d'affichage d'un commentaire (contenu parsé en parts + fichiers). */
interface CommentRow {
  id: string;
  authorUserId: string;
  author: string; color: string; time: string;
  /** Photo de profil de l'auteur (annuaire) — absente → initiales. */
  authorPhotoUrl?: string;
  parts: RichPart[];
  files: AttachedRef[];
  mine: boolean;
}

/** Fiche de tâche — modal unique (détail + commentaires), branchée au backend. */
@Component({
  selector: 'app-fiche-tache',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CommentComposerComponent, MentionChipComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
       @if (loading) {
         <div class="loading">
           <span class="loading__spin"></span>
           <span class="loading__t">Ouverture de la tâche…</span>
         </div>
       }
       <div class="modal__inner">
        <!-- LEFT -->
        <div class="left">
          <div class="lh">
            <button class="crumb" (click)="closed.emit()"><app-icon name="projects" [size]="14" />Projets</button>
            <span class="crumb__sep">/</span>
            <span class="crumb__p">{{ task.proj || 'Projet' }}</span>
            <span class="spacer"></span>
            <span class="id nx-mono">{{ task.taskKey }}</span>
            <span class="created">Créée le {{ fmtDate(task.createdDate) }}</span>
            @if (!readonly) {
              @if (editMode()) {
                <button class="edit edit--save" [disabled]="saving()" (click)="saveEdit()" title="Enregistrer les modifications"><app-icon name="check" [size]="15" [stroke]="2.4" /><span>{{ saving() ? 'Enregistrement…' : 'Enregistrer' }}</span></button>
                <button class="edit edit--cancel" [disabled]="saving()" (click)="cancelEdit()" title="Annuler"><app-icon name="x" [size]="15" /></button>
              } @else {
                <button class="edit edit--icon" (click)="enterEdit()" title="Modifier la tâche"><app-icon name="edit" [size]="15" /></button>
                <button class="del" (click)="deleteTask()"><app-icon name="trash" [size]="14" />Supprimer</button>
              }
            } @else {
              <span class="ro"><app-icon name="lock" [size]="12" />Lecture seule</span>
            }
          </div>

          <div class="lbody" (click)="closeField()">
            @if (editMode()) {
              <input class="title title--edit" [value]="eTitle()" (input)="eTitle.set($any($event.target).value)" placeholder="Nom de la tâche" />
            } @else {
              <div class="title title--ro">{{ task.title }}</div>
            }

            <div class="fields">
              <!-- Statut -->
              <div class="frow frow--top"><span class="fl"><app-icon name="taskCheck" [size]="16" />Statut</span>
                @if (editMode()) {
                  <div class="edwrap">
                    <div class="fw">
                      <button class="status status--btn" [style.color]="eStatusCol()?.color" [style.background]="tint(eStatusCol()?.color)" (click)="$event.stopPropagation(); openField('status')">
                        <span class="sdot" [style.background]="eStatusCol()?.color"></span>{{ eStatusCol()?.name }}<app-icon name="chevronDown" [size]="13" [stroke]="2.4" />
                      </button>
                      @if (field() === 'status') {
                        <div class="dd" (click)="$event.stopPropagation()">
                          @for (c of columns(); track c.id) {
                            <button class="dd__i" [class.dd__i--sel]="c.id === eStatusId()" (click)="pickStatus(c.id)">
                              <span class="sdot" [style.background]="c.color"></span><span class="dd__name">{{ c.name }}</span>
                            </button>
                          }
                        </div>
                      }
                    </div>
                    @if (statusError()) {
                      <div class="ederr"><app-icon name="alert" [size]="13" />{{ statusError() }}</div>
                    }
                  </div>
                } @else {
                  <span class="status" [style.color]="task.tag[1]" [style.background]="statusBg()"><span class="sdot" [style.background]="task.tag[1]"></span>{{ task.tag[0] }}</span>
                }
              </div>
              <!-- Assignés -->
              <div class="frow"><span class="fl"><app-icon name="user" [size]="16" />Assignés</span>
                @if (editMode()) {
                  <div class="fw">
                    @if (editAssigneeName()) {
                      <button class="assignee assignee--btn" (click)="$event.stopPropagation(); openField('assignee')">
                        <span class="av" [class.av--team]="editAssigneeIsTeam()" [style.background]="editAssigneeColor()">{{ editAssigneeInitials() }}</span>
                        <span>{{ editAssigneeName() }}</span>@if (editAssigneeIsTeam()) { <span class="team-tag">Équipe</span> }<app-icon name="chevronDown" [size]="13" [stroke]="2.4" />
                      </button>
                    } @else {
                      <button class="ghostf" (click)="$event.stopPropagation(); openField('assignee')"><app-icon name="userPlus" [size]="15" />Assigner</button>
                    }
                    @if (field() === 'assignee') {
                      <div class="dd dd--wide" (click)="$event.stopPropagation()">
                        <button class="mode-toggle" (click)="assignMode.set(assignMode() === 'team' ? 'user' : 'team')">
                          <app-icon [name]="assignMode() === 'team' ? 'user' : 'teams'" [size]="16" />{{ assignMode() === 'team' ? 'Assigner à une personne' : 'Assigner à une équipe' }}
                        </button>
                        <div class="dd__sep"></div>
                        @if (assignMode() === 'user') {
                          <input class="dd__search" autofocus placeholder="Rechercher une personne…" [value]="assigneeQuery()" (click)="$event.stopPropagation()" (input)="assigneeQuery.set($any($event.target).value)" />
                          @for (m of filteredProjMembers(); track m.id) {
                            <button class="dd__i" [class.dd__i--sel]="eAssigneeKey() === 'USER:' + m.id" (click)="pickAssignee('USER:' + m.id)">
                              <span class="av av--sm" [style.background]="memberColorId(m.id)">{{ ini(m.name) }}</span><span class="dd__name">{{ m.name }}</span>
                            </button>
                          } @empty { <div class="dd__empty">Aucun membre dans ce projet.</div> }
                        } @else {
                          <div class="dd__lbl">Équipes du projet</div>
                          @for (t of projTeams(); track t.id) {
                            <button class="dd__i" [class.dd__i--sel]="eAssigneeKey() === 'TEAM:' + t.id" (click)="pickAssignee('TEAM:' + t.id)">
                              <span class="av av--sm av--team" [style.background]="t.color">{{ t.name[0] }}</span><span class="dd__name">{{ t.name }}</span>
                            </button>
                          } @empty { <div class="dd__empty">Aucune équipe dans ce projet.</div> }
                        }
                        @if (eAssigneeKey()) { <button class="dd__clear" (click)="pickAssignee('')">Retirer l'assignation</button> }
                      </div>
                    }
                  </div>
                } @else if (task.assigneeId) {
                  <span class="assignee"><span class="av" [class.av--team]="assigneeIsTeam()" [style.background]="assigneeColor()">{{ assigneeInitials() }}</span>{{ assigneeLabel() }}@if (assigneeIsTeam()) { <span class="team-tag">Équipe</span> }</span>
                } @else {
                  <span class="fv fv--muted">Non assigné</span>
                }
              </div>
              <!-- Date de début -->
              <div class="frow"><span class="fl"><app-icon name="calendar" [size]="16" />Date de début</span>
                @if (editMode()) {
                  <div class="fw">
                    <button class="fvbtn" [class.fv--muted]="!eStart()" (click)="$event.stopPropagation(); openField('start')">{{ eStart() ? fmtDate(eStart()) : 'Ajouter' }}<app-icon name="chevronDown" [size]="13" [stroke]="2.4" /></button>
                    @if (field() === 'start') {
                      <div class="dd" (click)="$event.stopPropagation()">
                        <input type="date" class="dd__date" autofocus [value]="eStart()" (change)="eStart.set($any($event.target).value)" />
                        @if (eStart()) { <button class="dd__clear" (click)="eStart.set(''); closeField()">Effacer</button> }
                      </div>
                    }
                  </div>
                } @else {
                  <span class="fv" [class.fv--muted]="!task.startDate">{{ task.startDate ? fmtDate(task.startDate) : 'Non définie' }}</span>
                }
              </div>
              <!-- Date de fin -->
              <div class="frow"><span class="fl"><app-icon name="calendar" [size]="16" />Date de fin</span>
                @if (editMode()) {
                  <div class="fw">
                    <button class="fvbtn" [class.fv--muted]="!eDue()" (click)="$event.stopPropagation(); openField('due')">{{ eDue() ? fmtDate(eDue()) : 'Ajouter' }}<app-icon name="chevronDown" [size]="13" [stroke]="2.4" /></button>
                    @if (field() === 'due') {
                      <div class="dd" (click)="$event.stopPropagation()">
                        <input type="date" class="dd__date" autofocus [value]="eDue()" (change)="eDue.set($any($event.target).value)" />
                        @if (eDue()) { <button class="dd__clear" (click)="eDue.set(''); closeField()">Effacer</button> }
                      </div>
                    }
                  </div>
                } @else {
                  <span class="fv" [class.fv--muted]="!task.dueDate">{{ task.dueDate ? fmtDate(task.dueDate) : 'Non définie' }}</span>
                }
              </div>
              <!-- Priorité -->
              <div class="frow"><span class="fl"><app-icon name="flag" [size]="16" />Priorité</span>
                @if (editMode()) {
                  <div class="fw">
                    <button class="prio prio--btn" [style.color]="ePrioMeta()?.color" (click)="$event.stopPropagation(); openField('priority')">
                      <span class="pdot" [style.background]="ePrioMeta()?.color"></span>{{ ePrioMeta()?.label }}<app-icon name="chevronDown" [size]="13" [stroke]="2.4" />
                    </button>
                    @if (field() === 'priority') {
                      <div class="dd" (click)="$event.stopPropagation()">
                        @for (p of PRIORITIES; track p.value) {
                          <button class="dd__i" [class.dd__i--sel]="p.value === ePriority()" (click)="pickPriority(p.value)">
                            <span class="pdot" [style.background]="p.color"></span><span class="dd__name">{{ p.label }}</span>
                          </button>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <span class="prio" [style.color]="task.prio[1]"><span class="pdot" [style.background]="task.prio[1]"></span>{{ task.prio[0] }}</span>
                }
              </div>
              <!-- Temps estimé -->
              <div class="frow"><span class="fl"><app-icon name="clockEst" [size]="16" />Temps estimé</span>
                @if (editMode()) {
                  <div class="fw">
                    <button class="fvbtn" [class.fv--muted]="!eEstimate()" (click)="$event.stopPropagation(); openField('estimate')">{{ eEstimate() || 'Ajouter' }}<app-icon name="chevronDown" [size]="13" [stroke]="2.4" /></button>
                    @if (field() === 'estimate') {
                      <div class="dd" (click)="$event.stopPropagation()">
                        <input class="dd__est" autofocus [value]="eEstimate()" placeholder="Ex. 3 h, 2 j…" (click)="$event.stopPropagation()" (input)="eEstimate.set($any($event.target).value)" (keydown.enter)="closeField()" />
                      </div>
                    }
                  </div>
                } @else {
                  <span class="fv" [class.fv--muted]="!task.estimate">{{ task.estimate || 'Non défini' }}</span>
                }
              </div>
            </div>

            <div class="sep"></div>

            <div class="block">
              <div class="block__t">Description</div>
              @if (editMode()) {
                <textarea class="desc desc--edit" rows="3" [value]="eDesc()" (input)="eDesc.set($any($event.target).value)" placeholder="Ajoutez une description…"></textarea>
              } @else {
                <div class="desc desc--ro">{{ task.desc || 'Aucune description.' }}</div>
              }
            </div>

            <div class="block">
              <div class="block__h"><span class="block__t">Sous-tâches</span><span class="count">{{ subtasks().length }}</span></div>
              <div class="subs">
                @for (s of subtasks(); track s.id) {
                  <div class="sub" [class.sub--done]="s.done" (click)="toggleSub(s)">
                    <span class="cb" [class.cb--on]="s.done">
                      @if (s.done) { <app-icon name="check" [size]="11" [stroke]="3" /> }
                    </span>
                    <span class="sub__n">{{ s.title }}</span>
                    @if (!readonly) {
                      <button class="sub__del" (click)="removeSub(s.id, $event)"><app-icon name="trash" [size]="15" /></button>
                    }
                  </div>
                }
              </div>
              @if (!readonly) {
                @if (adding()) {
                  <div class="addsub">
                    <span class="cb"></span>
                    <input autofocus [value]="draft()" (input)="draft.set($any($event.target).value)" (keydown.enter)="addSub()" placeholder="Nom de la sous-tâche…" />
                    <button class="addsub__ok" (click)="addSub()">Ajouter</button>
                  </div>
                } @else {
                  <button class="addbtn" (click)="adding.set(true)"><app-icon name="plus" [size]="15" />Ajouter une sous-tâche</button>
                }
              }
            </div>

            <div class="block">
              <div class="block__t">Pièces jointes</div>
              <div class="att">
                @for (a of attachments(); track a.id) {
                  <div class="att__c" (click)="download(a)">
                    <span class="att__ic" [style.background]="fileTint(a.name)">{{ fileExt(a.name) }}</span>
                    <div><div class="att__n">{{ a.name }}</div><div class="att__s">{{ sizeOf(a.size) }}</div></div>
                    @if (!readonly) {
                      <button class="att__del" title="Retirer" (click)="removeAttachment(a.id, $event)"><app-icon name="trash" [size]="14" /></button>
                    }
                  </div>
                }
              </div>
              @if (!readonly) {
                <label class="drop">
                  <app-icon name="upload" [size]="20" />Déposez vos fichiers ici ou <span class="link">parcourir</span>
                  <input type="file" hidden multiple (change)="onFilesPicked($event)" />
                </label>
              }
            </div>
          </div>
        </div>

        <!-- RIGHT : comments -->
        <div class="right">
          <div class="rh"><span class="rh__t">Commentaires</span><span class="count">{{ comments().length }}</span>
            <span class="spacer"></span><button class="x" (click)="closed.emit()"><app-icon name="x" [size]="17" /></button></div>
          <div class="thread" #threadEl>
            @for (c of comments(); track c.id) {
              <div class="cm" [class.cm--mine]="c.mine" [class.cm--focus]="c.id === focusedComment()" [attr.data-cid]="c.id">
                <span class="av" [style.background]="c.authorPhotoUrl ? 'transparent' : c.color">
                  @if (c.authorPhotoUrl) {
                    <img class="av__i" [src]="c.authorPhotoUrl" alt="" />
                  } @else { {{ ini(c.author) }} }
                </span>
                <div class="cm__b">
                  <div class="cm__h">
                    <span class="cm__n">{{ c.author }}</span>
                    <span class="cm__t">{{ c.time }}</span>
                    <span class="spacer"></span>
                    @if (c.mine && !readonly) {
                      <button class="cm__del" title="Supprimer" (click)="removeComment(c.id)">
                        <app-icon name="trash" [size]="13" [stroke]="2.2" />
                      </button>
                    }
                  </div>
                  <div class="cm__x">
                    @for (p of c.parts; track $index) {
                      @if (p.type === 't') { <span>{{ p.val }}</span> }
                      @else {
                        <app-mention-chip
                          [tab]="chipTabFor(p.type)"
                          [value]="p.val"
                          (opened)="onChipOpen($event)"
                        />
                      }
                    }
                  </div>
                  @if (c.files.length > 0) {
                    <div class="cm__files">
                      @for (f of c.files; track f.id) {
                        <button class="cm__file" title="Télécharger" (click)="download(f)">
                          <app-icon name="file" [size]="13" />
                          <span class="cm__fn">{{ f.name }}</span>
                          <span class="cm__fs">{{ sizeOf(f.size) }}</span>
                          <app-icon class="cm__dl" name="download" [size]="13" />
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            } @empty {
              @if (commentsLoading()) {
                <div class="cm-load"><span class="cm-load__s"></span><span>Chargement des commentaires…</span></div>
              } @else {
                <div class="cm-empty">Aucun commentaire pour l'instant.</div>
              }
            }
          </div>
          @if (!readonly) {
            <div class="composer">
              <app-comment-composer
                [placeholder]="'Commentez, mentionnez avec @, @@, @@@ ou #…'"
                [sending]="commentSending()"
                (submitted)="onNewComment($event)"
              />
            </div>
          }
        </div>
       </div>
      </div>
    </div>
  `,
  styleUrl: './fiche-tache.component.scss',
})
export class FicheTacheComponent implements OnChanges {
  @Input({ required: true }) task!: TaskCard & { proj?: string };
  @Input() readonly = false;
  /** When true, shows a loading overlay over the modal (used when switching tasks via a mention). */
  @Input() loading = false;
  @Output() closed = new EventEmitter<void>();
  /** Emitted when the user clicks a `@@task` mention in a comment. */
  @Output() openTask = new EventEmitter<string>();
  /** Emitted (with the task id) after the task has been deleted from its detail. */
  @Output() deleted = new EventEmitter<string>();
  /** Émis après enregistrement d'une édition — le board se met à jour sans rechargement. */
  @Output() updated = new EventEmitter<TaskCard>();

  private router = inject(Router);
  protected bus = inject(ShellBus);
  private tasksSvc = inject(TasksService);
  private membersSvc = inject(MembersService);
  private projectsSvc = inject(ProjectsService);
  private session = inject(SessionService);
  private filesSvc = inject(FilesHttpService);
  private toast = inject(ToastService);

  @ViewChild('threadEl') private threadEl?: ElementRef<HTMLDivElement>;

  protected subtasks = signal<SubRow[]>([]);
  protected comments = signal<CommentRow[]>([]);
  /** Chargement du fil de commentaires (spinner tant qu'il n'est pas revenu). */
  protected commentsLoading = signal(false);
  /** Envoi de commentaire en cours (spinner du composeur). */
  protected commentSending = signal(false);
  /** Commentaire à cibler (notification de mention de commentaire) — défilement + surbrillance. */
  private _anchorComment = signal<string | null>(null);
  @Input() set anchorCommentId(v: string | null | undefined) { this._anchorComment.set(v ?? null); }
  protected focusedComment = signal<string | null>(null);
  protected attachments = signal<AttachedRef[]>([]);
  adding = signal(false);
  draft = signal('');

  // ── Mode édition ────────────────────────────────────────────────────────────
  readonly PRIORITIES = PRIORITIES;
  protected editMode = signal(false);
  protected saving = signal(false);
  /** Statuts (colonnes) et membres du projet — chargés à l'entrée en édition. */
  protected columns = signal<KanbanColumn[]>([]);
  protected directory = signal<Member[]>([]);
  /** userId des membres RÉELS du projet (assignables) — chargés au (ré)ouverture. */
  protected projMemberIds = signal<string[]>([]);
  /** Équipes RÉELLES du projet (assignables). */
  protected projTeams = signal<{ id: string; name: string; color: string }[]>([]);
  /** Membres du projet résolus en noms via l'annuaire (réactif). */
  protected projMembers = computed<{ id: string; name: string }[]>(() => {
    const dir = this.directory();
    return this.projMemberIds().map(id => ({
      id, name: dir.find(m => m.userId === id)?.name ?? 'Membre',
    }));
  });
  // Valeurs en cours d'édition.
  protected eTitle = signal('');
  protected eDesc = signal('');
  protected eStatusId = signal('');
  /**
   * Assigné en cours d'édition, encodé « TYPE:id » (`USER:<uuid>` ou `TEAM:<uuid>`),
   * ou chaîne vide = non assigné. Permet un seul <select> mixant membres et équipes.
   */
  protected eAssigneeKey = signal('');
  protected eStart = signal('');
  protected eDue = signal('');
  protected ePriority = signal<TaskPriority>('MEDIUM');
  protected eEstimate = signal('');
  /** Message d'erreur affiché sous le champ Statut si la transition est refusée (FSM). */
  protected statusError = signal('');

  // ── Menus déroulants du mode édition (mêmes interactions que le modal de création) ──
  /** Champ dont le menu est ouvert (`status` | `assignee` | `start` | `due` | `priority` | `estimate`). */
  protected field = signal<string | null>(null);
  /** Onglet du sélecteur d'assigné : personne ou équipe. */
  protected assignMode = signal<'user' | 'team'>('user');
  /** Filtre de recherche du sélecteur d'assigné. */
  protected assigneeQuery = signal('');

  /** Statut sélectionné en édition (colonne courante du <select> d'origine). */
  protected eStatusCol = computed(() => this.columns().find(c => c.id === this.eStatusId()));
  /** Métadonnées de la priorité sélectionnée en édition. */
  protected ePrioMeta = computed(() => PRIORITIES.find(p => p.value === this.ePriority()));
  /** Décodage « TYPE:id » de l'assigné en cours d'édition. */
  private eAssigneeParts = computed<{ type: string; id: string } | null>(() => {
    const k = this.eAssigneeKey();
    if (!k) return null;
    const i = k.indexOf(':');
    return { type: k.slice(0, i), id: k.slice(i + 1) };
  });
  protected editAssigneeIsTeam = computed(() => this.eAssigneeParts()?.type === 'TEAM');
  protected editAssigneeName = computed<string | null>(() => {
    const p = this.eAssigneeParts();
    if (!p) return null;
    if (p.type === 'TEAM') return this.projTeams().find(t => t.id === p.id)?.name ?? 'Équipe';
    if (p.id === this.session.user()?.id) return (this.session.user()?.displayName ?? 'Moi') + ' (moi)';
    return this.projMembers().find(m => m.id === p.id)?.name ?? 'Membre';
  });
  protected editAssigneeColor = computed(() => {
    const p = this.eAssigneeParts();
    if (!p) return '#8E8AA0';
    if (p.type === 'TEAM') return this.projTeams().find(t => t.id === p.id)?.color ?? '#6C70F0';
    return avatarColorFor(p.id);
  });
  protected editAssigneeInitials = computed(() => {
    const n = this.editAssigneeName();
    return n ? this.ini(n) : '';
  });
  /** Membres du projet filtrés par la recherche du sélecteur d'assigné. */
  protected filteredProjMembers = computed(() => {
    const q = this.assigneeQuery().toLowerCase().trim();
    return this.projMembers().filter(m => m.name.toLowerCase().includes(q));
  });

  private loadedTaskId: string | null = null;

  statusBg = computed(() => this.tintFromColor(this.task.tag[1]));
  assigneeColor = computed(() => {
    const id = this.task.assigneeId;
    if (!id) return '#8E8AA0';
    if (this.task.assigneeType === 'TEAM') return this.projTeams().find(t => t.id === id)?.color ?? '#6C70F0';
    return avatarColorFor(id);
  });
  assigneeLabel = computed(() => {
    const id = this.task.assigneeId;
    if (!id) return 'Non assigné';
    if (this.task.assigneeType === 'TEAM') return this.projTeams().find(t => t.id === id)?.name ?? 'Équipe';
    if (id === this.session.user()?.id) return (this.session.user()?.displayName ?? 'Moi') + ' (moi)';
    // Résolution du nom via l'annuaire réel des membres.
    return this.directory().find(m => m.userId === id)?.name ?? 'Assigné';
  });
  /** Vrai si l'assigné courant est une équipe (avatar carré + libellé « Équipe »). */
  assigneeIsTeam = computed(() => this.task.assigneeType === 'TEAM' && !!this.task.assigneeId);
  assigneeInitials = computed(() => this.ini(this.assigneeLabel()));

  constructor() {
    // Ancrage sur un commentaire ciblé (mention) : défile vers lui et l'encadre
    // une fois le fil peint.
    effect(() => {
      const cid = this._anchorComment();
      if (!cid || !this.comments().length) return;
      this.focusedComment.set(cid);
      requestAnimationFrame(() =>
        this.threadEl?.nativeElement.querySelector(`[data-cid="${cid}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    });
    effect(() => {
      this.comments();
      requestAnimationFrame(() => this.scrollThreadToBottom());
    });
    // Annuaire chargé une fois — sert à résoudre le nom de l'assigné (affichage + édition).
    this.membersSvc.directory().subscribe(list => {
      this.directory.set(list);
      // L'annuaire peut arriver après les commentaires : on re-résout les auteurs.
      const meId = this.session.user()?.id;
      this.comments.update(rows => rows.map(r => r.authorUserId === meId ? r : ({
        ...r,
        author: list.find(m => m.userId === r.authorUserId)?.name ?? r.author,
      })));
    });
  }

  // ── Mode édition ────────────────────────────────────────────────────────────
  /** Passe la fiche en édition : initialise les champs + charge les statuts du projet. */
  enterEdit(): void {
    if (this.readonly) return;
    this.statusError.set('');
    this.eTitle.set(this.task.title);
    this.eDesc.set(this.task.desc ?? '');
    this.eStatusId.set(this.task.statusId);
    // Préremplit l'assigné courant (membre OU équipe) dans le sélecteur mixte.
    this.eAssigneeKey.set(this.task.assigneeId ? `${this.task.assigneeType ?? 'USER'}:${this.task.assigneeId}` : '');
    // `<input type="date">` exige exactement `yyyy-MM-dd` : on tronque une éventuelle
    // partie horaire (sinon le champ resterait vide alors que la date existe).
    this.eStart.set((this.task.startDate ?? '').slice(0, 10));
    this.eDue.set((this.task.dueDate ?? '').slice(0, 10));
    this.ePriority.set(this.task.priority);
    this.eEstimate.set(this.task.estimate ?? '');
    // Colonnes du projet (sélecteur de statut).
    this.tasksSvc.loadBoard(this.task.projectId).subscribe(b => this.columns.set(b.columns));
    this.editMode.set(true);
  }

  cancelEdit(): void { this.editMode.set(false); this.field.set(null); }

  // ── Interactions des menus déroulants (édition) ──────────────────────────────
  /** Ouvre/ferme le menu d'un champ ; réinitialise la recherche d'assigné. */
  openField(k: string): void {
    this.field.set(this.field() === k ? null : k);
    this.assigneeQuery.set('');
    if (k === 'assignee' && this.field() === 'assignee') {
      // Positionne l'onglet du sélecteur sur le type déjà assigné.
      this.assignMode.set(this.editAssigneeIsTeam() ? 'team' : 'user');
    }
  }
  closeField(): void { this.field.set(null); }
  pickStatus(id: string): void { this.eStatusId.set(id); this.statusError.set(''); this.field.set(null); }
  /** Sélectionne un assigné (clé « TYPE:id »), ou vide pour retirer l'assignation. */
  pickAssignee(key: string): void {
    this.eAssigneeKey.set(this.eAssigneeKey() === key ? '' : key);
    this.field.set(null);
    this.assigneeQuery.set('');
  }
  pickPriority(v: TaskPriority): void { this.ePriority.set(v); this.field.set(null); }
  /** Teinte de fond d'une pastille de statut (exposée au template). */
  tint(hex?: string): string { return this.tintFromColor(hex ?? ''); }
  /** Couleur d'avatar déterministe d'un membre (par userId). */
  memberColorId(id: string): string { return avatarColorFor(id); }

  /**
   * Enregistre toutes les modifications : champs de la tâche (updateTask) + statut
   * (changeStatus si modifié). Toast de confirmation, la fiche reste ouverte.
   */
  saveEdit(): void {
    if (this.readonly || this.saving()) return;
    const title = this.eTitle().trim();
    if (!title) { this.toast.show({ message: 'Le nom de la tâche est obligatoire.', icon: 'warning' }); return; }
    this.saving.set(true);
    this.statusError.set('');

    const payload: UpdateTaskPayload = {
      title,
      description: this.eDesc(),
      priority: this.ePriority(),
      startDate: this.eStart() || undefined,
      dueDate: this.eDue() || undefined,
      estimate: this.eEstimate() || undefined,
    };
    // Assigné : membre, équipe, ou retrait explicite (clé « TYPE:id » ou vide).
    const key = this.eAssigneeKey();
    if (key) {
      const sep = key.indexOf(':');
      payload.assigneeType = key.slice(0, sep) === 'TEAM' ? 'TEAM' : 'USER';
      payload.assigneeId = key.slice(sep + 1);
    } else {
      payload.clearAssignee = true;
    }

    const statusChanged = !!this.eStatusId() && this.eStatusId() !== this.task.statusId;
    this.tasksSvc.updateTask(this.task.id, payload).subscribe({
      next: card => {
        this.task = { ...this.task, ...card };
        if (!statusChanged) { this.finishSave(); return; }
        // Le statut est contrôlé par la FSM (silencieux : on gère l'erreur inline).
        this.tasksSvc.changeStatus(this.task.id, this.eStatusId(), true).subscribe({
          next: fresh => { this.task = { ...this.task, ...fresh }; this.finishSave(); },
          error: (err: HttpErrorResponse) => {
            // Les autres champs SONT enregistrés ; seul le changement de statut a été refusé.
            this.saving.set(false);
            this.eStatusId.set(this.task.statusId); // rétablit le statut réel dans le sélecteur
            this.statusError.set(extractApiError(err, "Ce changement de statut n'est pas autorisé par le workflow."));
            this.toast.show({ message: 'Modifications enregistrées (hors statut, non autorisé)' });
            this.updated.emit(this.task); // le board reflète les champs sauvés
          },
        });
      },
      error: () => this.saving.set(false),
    });
  }

  private finishSave(): void {
    this.saving.set(false);
    this.editMode.set(false);
    this.statusError.set('');
    this.toast.show({ message: 'Modifications enregistrées avec succès' });
    this.updated.emit(this.task); // met à jour le board sans rechargement
  }

  ngOnChanges(): void {
    // Recharge le détail (sous-tâches / commentaires / PJ) au (ré)ouverture ou
    // au changement de tâche (mention → switchTask remplace `task`).
    if (this.task && this.task.id !== this.loadedTaskId) {
      this.loadedTaskId = this.task.id;
      this.reload();
    }
  }

  private reload(): void {
    const id = this.task.id;
    this.tasksSvc.subtasks(id).subscribe(list =>
      this.subtasks.set(list.map(s => ({ id: s.id, title: s.title, done: s.done }))));
    this.tasksSvc.attachments(id).subscribe(list => this.attachments.set(list));
    this.comments.set([]);
    this.commentsLoading.set(true);
    this.tasksSvc.comments(id).subscribe({
      next: list => { this.comments.set(list.map(c => this.toRow(c))); this.commentsLoading.set(false); },
      error: () => this.commentsLoading.set(false),
    });
    // Précharge les statuts du projet pour que le sélecteur soit prérempli
    // dès l'entrée en édition (les <option> doivent exister avant le [value]).
    this.tasksSvc.loadBoard(this.task.projectId).subscribe(b => this.columns.set(b.columns));
    // Précharge les membres + équipes RÉELS du projet : nécessaires à l'affichage
    // (résolution d'une équipe assignée) ET au sélecteur d'assigné en édition.
    this.projectsSvc.members(this.task.projectId).subscribe(list => this.projMemberIds.set(list.map(m => m.userId)));
    this.projectsSvc.teams(this.task.projectId).subscribe(list =>
      this.projTeams.set(list.map(t => ({ id: t.id, name: t.name, color: t.color ?? '#6C70F0' }))));
  }

  private toRow(c: TaskComment): CommentRow {
    const mine = c.authorUserId === this.session.user()?.id;
    const member = this.directory().find(m => m.userId === c.authorUserId);
    return {
      id: c.id,
      // Nom réel de l'auteur, résolu via l'annuaire du workspace.
      author: mine
        ? (this.session.user()?.displayName ?? 'Moi')
        : (member?.name ?? 'Membre'),
      authorUserId: c.authorUserId,
      // L'annuaire porte la photo (il contient aussi l'utilisateur courant).
      authorPhotoUrl: member?.photoUrl,
      color: avatarColorFor(c.authorUserId),
      time: this.fmtDateTime(c.createdAt),
      parts: parseRichText(c.content),
      files: c.attachments,
      mine,
    };
  }

  private scrollThreadToBottom(): void {
    const el = this.threadEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  deleteTask(): void {
    if (this.readonly) return;
    this.deleted.emit(this.task.id);
  }

  // ── Sous-tâches ─────────────────────────────────────────────────────────────
  addSub(): void {
    const v = this.draft().trim();
    if (!v) { this.adding.set(false); return; }
    this.tasksSvc.addSubtask(this.task.id, v).subscribe(s => {
      this.subtasks.update(l => [...l, { id: s.id, title: s.title, done: s.done }]);
      this.draft.set('');
      this.adding.set(false);
    });
  }
  removeSub(id: string, ev: Event): void {
    ev.stopPropagation();
    const snapshot = this.subtasks();
    this.subtasks.update(l => l.filter(s => s.id !== id));
    this.tasksSvc.removeSubtask(this.task.id, id).subscribe({ error: () => this.subtasks.set(snapshot) });
  }
  toggleSub(s: SubRow): void {
    if (this.readonly) return;
    const done = !s.done;
    this.subtasks.update(l => l.map(x => x.id === s.id ? { ...x, done } : x));
    this.tasksSvc.setSubtaskDone(this.task.id, s.id, done)
      .subscribe({ error: () => this.subtasks.update(l => l.map(x => x.id === s.id ? { ...x, done: !done } : x)) });
  }

  // ── Pièces jointes de la tâche ──────────────────────────────────────────────
  onFilesPicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) {
      this.tasksSvc.addAttachment(this.task.id, this.task.projectId, file)
        .subscribe(a => this.attachments.update(l => [...l, a]));
    }
  }
  removeAttachment(id: string, ev: Event): void {
    ev.stopPropagation();
    const snapshot = this.attachments();
    this.attachments.update(l => l.filter(a => a.id !== id));
    this.tasksSvc.removeAttachment(this.task.id, id).subscribe({ error: () => this.attachments.set(snapshot) });
  }

  // ── Commentaires ────────────────────────────────────────────────────────────
  onNewComment(payload: { parts: RichPart[]; files: { file?: File }[]; text: string }): void {
    const files = payload.files.map(f => f.file).filter((f): f is File => !!f);
    // Mentions de personnes résolues en userId via l'annuaire (déjà chargé) → le
    // serveur notifie les mentionnés (hors moi) et alimente « Mentions reçues ».
    const mentions: MentionRef[] = payload.parts
      .filter(p => p.type === 'person')
      .map((p): MentionRef | null => {
        const m = this.directory().find(x => x.name === p.val)
          ?? this.directory().find(x => x.name.toLowerCase().startsWith(p.val.toLowerCase()));
        return m?.userId ? { type: 'USER', targetId: m.userId, targetText: p.val } : null;
      })
      .filter((m): m is MentionRef => m !== null);
    // Affichage OPTIMISTE : le commentaire apparaît immédiatement (le serveur peut
    // être lent sous charge) ; il est réconcilié avec l'id réel à la réponse, ou
    // retiré en cas d'échec. Supprime la latence perçue « le commentaire arrive tard ».
    const tempId = 'tmp-' + Date.now();
    this.comments.update(list => [...list, this.toRow({
      id: tempId, taskId: this.task.id, authorUserId: this.session.user()?.id ?? 'me',
      content: payload.text, createdAt: new Date().toISOString(), attachments: [],
    })]);
    this.commentSending.set(true);
    this.tasksSvc.addComment(this.task.id, this.task.projectId, payload.text, files, mentions)
      .subscribe({
        next: c => {
          this.comments.update(list => list.map(r => r.id === tempId ? this.toRow(c) : r));
          this.commentSending.set(false);
        },
        error: () => {
          this.comments.update(list => list.filter(r => r.id !== tempId));
          this.commentSending.set(false);
          this.toast.show({ message: "L'envoi du commentaire a échoué.", icon: 'warning' });
        },
      });
  }
  removeComment(id: string): void {
    const snapshot = this.comments();
    this.comments.update(list => list.filter(c => c.id !== id));
    this.tasksSvc.removeComment(this.task.id, id).subscribe({ error: () => this.comments.set(snapshot) });
  }

  download(f: AttachedRef): void {
    if (!f.url || f.url === '#') return;
    this.filesSvc.download(f.url).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = f.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

  sizeOf(bytes?: number): string {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1).replace('.0', '') + ' Mo';
  }

  fmtDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  fmtDateTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' +
           d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  fileExt(name: string): string {
    const ext = name.split('.').pop() ?? '';
    return ext.slice(0, 3).toUpperCase() || 'FIC';
  }
  fileTint(name: string): string { return avatarColorFor(this.fileExt(name)); }

  private tintFromColor(hex: string): string {
    const m = /^#([0-9a-f]{6})$/i.exec(hex ?? '');
    if (!m) return 'rgba(0,0,0,.06)';
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, .16)`;
  }

  chipTabFor(type: 'person' | 'task' | 'doc' | 'channel'): 'personnes' | 'taches' | 'documents' | 'canaux' {
    return chipTabForUtil(type);
  }

  onChipOpen(ev: MentionChipEvent): void {
    switch (ev.type) {
      case 'person':   this.bus.openProfile(ev.name); break;
      case 'document': this.bus.openDocument(ev.name); break;
      case 'task':     this.openTask.emit(ev.id); break;
      case 'channel':
        this.closed.emit();
        this.router.navigate(['/app/canaux', ev.slug]);
        break;
    }
  }
}
