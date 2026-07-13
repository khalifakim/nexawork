import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { FilterChipComponent, FilterOption } from '@shared/ui/filter-chip/filter-chip.component';
import { TasksService, BoardData } from '@core/services/tasks.service';
import { KanbanColumn, TaskCard } from '@core/models/task.models';

interface Row { id: string; name: string; who: string; start: number; span: number; prog: number; c: string; }

const DAY = 86_400_000;

@Component({
  selector: 'app-gantt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterChipComponent],
  template: `
    <div class="wrap">
      <div class="pbar">
        <app-filter-chip label="Assigné à" [options]="ASSIGNE_OPTS" [value]="assigne()"
                         (valueChange)="assigne.set($event)" />
        <div class="seg">
          @for (p of periods; track p) { <button [class.seg--on]="period()===p" (click)="period.set(p)">{{ p }}</button> }
        </div>
      </div>
      <div class="chart">
        <div class="grid">
          <div class="tlh">
            <div class="tlh__name">Tâche</div>
            @for (c of cols(); track $index) { <div class="tlh__col">{{ c }}</div> }
          </div>
          @for (r of shown(); track r.id; let i = $index) {
            <div class="gr" [class.gr--alt]="i % 2 === 1">
              <div class="gr__name">
                <span class="av" [style.background]="r.who"></span>
                <span class="id nx-mono">{{ r.id }}</span>
                <span class="nm">{{ r.name }}</span>
              </div>
              <div class="lane">
                @for (c of cols(); track $index; let ci = $index) { <div class="gline" [style.left.px]="ci * colW"></div> }
                <div class="bar" [style.left.px]="r.start * colW + 6" [style.width.px]="r.span * colW - 12"
                     [style.background]="r.prog === 100 ? r.c : 'rgba(0,0,0,.06)'" [style.border-color]="r.prog === 100 ? r.c : 'rgba(0,0,0,.10)'">
                  <div class="fill" [style.width.%]="r.prog" [style.background]="r.c" [style.opacity]="r.prog === 100 ? 1 : .88"></div>
                  <span class="lbl" [style.color]="r.prog >= 50 ? '#fff' : '#56525c'">{{ r.prog }}%</span>
                </div>
              </div>
            </div>
          } @empty {
            <div class="gempty">Aucune tâche datée à afficher sur le planning.</div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './gantt.component.scss',
})
export class GanttComponent {
  private route = inject(ActivatedRoute);
  private tasksSvc = inject(TasksService);

  periods = ['Aujourd’hui', 'Jour', 'Semaine', 'Mois', 'Trimestre', 'Année'];
  period = signal('Mois');
  assigne = signal<string | null>(null);
  colW = 132;

  /**
   * Filtre « Assigné à » : câblé à l'annuaire des membres en I3 (comme le filtre
   * Kanban). Vide pour l'instant — le chip reste présent mais inerte.
   */
  readonly ASSIGNE_OPTS: FilterOption[] = [];

  private projectId(): string {
    return this.route.snapshot.paramMap.get('id')
      ?? this.route.parent?.snapshot.paramMap.get('id')
      ?? '';
  }

  private board = toSignal(
    this.route.paramMap.pipe(switchMap(() => this.tasksSvc.loadBoard(this.projectId()))),
    { initialValue: { columns: [], cards: {} } as BoardData },
  );

  /** Catégorie d'un statut → pourcentage d'avancement conventionnel. */
  private progFor(col?: KanbanColumn): number {
    if (!col) return 0;
    if (col.cat === 'done' || col.cat === 'closed') return 100;
    return col.cat === 'active' ? 50 : 0;
  }

  /** Tâches datées (au moins une échéance), avec la plage temporelle globale. */
  private model = computed(() => {
    const b = this.board();
    const colById = new Map(b.columns.map(c => [c.id, c]));
    const cards: TaskCard[] = Object.values(b.cards).flat();
    const dated = cards.filter(c => c.startDate || c.dueDate);
    if (dated.length === 0) return { cols: [] as string[], rows: [] as Row[] };

    const start = (c: TaskCard) => new Date((c.startDate ?? c.dueDate!) + 'T00:00:00').getTime();
    const end = (c: TaskCard) => new Date((c.dueDate ?? c.startDate!) + 'T00:00:00').getTime();

    let min = Infinity, max = -Infinity;
    for (const c of dated) { min = Math.min(min, start(c)); max = Math.max(max, end(c)); }
    // Aligne le début sur le lundi de la semaine du min.
    const origin = this.startOfWeek(min);
    const weeks = Math.max(1, Math.ceil((max - origin) / (7 * DAY)));

    const cols: string[] = [];
    for (let i = 0; i < weeks; i++) cols.push('Sem. ' + this.isoWeek(origin + i * 7 * DAY));

    const rows: Row[] = dated.map(c => {
      const col = colById.get(c.statusId);
      const s = (start(c) - origin) / (7 * DAY);
      const span = Math.max(0.5, (end(c) - start(c)) / (7 * DAY) + 1 / 7);
      return {
        id: c.taskKey, name: c.title,
        who: c.team[0] ?? '#C9C5BC',
        start: Math.max(0, s), span,
        prog: this.progFor(col),
        c: c.tag[1] || '#8E8AA0',
      };
    });
    return { cols, rows };
  });

  cols = computed(() => this.model().cols);
  shown = computed<Row[]>(() => {
    const a = this.assigne();
    const rows = this.model().rows;
    return a ? rows.filter(r => r.who === a) : rows;
  });

  private startOfWeek(ms: number): number {
    const d = new Date(ms); d.setHours(0, 0, 0, 0);
    const day = (d.getDay() + 6) % 7; // lundi = 0
    return d.getTime() - day * DAY;
  }
  private isoWeek(ms: number): number {
    const d = new Date(ms);
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNr = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
    return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY));
  }
}
