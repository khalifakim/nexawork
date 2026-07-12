import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { FilterChipComponent, FilterOption } from '@shared/ui/filter-chip/filter-chip.component';
import { DueBucket, KanbanColumn, TaskCard } from '@core/models/task.models';
import { Member } from '@core/models/member.models';
import { MembersService } from '@core/services/members.service';
import { avatarColorFor, tintOf } from '@core/util/ui.util';
import { KanbanStore } from './kanban.store';

@Component({
  selector: 'app-kanban',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, FilterChipComponent],
  template: `
    <div class="board-wrap">
      <!-- filter bar -->
      <div class="fbar">
        <app-filter-chip label="Assigné à" [options]="assigneOpts()" [value]="store.filters().assigne"
                         (valueChange)="store.setFilter('assigne', $event)" />
        <app-filter-chip label="Priorité" [options]="PRIO_OPTS" [value]="store.filters().prio"
                         (valueChange)="store.setFilter('prio', $event)" />
        <app-filter-chip label="Échéance" [options]="ECH_OPTS" [value]="store.filters().ech"
                         (valueChange)="store.setFilter('ech', $any($event))" />
        <span class="spacer"></span>
        @if (!readonly) {
          <button class="add-task" (click)="create.emit('')"><app-icon name="plus" [size]="15" [stroke]="2.2" />Ajouter une tâche</button>
          @if (canManageBoard) {
            <div class="gearwrap">
              <button class="gear" [class.gear--on]="gearOpen()" title="Paramètres du tableau" (click)="gearOpen.set(!gearOpen())"><app-icon name="gear" [size]="17" /></button>
              @if (gearOpen()) {
                <div class="bd" (click)="gearOpen.set(false)"></div>
                <div class="menu" (click)="$event.stopPropagation()">
                  <button class="menu__i" (click)="openStatuses.emit(); gearOpen.set(false)"><app-icon name="list" [size]="16" /><span>Modifier les statuts</span></button>
                  <button class="menu__i" (click)="openWorkflow.emit(); gearOpen.set(false)"><app-icon name="workflow" [size]="16" /><span>Configurer le workflow</span></button>
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- board -->
      <div class="board">
        @for (col of store.columns(); track col.id) {
          <div class="col"
               [class.col--drop]="dropCol() === col.id"
               (dragover)="onColDragOver($event, col.id)"
               (dragleave)="onColDragLeave($event, col.id)"
               (drop)="onColDrop($event, col.id)">
            <div class="col__h">
              <span class="col__dot" [style.background]="col.color"></span>

              @if (editId() === col.id) {
                <input class="col__rename"
                       [value]="editVal()"
                       (input)="editVal.set($any($event.target).value)"
                       (keydown.enter)="saveEdit()"
                       (keydown.escape)="editId.set(null)"
                       (blur)="saveEdit()" />
              } @else {
                <span class="col__name">{{ col.name || 'Sans nom' }}</span>
              }

              <span class="col__count">{{ store.cards(col.id).length }}</span>
              <span class="spacer"></span>

              @if (!readonly) {
                <!-- ⋯ menu -->
                <div class="col__mwrap">
                  <button class="col__ic"
                          title="Options de la colonne"
                          (click)="colMenu.set(colMenu() === col.id ? null : col.id); $event.stopPropagation()">
                    <app-icon name="dots" [size]="15" [stroke]="2" />
                  </button>
                  @if (colMenu() === col.id) {
                    <div class="bd" (click)="colMenu.set(null)"></div>
                    <div class="col__menu" (click)="$event.stopPropagation()">
                      <button class="col__menu__i" (click)="startEdit(col)">
                        <app-icon name="edit" [size]="14" />Renommer
                      </button>
                      <div class="col__menu__sep"></div>
                      <span class="col__menu__lbl">Couleur</span>
                      <div class="col__swatches">
                        @for (c of PALETTE; track c) {
                          <button class="col__swatch"
                                  [class.col__swatch--on]="col.color === c"
                                  [style.background]="c"
                                  (click)="setColor(col.id, c)"></button>
                        }
                      </div>
                    </div>
                  }
                </div>

                <button class="col__ic" title="Ajouter une tâche" (click)="create.emit(col.id)">
                  <app-icon name="plus" [size]="16" [stroke]="2.2" />
                </button>
              }
            </div>

            <div class="col__cards">
              @for (t of store.cards(col.id); track t.id) {
                <div class="card"
                     [class.card--drag]="dragId() === t.id"
                     [attr.draggable]="!readonly"
                     (dragstart)="onCardDragStart($event, t.id, col.id)"
                     (dragend)="onCardDragEnd()"
                     (click)="openTask.emit(t)">
                  <div class="card__top">
                    <span class="pill" [style.color]="t.prio[1]" [style.background]="t.prio[2]">{{ t.prio[0] }}</span>
                    <span class="pill" [style.color]="t.tag[1]" [style.background]="tint(t.tag[1])">{{ t.tag[0] }}</span>
                    <span class="card__id nx-mono">{{ t.taskKey }}</span>
                    @if (!readonly) {
                      <button class="card__del" title="Supprimer la tâche" (click)="store.deleteTask(t.id); $event.stopPropagation()"><app-icon name="trash" [size]="14" /></button>
                    }
                  </div>
                  <div class="card__title">{{ t.title }}</div>
                  <div class="card__desc">{{ t.desc }}</div>
                  <div class="card__ft">
                    <div class="avs">
                      @for (c of t.team; track $index) { <span class="av" [style.background]="c"></span> }
                    </div>
                    <div class="meta">
                      <span><app-icon name="link" [size]="14" [stroke]="2" />{{ t.links }}</span>
                      <span><app-icon name="comment" [size]="14" [stroke]="2" />{{ t.comments }}</span>
                    </div>
                  </div>
                </div>
              }
              @if (!readonly) {
                <button class="addcard" (click)="create.emit(col.id)"><app-icon name="plus" [size]="16" [stroke]="2" />Ajouter une tâche</button>
              }
            </div>
          </div>
        }

        @if (!readonly) {
          <div class="addcol">
            <button class="addcol__btn" (click)="addColumn()">
              <app-icon name="plus" [size]="16" [stroke]="2.2" /><span>Ajouter une colonne</span>
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './kanban.component.scss',
})
export class KanbanComponent {
  @Input() readonly = false;
  /** True when the user can open the board settings menu (ADMIN/OWNER/CP — règle R8). */
  @Input() canManageBoard = false;
  @Output() openTask = new EventEmitter<TaskCard>();
  /** Ouvre « Créer une tâche » ; émet l'id du statut cliqué ('' = barre d'outils). */
  @Output() create = new EventEmitter<string>();
  @Output() openStatuses = new EventEmitter<void>();
  @Output() openWorkflow = new EventEmitter<void>();

  store = inject(KanbanStore);
  private el = inject(ElementRef);
  private route = inject(ActivatedRoute);
  private members = inject(MembersService);

  /** Annuaire des membres du workspace (résout `assigneeId` → nom/couleur). */
  private directory = toSignal(this.members.directory(), { initialValue: [] as Member[] });

  constructor() {
    // Allow deep-links from the project overview (e.g. "Tâches en retard" card)
    // to pre-apply an échéance filter via `?ech=retard`.
    this.route.queryParamMap.subscribe(q => {
      const ech = q.get('ech') as DueBucket | null;
      if (ech && ['retard', 'semaine', 'mois'].includes(ech) && this.store.filters().ech !== ech) {
        this.store.setFilter('ech', ech);
      }
    });
  }

  gearOpen  = signal(false);
  colMenu   = signal<string | null>(null);
  editId    = signal<string | null>(null);
  editVal   = signal('');

  // drag-and-drop of cards between columns
  dragId    = signal<string | null>(null);
  private dragFrom = signal<string | null>(null);
  dropCol   = signal<string | null>(null);

  readonly PALETTE = [
    '#8E8AA0', '#5B5FE9', '#5B8DEF', '#2BB673',
    '#E89A2C', '#F5564E', '#E0497B', '#3AA9E0',
    '#F2693C', '#6C70F0',
  ];

  /**
   * Options du filtre « Assigné à » : uniquement les **membres réels** du projet
   * qui portent au moins une tâche sur le board (les assignés présents, résolus
   * via l'annuaire). Un membre sans tâche assignée n'y figure pas.
   */
  assigneOpts = computed<FilterOption[]>(() => {
    const byId = new Map(this.directory().filter(m => m.userId).map(m => [m.userId!, m] as const));
    return this.store.assignedUserIds()
      .flatMap<FilterOption>(id => {
        const m = byId.get(id);
        return m ? [{ value: id, label: m.name, dot: avatarColorFor(id) }] : [];
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  });
  readonly PRIO_OPTS: FilterOption[] = [
    { value: 'Haute', label: 'Haute', dot: '#F5564E' },
    { value: 'Moyenne', label: 'Moyenne', dot: '#E89A2C' },
    { value: 'Basse', label: 'Basse', dot: '#2BB673' },
  ];
  readonly ECH_OPTS: FilterOption[] = [
    { value: 'retard', label: 'En retard', dot: '#F5564E' },
    { value: 'semaine', label: 'Cette semaine', dot: '#E89A2C' },
    { value: 'mois', label: 'Ce mois', dot: '#5B8DEF' },
  ];

  tint(c: string): string { return tintOf(c); }

  startEdit(col: KanbanColumn): void {
    this.colMenu.set(null);
    this.editId.set(col.id);
    this.editVal.set(col.name);
    setTimeout(() => {
      const inp = this.el.nativeElement.querySelector('.col__rename') as HTMLInputElement | null;
      inp?.select();
    }, 0);
  }

  saveEdit(): void {
    const id  = this.editId();
    const val = this.editVal().trim();
    if (id && val) { this.store.renameColumn(id, val); this.store.commitRename(id); }
    this.editId.set(null);
  }

  setColor(colId: string, color: string): void {
    this.store.setColor(colId, color);
    this.colMenu.set(null);
  }

  addColumn(): void {
    // Crée le statut en base puis passe la nouvelle colonne en édition inline.
    this.store.addColumnAsync('active').subscribe(nc => this.startEdit(nc));
  }

  // ── card drag-and-drop ─────────────────────────────────────────────────────
  onCardDragStart(e: DragEvent, taskId: string, fromCol: string): void {
    if (this.readonly) return;
    this.dragId.set(taskId);
    this.dragFrom.set(fromCol);
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', taskId); }
  }
  onCardDragEnd(): void { this.dragId.set(null); this.dragFrom.set(null); this.dropCol.set(null); }
  onColDragOver(e: DragEvent, colId: string): void {
    if (this.readonly || !this.dragId()) return;
    e.preventDefault();
    if (this.dropCol() !== colId) this.dropCol.set(colId);
  }
  onColDragLeave(e: DragEvent, colId: string): void {
    const related = e.relatedTarget as Node | null;
    if (!(e.currentTarget as HTMLElement).contains(related) && this.dropCol() === colId) this.dropCol.set(null);
  }
  onColDrop(e: DragEvent, colId: string): void {
    if (this.readonly) return;
    e.preventDefault();
    const tid = this.dragId();
    const from = this.dragFrom();
    this.dropCol.set(null);
    this.dragId.set(null);
    this.dragFrom.set(null);
    if (tid && from !== colId) this.store.moveTask(tid, colId);
  }
}
