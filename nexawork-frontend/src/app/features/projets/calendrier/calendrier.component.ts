import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoaderComponent } from '@shared/ui/loader/loader.component';
import { FilterChipComponent, FilterOption, UNASSIGNED_VALUE } from '@shared/ui/filter-chip/filter-chip.component';
import { TaskCard } from '@core/models/task.models';
import { Member } from '@core/models/member.models';
import { MembersService } from '@core/services/members.service';
import { avatarColorFor, tintOf } from '@core/util/ui.util';
import { KanbanStore } from '@features/projets/kanban/kanban.store';

/** Granularité d'affichage du calendrier. */
type CalView = 'jour' | 'semaine' | 'mois';

/** Une case = un jour de la grille. */
interface DayCell {
  key: string;        // `yyyy-MM-dd`
  day: number;        // quantième
  inMonth: boolean;   // faux pour les jours débordant du mois affiché
  isToday: boolean;
  isWeekend: boolean;
}

/**
 * Portion d'une tâche visible sur UNE ligne-semaine. Une tâche à cheval sur deux
 * semaines produit deux segments, chacun marqué comme « continue » du bon côté.
 */
interface Segment {
  task: TaskCard;
  col: number;         // 0-6 — colonne de départ dans la semaine
  span: number;        // nombre de jours couverts sur cette ligne
  lane: number;        // piste d'empilement
  contLeft: boolean;   // la tâche avait déjà commencé avant cette ligne
  contRight: boolean;  // la tâche se poursuit après cette ligne
  late: boolean;       // échéance dépassée et statut non final
  done: boolean;       // statut final
}

interface WeekRow {
  start: string;       // `yyyy-MM-dd` du lundi
  days: DayCell[];
  segs: Segment[];
  lanes: number;       // pistes réellement rendues
  hidden: number;      // segments non rendus (dépassement de `MAX_LANES`)
}

// ── Arithmétique de dates, en heure LOCALE ───────────────────────────────────
// Volontairement sans `toISOString()` : celui-ci bascule en UTC et décale d'un
// jour selon le fuseau. Les dates métier sont des `LocalDate` (sans heure).

const DAY_MS = 86_400_000;

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseIso(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
/** Lundi de la semaine de `d`. */
function startOfWeek(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7));
}
/** Nombre de jours de `a` à `b` (négatif si `b` précède `a`). Insensible au DST. */
function dayDiff(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / DAY_MS);
}
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

/** Pistes rendues au maximum par ligne-semaine en vue Mois (au-delà : « +N »). */
const MAX_LANES = 3;
/** Hauteur d'une piste + son interligne, en px — doit suivre le SCSS. */
const LANE_H = 25;
/** Hauteur de l'en-tête d'une case (quantième + bouton « + »), en px. */
const HEAD_H = 30;

/**
 * Vue Calendrier d'un projet — 3ᵉ mode de visualisation des tâches, à côté du
 * Kanban (par statut) et du Gantt (par durée).
 *
 * Les tâches sont dessinées comme des **barres étalées** de leur date de début à
 * leur échéance, empilées sur des pistes par un placement « première piste
 * libre ». Les données viennent du `KanbanStore` déjà chargé par le shell :
 * aucun appel réseau supplémentaire, et toute création/édition faite ailleurs
 * se reflète ici immédiatement.
 */
