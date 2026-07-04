import { Injectable, inject, signal } from '@angular/core';
import { TasksService } from '@core/services/tasks.service';
import { DueBucket, KanbanColumn, TaskCard } from '@core/models/task.models';

/** Status category, shared by the board and the "Modifier les statuts" modal. */
export type StatusCat = 'notstarted' | 'active' | 'done' | 'closed';

export interface KanbanFilters {
  assigne: string | null;   // avatar color
  prio: string | null;      // priority label
  ech: DueBucket | null;    // échéance bucket
}

/**
 * Single source of truth for one project's Kanban board.
 *
 * `columns` drives BOTH the board (rendered in array order) and the status
 * modal (grouped by category, but reordering mutates this same array). So the
 * order of columns on the board always follows the flattened order of statuses
 * across categories in the modal — exactly like the prototype's `kanbanCols`.
 *
 * Provided at the projet-shell level so each project gets its own instance.
 */
@Injectable()
export class KanbanStore {
  private tasksSvc = inject(TasksService);

  /** Columns = statuses. Order here is the order shown on the board. */
  readonly columns = signal<KanbanColumn[]>([]);

  /** Cards keyed by their original column id. */
  private board = signal<Record<string, TaskCard[]>>({});

  /** Task id → column id override (drag-and-drop between columns). */
  private colOverrides = signal<Record<string, string>>({});

  /** Deleted task ids. */
  private deleted = signal<string[]>([]);

  /** Filters. */
  readonly filters = signal<KanbanFilters>({ assigne: null, prio: null, ech: null });

  constructor() {
    this.tasksSvc.columns().subscribe(cols => {
      // Only seed once; later edits live in the signal.
      if (this.columns().length === 0) this.columns.set(cols.map(c => ({ ...c })));
    });
    this.tasksSvc.board().subscribe(b => this.board.set(b));
  }

  /** Cards for a column, after overrides / deletions / filters. */
  cards(colId: string): TaskCard[] {
    const del = this.deleted();
    const ov = this.colOverrides();
    const f = this.filters();
    const base = this.board();

    // start from the column's own cards, minus any moved out
    let list = (base[colId] ?? []).filter(t => ov[t.id] === undefined || ov[t.id] === colId);
    // add cards moved into this column from elsewhere
    Object.entries(ov).forEach(([tid, target]) => {
      if (target !== colId) return;
      if (list.some(t => t.id === tid)) return;
      const task = Object.values(base).flat().find(t => t.id === tid);
      if (task) list = [...list, task];
    });

    return list.filter(t => {
      if (del.includes(t.id)) return false;
      if (f.assigne && !(t.team ?? []).includes(f.assigne)) return false;
      if (f.prio && t.prio[0] !== f.prio) return false;
      if (f.ech && t.due !== f.ech) return false;
      return true;
    });
  }

  setFilter<K extends keyof KanbanFilters>(key: K, value: KanbanFilters[K]): void {
    this.filters.update(f => ({ ...f, [key]: value }));
  }

  deleteTask(id: string): void { this.deleted.update(l => l.includes(id) ? l : [...l, id]); }

  /** Move a task to another column (drag-and-drop). */
  moveTask(taskId: string, toColId: string): void {
    this.colOverrides.update(o => ({ ...o, [taskId]: toColId }));
  }

  // ── Column / status mutations (shared with the status modal) ────────────────
  updateColumn(id: string, patch: Partial<KanbanColumn>): void {
    this.columns.update(cols => cols.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  renameColumn(id: string, name: string): void { this.updateColumn(id, { name }); }
  setColor(id: string, color: string): void { this.updateColumn(id, { color }); }

  deleteColumn(id: string): void {
    this.columns.update(cols => cols.filter(c => c.id !== id));
  }

  /** Append a new status at the end of a category (default: active). */
  addColumn(cat: StatusCat = 'active'): string {
    const id = 'col-' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
    this.columns.update(cols => {
      const arr = [...cols];
      let last = -1;
      arr.forEach((c, i) => { if (c.cat === cat) last = i; });
      const nc: KanbanColumn = { id, name: '', color: '#6C70F0', cat };
      if (last < 0) arr.push(nc); else arr.splice(last + 1, 0, nc);
      return arr;
    });
    return id;
  }

  /** Statuses in a given category, in array order. */
  byCat(cat: StatusCat): KanbanColumn[] { return this.columns().filter(c => c.cat === cat); }

  /**
   * Drag-and-drop a status: change its category and/or reposition it relative to
   * `beforeId`. Mutating the array here is what reorders the board columns.
   */
  moveStatus(dragId: string, cat: StatusCat, beforeId: string | null): void {
    this.columns.update(cols => {
      const arr = [...cols];
      const idx = arr.findIndex(c => c.id === dragId);
      if (idx < 0) return cols;
      const moved = { ...arr[idx], cat };
      arr.splice(idx, 1);
      let at: number;
      if (beforeId && beforeId !== moved.id) {
        at = arr.findIndex(c => c.id === beforeId);
        if (at < 0) at = arr.length;
      } else {
        let last = -1;
        arr.forEach((c, i) => { if (c.cat === cat) last = i; });
        at = last + 1;
      }
      arr.splice(at, 0, moved);
      return arr;
    });
  }
}
