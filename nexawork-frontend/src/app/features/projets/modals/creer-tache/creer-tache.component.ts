import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnInit,
  Output, ViewChild, computed, inject, signal,
} from '@angular/core';
import { forkJoin } from 'rxjs';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { TasksService } from '@core/services/tasks.service';
import { ToastService } from '@core/services/toast.service';
import { ProjectsService } from '@core/services/projects.service';
import { MembersService } from '@core/services/members.service';
import { SessionService } from '@core/services/session.service';
import { avatarColorFor } from '@core/util/ui.util';
import { CreateTaskPayload, KanbanColumn, TaskCard, TaskPriority } from '@core/models/task.models';
import { tintOf } from '@core/util/ui.util';

// ── Data ────────────────────────────────────────────────────────────────────

const PRIOS: { name: string; color: string; value: TaskPriority }[] = [
  { name: 'Basse',   color: '#2BB673', value: 'LOW' },
  { name: 'Moyenne', color: '#E89A2C', value: 'MEDIUM' },
  { name: 'Haute',   color: '#F5564E', value: 'HIGH' },
  { name: 'Urgente', color: '#E0497B', value: 'URGENT' },
];

const EST_OPTIONS = ['0,5 h', '1 h', '2 h', '4 h', '1 j', '2 j', '3 j', '1 sem'];

/** Personne assignable (membre réel du projet). */
interface AssignableMember { id: string; name: string; c: string; }
/** Équipe assignable (équipe réelle du projet). */
interface AssignableTeam { id: string; name: string; c: string; }

// raw SVG paths used in field labels (not in the icon registry)
const IC_STATUS = '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none"/>';
const IC_USER   = '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/>';