@Component({
  selector: 'app-calendrier',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LoaderComponent, FilterChipComponent],
  template: `
    <div class="cal">

      <!-- ── Barre d'outils ─────────────────────────────────────────────── -->
      <div class="tbar">
        <app-filter-chip label="Assigné à" [options]="assigneOpts()" [value]="assigne()"
                         (valueChange)="assigne.set($event)" />
        <app-filter-chip label="Priorité" [options]="PRIO_OPTS" [value]="prio()"
                         (valueChange)="prio.set($event)" />

        <div class="nav">
          <button class="nav__b" title="Période précédente" (click)="step(-1)">
            <app-icon name="chevronLeft" [size]="16" [stroke]="2.2" />
          </button>
          <button class="nav__today" (click)="goToday()">Aujourd'hui</button>
          <button class="nav__b" title="Période suivante" (click)="step(1)">
            <app-icon name="chevronRight" [size]="16" [stroke]="2.2" />
          </button>
        </div>
        <div class="period">{{ periodLabel() }}</div>

        <span class="spacer"></span>

        <div class="seg-ctl">
          @for (v of VIEWS; track v.key) {
            <button [class.seg-ctl--on]="view() === v.key" (click)="view.set(v.key)">{{ v.label }}</button>
          }
        </div>
        @if (!readonly) {
          <button class="add" (click)="create.emit(cursor())">
            <app-icon name="plus" [size]="15" [stroke]="2.2" />Ajouter une tâche
          </button>
        }
      </div>

      @if (store.loading()) {
        <app-loader label="Chargement du calendrier…" [minHeight]="320" />
      } @else {

        <div class="body">
          @switch (view()) {

            <!-- ── Mois ──────────────────────────────────────────────────── -->
            @case ('mois') {
              <div class="dow">
                @for (d of DOW; track d) { <div class="dow__c">{{ d }}</div> }
              </div>
              <div class="weeks">
                @for (w of monthWeeks(); track w.start) {
                  <div class="wk"
                       [style.min-height.px]="rowHeight(w)"
                       (dragover)="onRowDragOver($event, w)"
                       (dragleave)="onRowDragLeave($event)"
                       (drop)="onRowDrop($event, w)">
                    @for (d of w.days; track d.key) {
                      <div class="cell"
                           [class.cell--out]="!d.inMonth"
                           [class.cell--we]="d.isWeekend"
                           [class.cell--today]="d.isToday"
                           [class.cell--drop]="dropKey() === d.key">
                        <div class="cell__h">
                          <span class="cell__d">{{ d.day }}</span>
                          <span class="spacer"></span>
                          @if (!readonly) {
                            <button class="cell__add" title="Ajouter une tâche ce jour"
                                    (click)="create.emit(d.key)">
                              <app-icon name="plus" [size]="13" [stroke]="2.6" />
                            </button>
                          }
                        </div>
                      </div>
                    }

                    <div class="lanes">
                      @for (s of w.segs; track s.task.id + ':' + s.col) {
                        <div class="seg"
                                [class.seg--late]="s.late"
                                [class.seg--done]="s.done"
                                [class.seg--cl]="s.contLeft"
                                [class.seg--cr]="s.contRight"
                                [class.seg--drag]="dragId() === s.task.id"
                                [style.grid-column]="(s.col + 1) + ' / span ' + s.span"
                                [style.grid-row]="s.lane + 1"
                                [style.border-left-color]="s.task.tag[1]"
                                [attr.draggable]="!readonly"
                                [title]="segTitle(s)"
                                (dragstart)="onDragStart($event, s.task)"
                                (dragend)="onDragEnd()"
                                (click)="openTask.emit(s.task)">
                          @if (s.contLeft) { <span class="seg__cont">‹</span> }
                          <span class="seg__p" [style.background]="s.task.prio[1]"></span>
                          <span class="seg__k nx-mono">{{ s.task.taskKey }}</span>
                          <span class="seg__t">{{ s.task.title }}</span>
                          @if (s.contRight) { <span class="seg__cont">›</span> }
                        </div>
                      }
                    </div>

                    @if (w.hidden) {
                      <button class="more" (click)="focusWeek(w.start)">
                        ＋{{ w.hidden }} autre{{ w.hidden > 1 ? 's' : '' }} cette semaine
                      </button>
                    }
                  </div>
                }
              </div>
            }

            <!-- ── Semaine ───────────────────────────────────────────────── -->
            @case ('semaine') {
              @if (weekRow(); as w) {
                <div class="dow">
                  @for (d of w.days; track d.key) {
                    <div class="dow__c" [class.dow__c--today]="d.isToday">
                      {{ DOW[$index] }} {{ d.day }}
                    </div>
                  }
                </div>
                <div class="weeks weeks--one">
                  <div class="wk wk--tall"
                       [style.min-height.px]="rowHeight(w)"
                       (dragover)="onRowDragOver($event, w)"
                       (dragleave)="onRowDragLeave($event)"
                       (drop)="onRowDrop($event, w)">
                    @for (d of w.days; track d.key) {
                      <div class="cell"
                           [class.cell--we]="d.isWeekend"
                           [class.cell--today]="d.isToday"
                           [class.cell--drop]="dropKey() === d.key">
                        <div class="cell__h">
                          <span class="spacer"></span>
                          @if (!readonly) {
                            <button class="cell__add" title="Ajouter une tâche ce jour"
                                    (click)="create.emit(d.key)">
                              <app-icon name="plus" [size]="13" [stroke]="2.6" />
                            </button>
                          }
                        </div>
                      </div>
                    }
                    <div class="lanes">
                      @for (s of w.segs; track s.task.id + ':' + s.col) {
                        <div class="seg"
                                [class.seg--late]="s.late"
                                [class.seg--done]="s.done"
                                [class.seg--cl]="s.contLeft"
                                [class.seg--cr]="s.contRight"
                                [class.seg--drag]="dragId() === s.task.id"
                                [style.grid-column]="(s.col + 1) + ' / span ' + s.span"
                                [style.grid-row]="s.lane + 1"
                                [style.border-left-color]="s.task.tag[1]"
                                [attr.draggable]="!readonly"
                                [title]="segTitle(s)"
                                (dragstart)="onDragStart($event, s.task)"
                                (dragend)="onDragEnd()"
                                (click)="openTask.emit(s.task)">
                          @if (s.contLeft) { <span class="seg__cont">‹</span> }
                          <span class="seg__p" [style.background]="s.task.prio[1]"></span>
                          <span class="seg__k nx-mono">{{ s.task.taskKey }}</span>
                          <span class="seg__t">{{ s.task.title }}</span>
                          @if (s.contRight) { <span class="seg__cont">›</span> }
                        </div>
                      }
                    </div>
                    @if (!w.segs.length) {
                      <div class="wempty">Aucune tâche sur cette semaine.</div>
                    }
                  </div>
                </div>
              }
            }

            <!-- ── Jour ──────────────────────────────────────────────────── -->
            @default {
              <div class="day">
                <div class="day__h">
                  <span class="day__t">{{ periodLabel() }}</span>
                  <span class="day__n">{{ dayTasks().length }} tâche{{ dayTasks().length > 1 ? 's' : '' }}</span>
                </div>
                @for (t of dayTasks(); track t.id) {
                  <div class="drow" [class.drow--done]="isDone(t)" (click)="openTask.emit(t)">
                    <span class="pill" [style.color]="t.prio[1]" [style.background]="t.prio[2]">{{ t.prio[0] }}</span>
                    <span class="pill" [style.color]="t.tag[1]" [style.background]="tint(t.tag[1])">{{ t.tag[0] }}</span>
                    <span class="drow__k nx-mono">{{ t.taskKey }}</span>
                    <span class="drow__t">{{ t.title }}</span>
                    <span class="spacer"></span>
                    <span class="drow__dates" [class.drow__dates--late]="isLate(t)">{{ rangeLabel(t) }}</span>
                    <div class="avs">
                      @for (c of t.team; track $index) { <span class="av" [style.background]="c"></span> }
                    </div>
                  </div>
                } @empty {
                  <div class="dempty">Aucune tâche active ce jour-là.</div>
                }
                @if (!readonly) {
                  <button class="day__add" (click)="create.emit(cursor())">
                    <app-icon name="plus" [size]="15" [stroke]="2.2" />Ajouter une tâche ce jour
                  </button>
                }
              </div>
            }
          }
        </div>

        @if (undatedCount()) {
          <div class="foot">
            {{ undatedCount() }} tâche{{ undatedCount() > 1 ? 's' : '' }} sans date
            {{ undatedCount() > 1 ? 'ne sont pas affichées' : "n'est pas affichée" }} sur le calendrier.
          </div>
        }
      }
    </div>
  `,
  styleUrl: './calendrier.component.scss',
})
export class CalendrierComponent {
  /** Projet archivé : ni création, ni glisser-déposer. */
  @Input() readonly = false;
  @Output() openTask = new EventEmitter<TaskCard>();
  /** Ouvre « Créer une tâche » avec le jour cliqué (`yyyy-MM-dd`) en dates. */
  @Output() create = new EventEmitter<string>();

