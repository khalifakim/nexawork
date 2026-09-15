import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { FilterChipComponent, FilterOption, UNASSIGNED_VALUE } from '@shared/ui/filter-chip/filter-chip.component';
import { TasksService, BoardData } from '@core/services/tasks.service';
import { MembersService } from '@core/services/members.service';
import { KanbanColumn, TaskCard } from '@core/models/task.models';
import { avatarColorFor } from '@core/util/ui.util';

interface Row { id: string; name: string; who: string; start: number; span: number; prog: number; c: string; assigneeId?: string; }

const DAY = 86_400_000;

@Component({
  selector: 'app-gantt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterChipComponent],
  template: `
    <div class="wrap">
      <div class="pbar">
        <app-filter-chip label="Assigné à" [options]="assigneOpts()" [value]="assigne()"
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
              <div class="lane" [style.width.px]="cols().length * colW">
                @for (c of cols(); track $index; let ci = $index) { <div class="gline" [style.left.px]="ci * colW"></div> }
                @if (today() >= 0) { <div class="today" [style.left.px]="today() * colW"></div> }
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
  private membersSvc = inject(MembersService);

  periods = ['Aujourd’hui', 'Jour', 'Semaine', 'Mois', 'Trimestre', 'Année'];
  period = signal('Mois');
  assigne = signal<string | null>(null);
  colW = 132;

  private directory = toSignal(this.membersSvc.directory(), { initialValue: [] });

  /** Granularité d'une colonne du planning, dérivée de la période sélectionnée. */
  private unit = computed<'day' | 'week' | 'month' | 'quarter' | 'year'>(() => {
    switch (this.period()) {
      case 'Aujourd’hui':
      case 'Jour':      return 'day';
      case 'Semaine':   return 'week';
      case 'Trimestre': return 'quarter';
      case 'Année':     return 'year';
      default:          return 'month';
    }
  });

  /**
   * Options « Assigné à » : membres réels portant au moins une tâche datée
   * (résolus via l'annuaire), plus « Non assigné » s'il existe des tâches sans
   * responsable. Les tâches d'équipe ne figurent pas comme option nominative.
   */
  assigneOpts = computed<FilterOption[]>(() => {
    const byId = new Map(this.directory().filter(m => m.userId).map(m => [m.userId!, m] as const));
    const ids = new Set<string>();
    let hasUnassigned = false;
    for (const c of Object.values(this.board().cards).flat()) {
      if (!c.startDate && !c.dueDate) continue;
      if (c.assigneeType === 'TEAM') continue;
      if (c.assigneeId) ids.add(c.assigneeId); else hasUnassigned = true;
    }
    const people = [...ids].flatMap<FilterOption>(id => {
      const m = byId.get(id);
      return m ? [{ value: id, label: m.name, dot: avatarColorFor(id) }] : [];
    }).sort((a, b) => a.label.localeCompare(b.label));
    return hasUnassigned ? [...people, { value: UNASSIGNED_VALUE, label: 'Non assigné', dot: '#C9C5BC' }] : people;
  });

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

  /**
   * Tâches datées (au moins une échéance) réparties sur un planning dont la
   * granularité des colonnes suit la période choisie (jour → année). Les barres
   * sont positionnées en coordonnées « colonnes fractionnaires » : une date est
   * projetée sur l'index de sa colonne + sa fraction à l'intérieur, ce qui gère
   * proprement les colonnes de longueur variable (mois, trimestres, années).
   */
  private model = computed(() => {
    const b = this.board();
    const unit = this.unit();
    const colById = new Map(b.columns.map(c => [c.id, c]));
    const cards: TaskCard[] = Object.values(b.cards).flat();
    const dated = cards.filter(c => c.startDate || c.dueDate);
    if (dated.length === 0) return { cols: [] as string[], rows: [] as Row[], today: -1 };

    // Début = 00:00 du jour ; fin = 00:00 du LENDEMAIN de l'échéance (borne
    // exclusive) pour qu'une tâche d'un seul jour occupe une largeur visible.
    const startMs = (c: TaskCard) => this.startOfDay(new Date((c.startDate ?? c.dueDate!) + 'T00:00:00').getTime());
    const endMs = (c: TaskCard) => this.startOfDay(new Date((c.dueDate ?? c.startDate!) + 'T00:00:00').getTime()) + DAY;

    let min = Infinity, max = -Infinity;
    for (const c of dated) { min = Math.min(min, startMs(c)); max = Math.max(max, endMs(c)); }
    // « Aujourd'hui » : garantit que le jour courant fait partie du planning.
    const todayMs = this.startOfDay(Date.now());
    if (this.period() === 'Aujourd’hui') { min = Math.min(min, todayMs); max = Math.max(max, todayMs + DAY); }

    const buckets = this.buildBuckets(min, max - 1, unit);
    const cols = buckets.map(bk => bk.label);

    const rows: Row[] = dated.map(c => {
      const col = colById.get(c.statusId);
      const left = this.posOf(startMs(c), buckets);
      const span = Math.max(this.posOf(endMs(c), buckets) - left, 14 / this.colW);
      return {
        id: c.taskKey, name: c.title,
        who: c.team[0] ?? '#C9C5BC',
        start: left, span,
        prog: this.progFor(col),
        c: c.tag[1] || '#8E8AA0',
        assigneeId: c.assigneeType === 'TEAM' ? undefined : c.assigneeId,
      };
    });
    // Repère « aujourd'hui » : -1 si hors de la plage affichée (pas de trait).
    const today = (todayMs >= buckets[0].start && todayMs < buckets[buckets.length - 1].end)
      ? this.posOf(todayMs, buckets) : -1;
    return { cols, rows, today };
  });

  cols = computed(() => this.model().cols);
  today = computed(() => this.model().today);
  shown = computed<Row[]>(() => {
    const a = this.assigne();
    const rows = this.model().rows;
    if (!a) return rows;
    if (a === UNASSIGNED_VALUE) return rows.filter(r => !r.assigneeId);
    return rows.filter(r => r.assigneeId === a);
  });

  /**
   * Découpe [min, max] en colonnes selon la granularité. Chaque colonne porte
   * son intervalle [start, end) en millisecondes et son libellé.
   */
  private buildBuckets(minMs: number, maxMs: number, unit: 'day' | 'week' | 'month' | 'quarter' | 'year')
    : { start: number; end: number; label: string }[] {
    const out: { start: number; end: number; label: string }[] = [];
    if (unit === 'day') {
      let s = this.startOfDay(minMs); const end = this.startOfDay(maxMs);
      while (s <= end) {
        out.push({ start: s, end: s + DAY, label: new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) });
        s += DAY;
      }
    } else if (unit === 'week') {
      let s = this.startOfWeek(minMs); const end = this.startOfWeek(maxMs);
      while (s <= end) { out.push({ start: s, end: s + 7 * DAY, label: 'Sem. ' + this.isoWeek(s) }); s += 7 * DAY; }
    } else if (unit === 'month') {
      const d = new Date(minMs); let y = d.getFullYear(), m = d.getMonth();
      const de = new Date(maxMs); const ey = de.getFullYear(), em = de.getMonth();
      while (y < ey || (y === ey && m <= em)) {
        out.push({ start: new Date(y, m, 1).getTime(), end: new Date(y, m + 1, 1).getTime(),
          label: new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) });
        if (++m > 11) { m = 0; y++; }
      }
    } else if (unit === 'quarter') {
      const d = new Date(minMs); let y = d.getFullYear(), q = Math.floor(d.getMonth() / 3);
      const de = new Date(maxMs); const ey = de.getFullYear(), eq = Math.floor(de.getMonth() / 3);
      while (y < ey || (y === ey && q <= eq)) {
        out.push({ start: new Date(y, q * 3, 1).getTime(), end: new Date(y, q * 3 + 3, 1).getTime(), label: 'T' + (q + 1) + ' ' + y });
        if (++q > 3) { q = 0; y++; }
      }
    } else {
      let y = new Date(minMs).getFullYear(); const ey = new Date(maxMs).getFullYear();
      while (y <= ey) { out.push({ start: new Date(y, 0, 1).getTime(), end: new Date(y + 1, 0, 1).getTime(), label: String(y) }); y++; }
    }
    return out;
  }

  /** Projette une date en index de colonne fractionnaire (0 → nb colonnes). */
  private posOf(ms: number, buckets: { start: number; end: number }[]): number {
    if (!buckets.length) return 0;
    if (ms <= buckets[0].start) return 0;
    if (ms >= buckets[buckets.length - 1].end) return buckets.length;
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      if (ms >= b.start && ms < b.end) return i + (ms - b.start) / (b.end - b.start);
    }
    return buckets.length;
  }

  private startOfDay(ms: number): number {
    const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime();
  }

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