@Component({
  selector: 'app-creer-tache',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
<!-- ── Overlay ─────────────────────────────────────────────────────────── -->
<div class="ov" (click)="closed.emit()">

  <!-- ── Card ──────────────────────────────────────────────────────────── -->
  <div class="card" (click)="$event.stopPropagation(); field.set(null)">

    <!-- ── Main area ──────────────────────────────────────────────────── -->
    <div class="main">
      <div class="left">

        <!-- Header -------------------------------------------------------- -->
        <div class="lhd">
          <div class="bc">
            <span class="bc__pill">
              <app-icon name="projects" [size]="14" />Projets
            </span>
            <span class="bc__sep">/</span>
            <span class="bc__proj">{{ projectName }}</span>
            @if (column) {
              <span class="bc__sep">/</span>
              <span class="bc__col">{{ column }}</span>
            }
          </div>
          <span style="flex:1"></span>
          <span class="new-pill">Nouvelle tâche</span>
          <button class="x-btn" (click)="closed.emit()" title="Fermer">
            <app-icon name="x" [size]="17" />
          </button>
        </div>

        <!-- Scrollable body ----------------------------------------------- -->
        <div class="lsc">

          <!-- Title -->
          <input #titleInput class="ttl" placeholder="Nom de la tâche *"
                 [value]="title()" (input)="title.set($any($event.target).value)" />

          <!-- ── Fields ─────────────────────────────────────────────────── -->
          <div class="fields">

            <!-- Statut -->
            <div class="frow">
              <div class="fl"><app-icon [path]="IC_STATUS" [size]="17" /><span>Statut</span></div>
              <div class="fv">
                <div class="fw">
                  <button class="st-btn"
                          [style.background]="tint(curStatus()?.color)"
                          [style.color]="curStatus()?.color"
                          [style.border-color]="field()==='status' ? '#5B5FE9' : 'transparent'"
                          (click)="$event.stopPropagation(); openField('status')">
                    <span class="st-dot" [style.background]="curStatus()?.color"></span>
                    {{ curStatus()?.name }}
                    <app-icon name="chevronDown" [size]="13" [stroke]="2.4" />
                  </button>
                  @if (field() === 'status') {
                    <div class="dd" style="width:196px" (click)="$event.stopPropagation()">
                      @for (s of columns; track s.id) {
                        <button class="dd__i" [class.dd__i--sel]="s.id === statusId()"
                                (click)="statusId.set(s.id); field.set(null)">
                          <span class="st-dot" [style.background]="s.color" style="flex:none"></span>
                          <span style="flex:1">{{ s.name }}</span>
                          @if (s.id === statusId()) {
                            <app-icon name="checkBig" [size]="15" style="color:#5B5FE9;display:flex" />
                          }
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Assignés -->
            <div class="frow">
              <div class="fl"><app-icon [path]="IC_USER" [size]="17" /><span>Assignés<i class="req">*</i></span></div>
              <div class="fv">
                <div class="fw">
                  @if (assignee()) {
                    <button class="val-btn" [class.val-btn--open]="field()==='assignee'"
                            (click)="$event.stopPropagation(); openField('assignee')">
                      @if (assigneeType() === 'team') {
                        <span class="av av--sq" [style.background]="teamColor(assignee()!)">{{ assignee()![0] }}</span>
                      } @else {
                        <span class="av" [style.background]="memberColor(assignee()!)">{{ ini(assignee()!) }}</span>
                      }
                      <span class="av-name">{{ assignee() }}{{ assigneeType() === 'user' && isMe(assigneeId() ?? '') ? ' (moi)' : '' }}</span>
                      @if (assigneeType() === 'team') {
                        <span class="team-tag">Équipe</span>
                      }
                    </button>
                  } @else {
                    <button class="ghost-btn" [class.ghost-btn--open]="field()==='assignee'"
                            (click)="$event.stopPropagation(); openField('assignee')">
                      <app-icon name="userPlus" [size]="15" /><span>Assigner</span>
                    </button>
                  }
                  @if (field() === 'assignee') {
                    <div class="dd" style="width:286px" (click)="$event.stopPropagation()">
                      <button class="mode-toggle"
                              (click)="assignMode.set(assignMode()==='team' ? 'user' : 'team')">
                        <app-icon [name]="assignMode()==='team' ? 'user' : 'teams'" [size]="16" />
                        {{ assignMode()==='team' ? 'Assigner à une personne' : 'Assigner à une équipe' }}
                      </button>
                      <div class="dd__sep"></div>
                      @if (assignMode() === 'user') {
                        <input class="dd__search" autofocus placeholder="Rechercher une personne…"
                               [value]="assigneeQuery()"
                               (click)="$event.stopPropagation()"
                               (input)="assigneeQuery.set($any($event.target).value)" />
                        @if (filteredMembers().length) {
                          @for (m of filteredMembers(); track m.id) {
                            <button class="dd__i"
                                    [class.dd__i--sel]="assigneeType()==='user' && assigneeId()===m.id"
                                    (click)="selectAssignee(m.id, m.name, 'user')">
                              <span class="av sm" [style.background]="m.c">{{ ini(m.name) }}</span>
                              <span class="dd__name">{{ m.name }}{{ isMe(m.id) ? ' (moi)' : '' }}</span>
                            </button>
                          }
                        } @else {
                          <div class="dd__empty">Aucun membre dans ce projet. Ajoutez des collaborateurs depuis l'onglet Équipes.</div>
                        }
                      } @else {
                        <div class="dd__lbl">Équipes du projet</div>
                        @for (t of teams(); track t.id) {
                          <button class="dd__i"
                                  [class.dd__i--sel]="assigneeType()==='team' && assigneeId()===t.id"
                                  (click)="selectAssignee(t.id, t.name, 'team')">
                            <span class="av av--sq sm" [style.background]="t.c">{{ t.name[0] }}</span>
                            <span class="dd__name">{{ t.name }}</span>
                          </button>
                        } @empty {
                          <div class="dd__empty">Aucune équipe dans ce projet.</div>
                        }
                      }
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Date de début -->
            <div class="frow">
              <div class="fl"><app-icon name="calendar" [size]="17" /><span>Date de début<i class="req">*</i></span></div>
              <div class="fv">
                <div class="fw">
                  @if (dateDebut()) {
                    <button class="val-btn" [class.val-btn--open]="field()==='dateDebut'"
                            (click)="$event.stopPropagation(); openField('dateDebut')">
                      {{ fmtDate(dateDebut()) }}
                    </button>
                  } @else {
                    <button class="ghost-btn" [class.ghost-btn--open]="field()==='dateDebut'"
                            (click)="$event.stopPropagation(); openField('dateDebut')">
                      <app-icon name="plus" [size]="14" /><span>Ajouter</span>
                    </button>
                  }
                  @if (field() === 'dateDebut') {
                    <div class="dd" style="width:230px" (click)="$event.stopPropagation()">
                      <input type="date" class="dd__date" autofocus [value]="dateDebut()"
                             (click)="$event.stopPropagation()"
                             (change)="dateDebut.set($any($event.target).value)" />
                      @if (dateDebut()) {
                        <button class="dd__clear" (click)="dateDebut.set(''); field.set(null)">Effacer</button>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Date de fin -->
            <div class="frow">
              <div class="fl"><app-icon name="calendar" [size]="17" /><span>Date de fin<i class="req">*</i></span></div>
              <div class="fv">
                <div class="fw">
                  @if (dateFin()) {
                    <button class="val-btn" [class.val-btn--open]="field()==='dateFin'"
                            (click)="$event.stopPropagation(); openField('dateFin')">
                      {{ fmtDate(dateFin()) }}
                    </button>
                  } @else {
                    <button class="ghost-btn" [class.ghost-btn--open]="field()==='dateFin'"
                            (click)="$event.stopPropagation(); openField('dateFin')">
                      <app-icon name="plus" [size]="14" /><span>Ajouter</span>
                    </button>
                  }
                  @if (field() === 'dateFin') {
                    <div class="dd" style="width:230px" (click)="$event.stopPropagation()">
                      <input type="date" class="dd__date" autofocus [value]="dateFin()"
                             (click)="$event.stopPropagation()"
                             (change)="dateFin.set($any($event.target).value)" />
                      @if (dateFin()) {
                        <button class="dd__clear" (click)="dateFin.set(''); field.set(null)">Effacer</button>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Priorité -->
            <div class="frow">
              <div class="fl"><app-icon name="flag" [size]="17" /><span>Priorité<i class="req">*</i></span></div>
              <div class="fv">
                <div class="fw">
                  @if (curPrio(); as p) {
                    <button class="val-btn" [class.val-btn--open]="field()==='priority'"
                            (click)="$event.stopPropagation(); openField('priority')">
                      <span class="p-dot" [style.background]="p.color"></span>
                      <span [style.color]="p.color">{{ p.name }}</span>
                    </button>
                  } @else {
                    <button class="ghost-btn" [class.ghost-btn--open]="field()==='priority'"
                            (click)="$event.stopPropagation(); openField('priority')">
                      <app-icon name="flag" [size]="15" /><span>Définir</span>
                    </button>
                  }
                  @if (field() === 'priority') {
                    <div class="dd" style="width:190px" (click)="$event.stopPropagation()">
                      @for (p of PRIOS; track p.name) {
                        <button class="dd__i" [class.dd__i--sel]="priority() === p.name"
                                (click)="togglePriority(p.name)">
                          <span class="p-dot p-dot--sq" [style.background]="p.color" style="flex:none"></span>
                          <span class="dd__name">{{ p.name }}</span>
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Temps estimé -->
            <div class="frow">
              <div class="fl"><app-icon name="clockEst" [size]="17" /><span>Temps estimé</span></div>
              <div class="fv">
                <div class="fw">
                  @if (estimate()) {
                    <button class="val-btn" [class.val-btn--open]="field()==='estimate'"
                            (click)="$event.stopPropagation(); openField('estimate')">
                      {{ estimate() }}
                    </button>
                  } @else {
                    <button class="ghost-btn" [class.ghost-btn--open]="field()==='estimate'"
                            (click)="$event.stopPropagation(); openField('estimate')">
                      <app-icon name="plus" [size]="14" /><span>Ajouter</span>
                    </button>
                  }
                  @if (field() === 'estimate') {
                    <div class="dd" style="width:230px" (click)="$event.stopPropagation()">
                      <input class="dd__est" autofocus [value]="estimate() || ''"
                             placeholder="Ex. 3 h, 2 j…"
                             (click)="$event.stopPropagation()"
                             (input)="estimate.set($any($event.target).value || null)"
                             (keydown.enter)="field.set(null)" />
                      <div class="est-chips">
                        @for (o of EST_OPTIONS; track o) {
                          <button class="est-chip" (click)="estimate.set(o); field.set(null)">{{ o }}</button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

          </div><!-- /fields -->

          <!-- Séparateur -->
          <div class="sep1"></div>

          <!-- Description -->
          <div class="section">
            <div class="sec__h">Description</div>
            <textarea class="desc-ta" rows="3" placeholder="Ajoutez une description…"
                      [value]="desc()" (input)="desc.set($any($event.target).value)"></textarea>
          </div>

          <!-- Sous-tâches -->
          <div class="section">
            <div class="sec__hrow">
              <span class="sec__h">Sous-tâches</span>
              @if (subs().length) {
                <span class="sub-count">{{ subs().length }}</span>
              }
            </div>
            @if (subs().length) {
              <div class="sub-list">
                @for (s of subs(); track $index; let i = $index) {
                  <div class="sub-item" [class.sub-item--first]="i === 0">
                    <span class="sub-cb"></span>
                    <span class="sub-name">{{ s }}</span>
                    <button class="sub-rm" (click)="removeSub(i)" title="Retirer">
                      <app-icon name="trash" [size]="15" />
                    </button>
                  </div>
                }
              </div>
            }
            @if (subAdding()) {
              <div class="sub-addf">
                <span class="sub-cb"></span>
                <input class="sub-input" autofocus placeholder="Nom de la sous-tâche…"
                       [value]="subDraft()"
                       (input)="subDraft.set($any($event.target).value)"
                       (keydown.enter)="submitSub()"
                       (keydown.escape)="subAdding.set(false); subDraft.set('')" />
                <button class="sub-ok" (click)="submitSub()">Ajouter</button>
                <button class="sub-cx" (click)="subAdding.set(false); subDraft.set('')" title="Fermer">
                  <app-icon name="x" [size]="15" />
                </button>
              </div>
            } @else {
              <button class="add-dash" (click)="subAdding.set(true); subDraft.set('')">
                <app-icon name="plus" [size]="15" />
                <span>Ajouter une sous-tâche</span>
              </button>
            }
          </div>

          <!-- Pièces jointes -->
          <div class="section">
            <div class="sec__h">Pièces jointes</div>
            @if (attachedFiles().length) {
              <div class="att-list">
                @for (f of attachedFiles(); track $index; let i = $index) {
                  <div class="att-item">
                    <span class="att-ic">{{ fileExt(f.name) }}</span>
                    <div class="att-meta"><span class="att-nm">{{ f.name }}</span><span class="att-sz">{{ sizeOf(f.size) }}</span></div>
                    <button class="att-rm" (click)="removeFile(i)" title="Retirer"><app-icon name="trash" [size]="15" /></button>
                  </div>
                }
              </div>
            }
            <label class="browse">
              <app-icon name="upload" [size]="16" />
              <span>Parcourir</span>
              <input type="file" hidden multiple (change)="onFilesPicked($event)" />
            </label>
          </div>

        </div><!-- /lsc -->
      </div><!-- /left -->
    </div><!-- /main -->

    <!-- Footer ------------------------------------------------------------ -->
    <div class="footer">
      <span style="flex:1"></span>
      <button class="ft-ghost" (click)="closed.emit()">Annuler</button>
      <button class="ft-primary" [disabled]="!canCreate() || busy()" (click)="create()">
        <app-icon name="plus" [size]="16" />{{ busy() ? "Création…" : "Créer la tâche" }}
      </button>
    </div>

  </div><!-- /card -->
</div><!-- /overlay -->
  `,
  styles: [`
    /* ── Overlay & card ──────────────────────────────────────────────── */
    .ov {
      position: fixed; inset: 0; z-index: 135;
      background: rgba(22,19,31,.55); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center; padding: 40px;
    }
    .card {
      width: 680px; max-width: 94vw; height: 86vh; max-height: 860px;
      background: #fff; border-radius: 18px;
      box-shadow: 0 30px 90px rgba(20,15,40,.45);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .main { flex: 1; min-height: 0; display: flex; overflow: hidden; }

    /* ── Left panel ─────────────────────────────────────────────────── */
    .left { flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 0; }

    /* Header */
    .lhd {
      flex: none; height: 54px;
      display: flex; align-items: center; gap: 12px; padding: 0 24px;
      border-bottom: 1px solid #F0EEE9; background: #fff;
    }
    .bc { display: flex; align-items: center; gap: 7px; min-width: 0; white-space: nowrap; }
    .bc__pill {
      display: inline-flex; align-items: center; gap: 6px;
      height: 26px; padding: 0 9px; border-radius: 7px;
      background: #F0EEE8; color: #56525c; font-size: 12.5px; font-weight: 600;
    }
    .bc__sep { color: #c4c0b8; }
    .bc__proj { font-size: 12.5px; font-weight: 700; color: #1d1b25; }
    .bc__col  { font-size: 12.5px; color: #86828e; font-weight: 500; }
    .new-pill {
      display: inline-flex; align-items: center; gap: 6px; flex: none;
      height: 26px; padding: 0 10px; border-radius: 7px;
      background: rgba(91,95,233,.1); color: #5B5FE9;
      font-size: 11.5px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase;
    }
    .x-btn {
      width: 30px; height: 30px; flex: none; border: none; border-radius: 8px;
      background: transparent; color: #9b97a3; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .x-btn:hover { background: #F0EEE8; }

    /* Scroll area */
    .lsc {
      flex: 1; min-height: 0;
      overflow-y: auto; overflow-x: hidden;
      padding: 22px 24px 30px;
    }

    /* Title */
    .ttl {
      width: 100%; box-sizing: border-box; border: none; outline: none;
      padding: 0 0 14px; font-family: inherit;
      font-size: 23px; font-weight: 700; letter-spacing: -.02em; color: #1d1b25;
    }

    /* ── Field rows ─────────────────────────────────────────────────── */
    .fields { margin-bottom: 4px; }
    .frow {
      display: flex; align-items: center; gap: 12px;
      min-height: 44px; padding: 9px 0;
    }
    .fl {
      width: 148px; flex: none; display: flex; align-items: center; gap: 10px;
      color: #7a7682; font-size: 13.5px; font-weight: 600;
    }
    .fl app-icon { color: #a8a4af; }
    .fv { flex: 1; min-width: 0; }
    .fw { position: relative; display: inline-block; }

    /* Status button (always shows a value) */
    .st-btn {
      display: inline-flex; align-items: center; gap: 8px;
      height: 32px; padding: 0 12px; border-radius: 8px;
      border: 1px solid transparent; cursor: pointer;
      font-family: inherit; font-size: 12.5px; font-weight: 700;
      letter-spacing: .02em; text-transform: uppercase;
    }
    .st-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }

    /* Ghost button (no value yet) */
    .ghost-btn {
      display: inline-flex; align-items: center; gap: 7px;
      height: 32px; padding: 0 11px; border-radius: 8px;
      border: 1px dashed #D9D6CE; background: transparent;
      color: #7a7682; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .ghost-btn:hover, .ghost-btn--open { background: #F4F2ED; }
    .ghost-btn--open { border-color: #5B5FE9; }

    /* Val button (value set, click to change) */
    .val-btn {
      display: inline-flex; align-items: center; gap: 8px;
      height: 34px; padding: 0 10px; border-radius: 9px;
      border: 1px solid transparent; background: transparent;
      cursor: pointer; font-family: inherit; font-size: 13.5px; font-weight: 600; color: #1d1b25;
    }
    .val-btn:hover, .val-btn--open { background: #F4F2ED; }
    .val-btn--open { border-color: #5B5FE9; }

    /* Avatars in val-btn */
    .av {
      width: 26px; height: 26px; flex: none; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 10.5px; font-weight: 700; color: #fff;
    }
    .av--sq { border-radius: 7px; font-size: 11px; }
    .av.sm  { width: 24px; height: 24px; font-size: 10px; }
    .av-name { font-size: 13.5px; font-weight: 600; color: #1d1b25; }
    .team-tag {
      font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
      color: #9b97a3; background: #EFEDE7; border-radius: 5px; padding: 2px 6px;
    }

    /* Priority dot */
    .p-dot { width: 8px; height: 8px; border-radius: 2px; }
    .p-dot--sq { width: 9px; height: 9px; border-radius: 3px; }

    /* ── Dropdown ──────────────────────────────────────────────────── */
    .dd {
      position: absolute; top: 40px; left: 0; z-index: 20;
      background: #fff; border-radius: 12px;
      border: 1px solid #ECEAE4;
      box-shadow: 0 12px 34px rgba(20,15,40,.18);
      padding: 7px; max-height: 264px; overflow-y: auto;
    }
    .dd__i {
      width: 100%; box-sizing: border-box;
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border: none; border-radius: 8px;
      background: transparent; cursor: pointer; font-family: inherit; text-align: left;
    }
    .dd__i:hover, .dd__i--sel { background: #EFEDE7; }
    .dd__name { flex: 1; font-size: 13px; font-weight: 600; color: #1d1b25; }
    .dd__sep  { height: 1px; background: #ECEAE4; margin: 7px 4px; }
    .dd__lbl  {
      font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
      color: #a9a5b0; padding: 4px 10px 6px;
    }
    .dd__empty { padding: 12px 10px; font-size: 13px; color: #a8a4af; text-align: center; }

    /* Assignee mode toggle */
    .mode-toggle {
      width: 100%; box-sizing: border-box;
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border: none; border-radius: 8px;
      background: rgba(91,95,233,.08); cursor: pointer;
      font-family: inherit; font-size: 13px; font-weight: 600; color: #5B5FE9; text-align: left;
    }
    .mode-toggle:hover { background: rgba(91,95,233,.16); }

    /* Assignee search */
    .dd__search {
      width: 100%; box-sizing: border-box;
      height: 36px; padding: 0 11px; border-radius: 8px;
      border: 1px solid #D9D6CE; font-family: inherit;
      font-size: 13px; color: #1d1b25; margin-bottom: 7px; outline: none;
    }

    /* Date input inside dd */
    .dd__date {
      width: 100%; box-sizing: border-box;
      height: 38px; padding: 0 10px; border-radius: 8px;
      border: 1px solid #D9D6CE; font-family: inherit;
      font-size: 13px; color: #1d1b25;
    }
    .dd__clear {
      margin-top: 7px; width: 100%; height: 32px;
      border: none; border-radius: 8px;
      background: #F4F2ED; color: #86828e;
      font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
    }

    /* Estimate input + chips */
    .dd__est {
      width: 100%; box-sizing: border-box;
      height: 36px; padding: 0 10px; border-radius: 8px;
      border: 1px solid #D9D6CE; font-family: inherit;
      font-size: 13px; color: #1d1b25; margin-bottom: 7px; outline: none;
    }
    .est-chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .est-chip {
      height: 28px; padding: 0 10px;
      border: 1px solid #E6E3DC; border-radius: 7px;
      background: #fff; color: #56525c;
      font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .est-chip:hover { background: #F4F2ED; }

    /* ── Separator & sections ────────────────────────────────────────── */
    .sep1 { height: 1px; background: #F0EEE9; margin: 14px 0 18px; }
    .section { margin-bottom: 20px; }
    .sec__h { font-size: 14px; font-weight: 700; color: #1d1b25; margin-bottom: 12px; }
    .sec__hrow { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
    .sub-count {
      font-size: 11.5px; font-weight: 700; color: #9b97a3;
      background: #E2DFD8; border-radius: 9px; padding: 1px 8px;
    }

    /* Description */
    .desc-ta {
      width: 100%; box-sizing: border-box;
      border: 1px solid #ECEAE4; border-radius: 10px; outline: none;
      resize: vertical; padding: 11px 12px;
      font-family: inherit; font-size: 13.5px; line-height: 1.6; color: #46434e;
      background: #FBFAF7;
    }

    /* Sub-tasks */
    .sub-list {
      background: #fff; border-radius: 12px;
      border: 1px solid #F0EEE9; overflow: hidden;
    }
    .sub-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 15px; border-top: 1px solid #F4F2ED;
    }
    .sub-item--first { border-top: none; }
    .sub-cb {
      width: 18px; height: 18px; flex: none;
      border-radius: 6px; border: 2px solid #d4d0c7;
    }
    .sub-name { flex: 1; font-size: 13.5px; font-weight: 600; color: #1d1b25; }
    .sub-rm {
      width: 28px; height: 28px; flex: none;
      border: none; border-radius: 7px;
      background: transparent; color: #b4b0bb; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .sub-rm:hover { background: #FBE9E7; color: #E0497B; }

    /* Sub-task add row */
    .sub-addf {
      display: flex; align-items: center; gap: 9px; margin-top: 10px;
    }
    .sub-input {
      flex: 1; min-width: 0; height: 36px; padding: 0 12px;
      border-radius: 9px; border: 1px solid #5B5FE9; outline: none;
      font-family: inherit; font-size: 13.5px; color: #1d1b25; background: #fff;
    }
    .sub-ok {
      flex: none; height: 36px; padding: 0 14px;
      border: none; border-radius: 9px;
      background: #5B5FE9; color: #fff;
      font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .sub-cx {
      width: 36px; height: 36px; flex: none;
      border: 1px solid #E6E3DC; border-radius: 9px;
      background: #fff; color: #9b97a3; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .sub-cx:hover { background: #F4F2ED; }

    /* Dashed add button */
    .add-dash {
      margin-top: 10px; display: inline-flex; align-items: center; gap: 7px;
      height: 30px; padding: 0 11px; border-radius: 8px;
      border: 1px dashed #D9D6CE; background: transparent;
      color: #7a7682; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .add-dash:hover { background: #F4F2ED; }

    /* Drop zone */
    .dropzone {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
      padding: 16px; border-radius: 11px;
      border: 1.5px dashed #d4d0c7; background: #FAF9F6;
      color: #9b97a3; cursor: pointer;
      font-size: 13px;
    }
    .dropzone:hover { border-color: #5B5FE9; }
    .dropzone app-icon { color: #b4b0bb; }

    /* Astérisque des champs obligatoires */
    .req { color: #F5564E; font-style: normal; margin-left: 3px; font-weight: 700; }

    /* Bouton « Parcourir » (remplace la zone de glisser-déposer) */
    .browse {
      display: inline-flex; align-items: center; gap: 8px;
      height: 36px; padding: 0 14px; border-radius: 9px;
      border: 1px solid #D9D6CE; background: #fff;
      color: #46434e; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .browse:hover { background: #F4F2ED; border-color: #5B5FE9; color: #5B5FE9; }
    .browse app-icon { color: inherit; }

    /* Selected files (pre-upload) */
    .att-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .att-item {
      display: flex; align-items: center; gap: 11px;
      padding: 9px 11px; border-radius: 10px;
      border: 1px solid #F0EEE9; background: #FBFAF7;
    }
    .att-ic {
      width: 34px; height: 34px; flex: none; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(91,95,233,.1); color: #5B5FE9;
      font-size: 9.5px; font-weight: 800; letter-spacing: .02em;
    }
    .att-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .att-nm { font-size: 13px; font-weight: 600; color: #1d1b25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .att-sz { font-size: 11.5px; color: #9b97a3; }
    .att-rm {
      width: 30px; height: 30px; flex: none; border: none; border-radius: 8px;
      background: transparent; color: #b4b0bb; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .att-rm:hover { background: #FBE9E7; color: #E0497B; }

    /* ── Footer ─────────────────────────────────────────────────────── */
    .footer {
      flex: none; display: flex; align-items: center; gap: 10px;
      padding: 13px 18px; border-top: 1px solid #F0EEE9; background: #fff;
    }
    .ft-ghost {
      height: 40px; padding: 0 18px;
      border: 1px solid #D9D6CE; border-radius: 9px;
      background: #fff; color: #46434e;
      font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
    }
    .ft-ghost:hover { background: #F4F2ED; }
    .ft-primary {
      display: flex; align-items: center; gap: 8px;
      height: 40px; padding: 0 18px; border: none; border-radius: 9px;
      background: #5B5FE9; color: #fff;
      font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
      box-shadow: 0 6px 18px rgba(91,95,233,.3);
    }
    .ft-primary:hover { background: #4D51DC; }
    .ft-primary:disabled { background: #C9C5BD; cursor: not-allowed; box-shadow: none; }
  `],
})
export class CreerTacheComponent implements OnInit, AfterViewInit {
  /** Champ « Nom de la tâche » — reçoit le focus à l'ouverture du modal. */
  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;

  /** Colonnes réelles du projet (statuts) — alimentent le sélecteur de statut. */
  @Input() columns: KanbanColumn[] = [];
  /** Colonne pré-sélectionnée (là où l'utilisateur a cliqué « + »). */
  @Input() initialStatusId: string | null = null;
  @Input() projectId   = '';
  @Input() projectName = '';
  /** Nom de la colonne d'origine — affiché dans le fil d'Ariane. */
  @Input() column      = '';
  @Output() closed  = new EventEmitter<void>();
  @Output() created = new EventEmitter<TaskCard>();

  private tasksSvc = inject(TasksService);
  private toast    = inject(ToastService);
  private projectsSvc = inject(ProjectsService);
  private membersSvc = inject(MembersService);
  private session = inject(SessionService);

  // ── Expose constants to template ────────────────────────────────────────
  readonly PRIOS        = PRIOS;
  readonly EST_OPTIONS  = EST_OPTIONS;
  readonly IC_STATUS    = IC_STATUS;
  readonly IC_USER      = IC_USER;

  /** Membres réels du projet (assignables). */
  members = signal<AssignableMember[]>([]);
  /** Équipes réelles du projet (assignables). */
  teams = signal<AssignableTeam[]>([]);
  /** Id de l'utilisateur courant — pour le suffixe « (moi) ». */
  private meId = computed(() => this.session.user()?.id ?? '');

  // ── State ────────────────────────────────────────────────────────────────
  title        = signal('');
  desc         = signal('');
  field        = signal<string | null>(null);
  statusId     = signal<string | null>(null);
  /** Nom affiché de l'assigné (membre ou équipe). */
  assignee     = signal<string | null>(null);
  /** UUID réel de l'assigné (userId ou teamId) — envoyé au backend. */
  assigneeId   = signal<string | null>(null);
  assigneeType = signal<'user' | 'team' | null>(null);
  assigneeQuery = signal('');
  assignMode   = signal<'user' | 'team'>('user');
  dateDebut    = signal('');
  dateFin      = signal('');
  priority     = signal<string | null>(null);
  estimate     = signal<string | null>(null);
  subs         = signal<string[]>([]);
  subAdding    = signal(false);
  subDraft     = signal('');
  /** Fichiers choisis avant création — téléversés une fois la tâche créée. */
  attachedFiles = signal<File[]>([]);
  busy         = signal(false);

  // ── Computed ─────────────────────────────────────────────────────────────
  curStatus = computed<KanbanColumn | undefined>(() =>
    this.columns.find(c => c.id === this.statusId()) ?? this.columns[0]);
  curPrio   = computed(() => PRIOS.find(p => p.name === this.priority()) ?? null);
  /**
   * Champs obligatoires (§14) : nom, assigné, date de début, date de fin, priorité.
   * Le statut est toujours défini (colonne d'origine).
   */
  canCreate = computed(() =>
    !!this.title().trim()
    && !!this.statusId()
    && !!this.assigneeId()
    && !!this.dateDebut()
    && !!this.dateFin()
    && !!this.priority());
  filteredMembers = computed<AssignableMember[]>(() => {
    const q = this.assigneeQuery().toLowerCase().trim();
    return this.members().filter(m => m.name.toLowerCase().includes(q));
  });

  tint(color: string | undefined): string { return tintOf(color ?? '#8E8AA0'); }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Pré-sélectionne la colonne cliquée, sinon le statut initial du workflow.
    const initial = this.initialStatusId
      ?? this.columns.find(c => c.isInitial)?.id
      ?? this.columns[0]?.id
      ?? null;
    this.statusId.set(initial);

    // Membres et équipes RÉELS du projet (assignables).
    if (this.projectId) {
      forkJoin({
        members: this.projectsSvc.members(this.projectId),
        teams: this.projectsSvc.teams(this.projectId),
        dir: this.membersSvc.directory(),
      }).subscribe(({ members, teams, dir }) => {
        const byId = new Map(dir.filter(m => m.userId).map(m => [m.userId!, m] as const));
        this.members.set(members.map(pm => {
          const m = byId.get(pm.userId);
          return { id: pm.userId, name: m?.name ?? 'Membre', c: m?.color ?? avatarColorFor(pm.userId) };
        }));
        this.teams.set(teams.map(t => ({ id: t.id, name: t.name, c: t.color ?? '#6C70F0' })));
      });
    }
  }

  ngAfterViewInit(): void {
    // Place le curseur dans le champ du nom dès l'ouverture (l'attribut HTML
    // `autofocus` n'agit pas sur un élément inséré dynamiquement par Angular).
    setTimeout(() => this.titleInput?.nativeElement.focus(), 0);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  openField(k: string): void { this.field.set(this.field() === k ? null : k); }

  ini(name: string): string { return name.split(' ').map(w => w[0]).join(''); }

  memberColor(name: string): string { return this.members().find(m => m.name === name)?.c ?? '#5B5FE9'; }
  teamColor(name: string):   string { return this.teams().find(t => t.name === name)?.c   ?? '#5B5FE9'; }
  /** Vrai si l'assigné sélectionné est l'utilisateur courant (suffixe « (moi) »). */
  isMe(id: string): boolean { return id === this.meId(); }

  fmtDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  selectAssignee(id: string, name: string, type: 'user' | 'team'): void {
    const already = this.assigneeType() === type && this.assigneeId() === id;
    this.assignee.set(already ? null : name);
    this.assigneeId.set(already ? null : id);
    this.assigneeType.set(already ? null : type);
    this.field.set(null);
    this.assigneeQuery.set('');
    this.assignMode.set('user');
  }

  togglePriority(name: string): void {
    this.priority.set(this.priority() === name ? null : name);
    this.field.set(null);
  }

  submitSub(): void {
    const v = this.subDraft().trim();
    if (!v) { this.subAdding.set(false); return; }
    this.subs.update(l => [...l, v]);
    this.subDraft.set('');
  }

  removeSub(i: number): void { this.subs.update(l => l.filter((_, j) => j !== i)); }

  // ── Pièces jointes ─────────────────────────────────────────────────────────
  onFilesPicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.addFiles(input.files);
    input.value = ''; // autorise de re-choisir le même fichier
  }
  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.addFiles(ev.dataTransfer?.files ?? null);
  }
  private addFiles(list: FileList | null): void {
    const files = Array.from(list ?? []);
    if (files.length) this.attachedFiles.update(l => [...l, ...files]);
  }
  removeFile(i: number): void { this.attachedFiles.update(l => l.filter((_, j) => j !== i)); }

  /** Extension courte affichée dans la pastille du fichier. */
  fileExt(name: string): string {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop()!.slice(0, 4).toUpperCase() : 'FIC';
  }
  /** Taille lisible d'un fichier. */
  sizeOf(bytes?: number): string {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1_048_576) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / 1_048_576).toFixed(1) + ' Mo';
  }

  create(): void {
    const title = this.title().trim();
    const statusId = this.statusId();
    if (!this.canCreate() || !statusId || this.busy()) return;
    this.busy.set(true);

    const payload: CreateTaskPayload = {
      title,
      description: this.desc().trim() || undefined,
      statusId,
      priority: PRIOS.find(p => p.name === this.priority())?.value,
      startDate: this.dateDebut() || undefined,
      dueDate: this.dateFin() || undefined,
      estimate: this.estimate() || undefined,
      // Assigné réel (membre ou équipe du projet).
      assigneeType: this.assigneeType() === 'team' ? 'TEAM' : 'USER',
      assigneeId: this.assigneeId() ?? undefined,
    };

    this.tasksSvc.createTask(this.projectId, payload).subscribe({
      next: card => {
        // Sous-tâches et pièces jointes se créent après la tâche (besoin de son id).
        const after$ = [
          ...this.subs().map(s => this.tasksSvc.addSubtask(card.id, s)),
          ...this.attachedFiles().map(f => this.tasksSvc.addAttachment(card.id, this.projectId, f)),
        ];
        if (after$.length === 0) { this.finish(card); return; }
        forkJoin(after$).subscribe({ next: () => this.finish(card), error: () => this.finish(card) });
      },
      error: () => this.busy.set(false),
    });
  }

  private finish(card: TaskCard): void {
    this.toast.show({ message: 'Tâche ' + card.taskKey + ' créée' });
    this.created.emit(card);
  }
}