  store = inject(KanbanStore);
  private members = inject(MembersService);

  /** Annuaire du workspace — résout `assigneeId` → nom, pour le filtre. */
  private directory = toSignal(this.members.directory(), { initialValue: [] as Member[] });

  readonly DOW = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
  readonly VIEWS: { key: CalView; label: string }[] = [
    { key: 'jour',    label: 'Jour'    },
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois',    label: 'Mois'    },
  ];
  readonly PRIO_OPTS: FilterOption[] = [
    { value: 'Urgente', label: 'Urgente', dot: '#E0497B' },
    { value: 'Haute',   label: 'Haute',   dot: '#F5564E' },
    { value: 'Moyenne', label: 'Moyenne', dot: '#E89A2C' },
    { value: 'Basse',   label: 'Basse',   dot: '#2BB673' },
  ];

  /** Aujourd'hui, figé à la construction de la vue. */
  readonly today = isoOf(new Date());

  view   = signal<CalView>('mois');
  /** Jour de référence de la période affichée. */
  cursor = signal<string>(this.today);
  // Filtres LOCAUX : filtrer ici ne doit pas modifier le Kanban (état partagé).
  assigne = signal<string | null>(null);
  prio    = signal<string | null>(null);

  dragId  = signal<string | null>(null);
  dropKey = signal<string | null>(null);

