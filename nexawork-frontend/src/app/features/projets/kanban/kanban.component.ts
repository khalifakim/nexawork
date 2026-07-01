import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { TasksService } from '@core/services/tasks.service';
import { KanbanColumn, TaskCard } from '@core/models/task.models';
import { TAG_TINT } from '@core/util/ui.util';

@Component({
  selector: 'app-kanban',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="board-wrap">
      <!-- filter bar -->
      <div class="fbar">
        <button class="chip chip--on">Assigné à<app-icon name="chevronDown" [size]="13" [stroke]="2.4" /></button>
        <button class="chip">Priorité<app-icon name="chevronDown" [size]="13" [stroke]="2.4" /></button>
        <button class="chip">Échéance<app-icon name="chevronDown" [size]="13" [stroke]="2.4" /></button>
        <span class="spacer"></span>
        @if (!readonly) {
          <button class="add-task" (click)="create.emit('À faire')"><app-icon name="plus" [size]="15" [stroke]="2.2" />Ajouter une tâche</button>
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
      </div>

      <!-- board -->
      <div class="board">
        @for (col of resolvedCols(); track col.id) {
          <div class="col">
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
                <span class="col__name">{{ col.name }}</span>
              }

              <span class="col__count">{{ cards(col.id).length }}</span>
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

                <button class="col__ic" title="Ajouter une tâche" (click)="create.emit(col.name)">
                  <app-icon name="plus" [size]="16" [stroke]="2.2" />
                </button>
              }
            </div>

            <div class="col__cards">
              @for (t of cards(col.id); track t.id) {
                <div class="card" (click)="openTask.emit(t)">
                  <div class="card__top">
                    <span class="pill" [style.color]="t.prio[1]" [style.background]="t.prio[2]">{{ t.prio[0] }}</span>
                    <span class="pill" [style.color]="t.tag[1]" [style.background]="tint(t.tag[1])">{{ t.tag[0] }}</span>
                    <span class="card__id nx-mono">{{ t.id }}</span>
                    @if (!readonly) {
                      <button class="card__del" title="Supprimer la tâche" (click)="del(t.id); $event.stopPropagation()"><app-icon name="trash" [size]="14" /></button>
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
                <button class="addcard" (click)="create.emit(col.name)"><app-icon name="plus" [size]="16" [stroke]="2" />Ajouter une tâche</button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './kanban.component.scss',
})
export class KanbanComponent {
  @Input() readonly = false;
  @Output() openTask = new EventEmitter<TaskCard>();
  @Output() create = new EventEmitter<string>();
  @Output() openStatuses = new EventEmitter<void>();
  @Output() openWorkflow = new EventEmitter<void>();

  private tasksSvc = inject(TasksService);
  private el = inject(ElementRef);

  private baseColumns = toSignal(this.tasksSvc.columns(), { initialValue: [] as KanbanColumn[] });
  private boardData  = toSignal(this.tasksSvc.board(),   { initialValue: {} as Record<string, TaskCard[]> });

  private colNamesS  = signal<Record<string, string>>({});
  private colColorsS = signal<Record<string, string>>({});

  resolvedCols = computed(() =>
    this.baseColumns().map(c => ({
      ...c,
      name:  this.colNamesS()[c.id]  ?? c.name,
      color: this.colColorsS()[c.id] ?? c.color,
    }))
  );

  gearOpen  = signal(false);
  colMenu   = signal<string | null>(null);
  editId    = signal<string | null>(null);
  editVal   = signal('');
  deleted   = signal<string[]>([]);

  readonly PALETTE = [
    '#8E8AA0', '#5B5FE9', '#5B8DEF', '#2BB673',
    '#E89A2C', '#F5564E', '#E0497B', '#3AA9E0',
    '#F2693C', '#6C70F0',
  ];

  cards(colId: string): TaskCard[] {
    const del = this.deleted();
    return (this.boardData()[colId] ?? []).filter(t => !del.includes(t.id));
  }

  tint(c: string): string { return TAG_TINT[c] ?? 'rgba(0,0,0,.04)'; }
  del(id: string): void   { this.deleted.update(l => [...l, id]); }

  startEdit(col: { id: string; name: string }): void {
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
    if (id && val) {
      this.colNamesS.update(m => ({ ...m, [id]: val }));
    }
    this.editId.set(null);
  }

  setColor(colId: string, color: string): void {
    this.colColorsS.update(m => ({ ...m, [colId]: color }));
    this.colMenu.set(null);
  }
}