  /** Options « Assigné à » — mêmes règles que le Kanban (assignés présents). */
  assigneOpts = computed<FilterOption[]>(() => {
    const byId = new Map(this.directory().filter(m => m.userId).map(m => [m.userId!, m] as const));
    const people = this.store.assignedUserIds()
      .flatMap<FilterOption>(id => {
        const m = byId.get(id);
        return m ? [{ value: id, label: m.name, dot: avatarColorFor(id) }] : [];
      })
      .sort((a, b) => a.label.localeCompare(b.label));
    return this.store.hasUnassigned() ? [...people, { value: UNASSIGNED_VALUE, label: 'Non assigné', dot: '#C9C5BC' }] : people;
  });

  /** Statuts terminaux — une tâche qui y est n'est jamais « en retard ». */
  private finalIds = computed(() => new Set(this.store.columns().filter(c => c.isFinal).map(c => c.id)));

  /** Tâches datées, après application des filtres locaux. */
  private dated = computed<TaskCard[]>(() => {
    const a = this.assigne(), p = this.prio();
    return this.store.allCards().filter(t => {
      if (!t.startDate && !t.dueDate) return false;
      if (a === UNASSIGNED_VALUE) { if (t.assigneeId) return false; }
      else if (a && t.assigneeId !== a) return false;
      if (p && t.prio[0] !== p) return false;
      return true;
    });
  });

  /** Tâches sans aucune date — impossibles à placer, signalées en pied de vue. */
  undatedCount = computed(() => this.store.allCards().filter(t => !t.startDate && !t.dueDate).length);

  /**
   * Plage occupée par une tâche. Une seule date → un jour. Données incohérentes
   * (début postérieur à l'échéance) → repli sur un seul jour à l'échéance,
   * plutôt qu'une barre de longueur négative.
   */
  private rangeOf(t: TaskCard): { from: Date; to: Date } {
    const s = t.startDate ? parseIso(t.startDate) : null;
    const e = t.dueDate ? parseIso(t.dueDate) : null;
    const from = s ?? e!;
    const to = e ?? s!;
    return dayDiff(from, to) < 0 ? { from: to, to } : { from, to };
  }

  isDone(t: TaskCard): boolean { return this.finalIds().has(t.statusId); }
  isLate(t: TaskCard): boolean {
    return !this.isDone(t) && dayDiff(parseIso(this.today), this.rangeOf(t).to) < 0;
  }

  /**
   * Construit une ligne-semaine : ses 7 cases, puis les segments des tâches qui
   * la traversent, empilés par placement « première piste libre » (les segments
   * sont triés par colonne de départ, puis du plus long au plus court).
   */
  private buildWeek(weekStart: Date, monthRef: number | null, maxLanes: number): WeekRow {
    const weekEnd = addDays(weekStart, 6);
    const days: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      days.push({
        key: isoOf(d),
        day: d.getDate(),
        inMonth: monthRef === null || d.getMonth() === monthRef,
        isToday: isoOf(d) === this.today,
        isWeekend: i >= 5,
      });
    }

    const raw = this.dated()
      .map(t => ({ t, r: this.rangeOf(t) }))
      // La tâche croise la semaine : elle commence avant sa fin ET finit après son début.
      .filter(({ r }) => dayDiff(r.from, weekEnd) >= 0 && dayDiff(weekStart, r.to) >= 0)
      .map(({ t, r }) => {
        const from = dayDiff(weekStart, r.from);
        const to = dayDiff(weekStart, r.to);
        const col = Math.max(0, from);
        return {
          task: t,
          col,
          span: Math.min(6, to) - col + 1,
          lane: 0,
          contLeft: from < 0,
          contRight: to > 6,
          late: this.isLate(t),
          done: this.isDone(t),
        } as Segment;
      })
      .sort((a, b) => a.col - b.col || b.span - a.span || a.task.taskKey.localeCompare(b.task.taskKey));

    // Dernière colonne occupée, piste par piste.
    const laneEnd: number[] = [];
    const segs: Segment[] = [];
    let hidden = 0;
    for (const s of raw) {
      let lane = laneEnd.findIndex(end => end < s.col);
      if (lane < 0) { lane = laneEnd.length; laneEnd.push(-1); }
      laneEnd[lane] = s.col + s.span - 1;
      // La piste reste réservée même si le segment n'est pas rendu : l'empilement
      // ne se réorganise pas quand on passe en vue Semaine.
      if (lane >= maxLanes) { hidden++; continue; }
      segs.push({ ...s, lane });
    }

    return {
      start: isoOf(weekStart),
      days, segs, hidden,
      lanes: Math.max(1, Math.min(laneEnd.length, maxLanes)),
    };
  }

  monthWeeks = computed<WeekRow[]>(() => {
    const c = parseIso(this.cursor());
    const first = new Date(c.getFullYear(), c.getMonth(), 1);
    const last = new Date(c.getFullYear(), c.getMonth() + 1, 0);
    const gridStart = startOfWeek(first);
    const weeks = Math.ceil((dayDiff(gridStart, last) + 1) / 7);
    const rows: WeekRow[] = [];
    for (let i = 0; i < weeks; i++) rows.push(this.buildWeek(addDays(gridStart, i * 7), c.getMonth(), MAX_LANES));
    return rows;
  });

  /** Vue Semaine : pistes non plafonnées, la ligne s'agrandit. */
  weekRow = computed<WeekRow>(() => this.buildWeek(startOfWeek(parseIso(this.cursor())), null, 99));

  /** Vue Jour : toute tâche ACTIVE ce jour-là (y compris commencée avant). */
  dayTasks = computed<TaskCard[]>(() => {
    const d = parseIso(this.cursor());
    return this.dated()
      .filter(t => {
        const r = this.rangeOf(t);
        return dayDiff(r.from, d) >= 0 && dayDiff(d, r.to) >= 0;
      })
      .sort((a, b) => a.taskKey.localeCompare(b.taskKey));
  });

  /** Hauteur d'une ligne-semaine : en-tête + pistes (plancher en vue Semaine). */
  rowHeight(w: WeekRow): number {
    const h = HEAD_H + w.lanes * LANE_H + 14;
    return this.view() === 'semaine' ? Math.max(h, 420) : Math.max(h, 96);
  }

  periodLabel = computed<string>(() => {
    const d = parseIso(this.cursor());
    if (this.view() === 'jour') {
      return cap(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }
    if (this.view() === 'semaine') {
      const s = startOfWeek(d), e = addDays(s, 6);
      const left = s.toLocaleDateString('fr-FR', s.getMonth() === e.getMonth()
        ? { day: 'numeric' }
        : { day: 'numeric', month: 'short' });
      const right = e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${left} – ${right}`;
    }
    return cap(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  step(delta: number): void {
    const d = parseIso(this.cursor());
    if (this.view() === 'mois') {
      // On se pose sur aujourd'hui si le mois visé le contient, sinon sur le 1er.
      const target = new Date(d.getFullYear(), d.getMonth() + delta, 1);
      const t = parseIso(this.today);
      const same = t.getFullYear() === target.getFullYear() && t.getMonth() === target.getMonth();
      this.cursor.set(isoOf(same ? t : target));
      return;
    }
    this.cursor.set(isoOf(addDays(d, this.view() === 'semaine' ? 7 * delta : delta)));
  }
  goToday(): void { this.cursor.set(this.today); }
  /** « +N autres » → ouvre la semaine concernée, où rien n'est masqué. */
  focusWeek(weekStart: string): void { this.cursor.set(weekStart); this.view.set('semaine'); }

  // ── Glisser-déposer : replanification (durée conservée) ────────────────────
  onDragStart(e: DragEvent, t: TaskCard): void {
    if (this.readonly) return;
    this.dragId.set(t.id);
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); }
  }
  onDragEnd(): void { this.dragId.set(null); this.dropKey.set(null); }

  /**
   * Jour survolé, déduit de la **géométrie de la ligne** plutôt que de l'élément
   * sous le curseur. Les barres flottent dans un calque au-dessus des cases :
   * se fier à la cible de l'événement rendrait le dépôt dépendant de ce qui se
   * trouve dessous. Ici la ligne entière écoute, et la colonne se calcule.
   */
  private dayAt(e: DragEvent, w: WeekRow): string {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * 7);
    return w.days[Math.min(6, Math.max(0, col))].key;
  }

  onRowDragOver(e: DragEvent, w: WeekRow): void {
    if (this.readonly || !this.dragId()) return;
    // Sans ce preventDefault, le navigateur refuse le dépôt (curseur « interdit »).
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const key = this.dayAt(e, w);
    if (this.dropKey() !== key) this.dropKey.set(key);
  }
  onRowDragLeave(e: DragEvent): void {
    const related = e.relatedTarget as Node | null;
    if (!(e.currentTarget as HTMLElement).contains(related)) this.dropKey.set(null);
  }
  onRowDrop(e: DragEvent, w: WeekRow): void {
    if (this.readonly) return;
    e.preventDefault();
    const id = this.dragId();
    const key = this.dayAt(e, w);
    this.dragId.set(null);
    this.dropKey.set(null);
    if (!id) return;
    const t = this.store.allCards().find(c => c.id === id);
    if (!t) return;
    // Le jour de dépôt devient le nouveau début ; l'échéance suit à durée égale.
    const r = this.rangeOf(t);
    const from = parseIso(key);
    this.store.reschedule(id, isoOf(from), isoOf(addDays(from, dayDiff(r.from, r.to))));
  }

  // ── Libellés ───────────────────────────────────────────────────────────────
  tint(c: string): string { return tintOf(c); }

  private fmtShort(d: Date): string {
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  /** « 6 juil. → 10 juil. », ou une seule date si la tâche tient sur un jour. */
  rangeLabel(t: TaskCard): string {
    const r = this.rangeOf(t);
    const from = this.fmtShort(r.from);
    return dayDiff(r.from, r.to) === 0 ? from : `${from} → ${this.fmtShort(r.to)}`;
  }
  segTitle(s: Segment): string {
    return `${s.task.taskKey} · ${s.task.title} — ${this.rangeLabel(s.task)}`;
  }
}
