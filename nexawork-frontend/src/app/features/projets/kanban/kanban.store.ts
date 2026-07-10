import { Injectable, effect, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { TasksService } from '@core/services/tasks.service';
import { ToastService } from '@core/services/toast.service';
import { DueBucket, KanbanColumn, StatusCat, TaskCard } from '@core/models/task.models';
import { toStatusCategory } from '@core/util/task-display.util';

export type { StatusCat } from '@core/models/task.models';

export interface KanbanFilters {
  assigne: string | null;   // avatar color
  prio: string | null;      // priority label
  ech: DueBucket | null;    // échéance bucket
}

/**
 * Single source of truth for one project's Kanban board.
 *
 * `columns` drives BOTH the board (rendered in array order) and the status
 * modal (grouped by category). Provided at the projet-shell level so each
 * project gets its own instance; the shell pushes the active `projectId` into
 * the store, which (re)loads statuses + cards from the backend on change.
 */
@Injectable()
export class KanbanStore {
  private tasksSvc = inject(TasksService);
  private toast = inject(ToastService);

  /** UUID du projet courant, poussé par `projet-shell`. `null` = pas encore résolu. */
  readonly projectId = signal<string | null>(null);

  /** Columns = statuses. Order here is the order shown on the board. */
  readonly columns = signal<KanbanColumn[]>([]);

  /** Cards keyed by their column (status) id. */
  private board = signal<Record<string, TaskCard[]>>({});

  /** Filters. */
  readonly filters = signal<KanbanFilters>({ assigne: null, prio: null, ech: null });

  /** Vrai pendant le chargement initial du board (état vide sinon). */
  readonly loading = signal(false);

  constructor() {
    effect(() => {
      const pid = this.projectId();
      if (!pid) return;
      this.loading.set(true);
      this.tasksSvc.loadBoard(pid).subscribe({
        next: ({ columns, cards }) => {
          this.columns.set(columns);
          this.board.set(cards);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  /** Cards for a column, after filters. */
  cards(colId: string): TaskCard[] {
    const f = this.filters();
    const list = this.board()[colId] ?? [];
    return list.filter(t => {
      if (f.assigne && !(t.team ?? []).includes(f.assigne)) return false;
      if (f.prio && t.prio[0] !== f.prio) return false;
      if (f.ech && t.due !== f.ech) return false;
      return true;
    });
  }

  setFilter<K extends keyof KanbanFilters>(key: K, value: KanbanFilters[K]): void {
    this.filters.update(f => ({ ...f, [key]: value }));
  }

  /** Insère une carte fraîchement créée dans sa colonne. */
  addCard(card: TaskCard): void {
    this.board.update(b => ({ ...b, [card.statusId]: [...(b[card.statusId] ?? []), card] }));
  }

  deleteTask(id: string): void {
    const snapshot = this.board();
    // Optimiste : on retire la carte tout de suite, on rétablit si le backend refuse.
    this.board.update(b => {
      const next: Record<string, TaskCard[]> = {};
      for (const [col, list] of Object.entries(b)) next[col] = list.filter(t => t.id !== id);
      return next;
    });
    this.tasksSvc.deleteTask(id).subscribe({ error: () => this.board.set(snapshot) });
  }

  /**
   * Déplace une carte vers une autre colonne (drag-and-drop) et persiste la
   * transition. Optimiste : la carte bouge immédiatement ; si la FSM refuse
   * (422, toast par l'intercepteur) on rétablit la position d'origine.
   */
  moveTask(taskId: string, toColId: string): void {
    const snapshot = this.board();
    let moved: TaskCard | undefined;
    for (const list of Object.values(snapshot)) {
      const found = list.find(t => t.id === taskId);
      if (found) { moved = found; break; }
    }
    if (!moved || moved.statusId === toColId) return;

    const card = { ...moved, statusId: toColId };
    this.board.update(b => {
      const next: Record<string, TaskCard[]> = {};
      for (const [col, list] of Object.entries(b)) next[col] = list.filter(t => t.id !== taskId);
      (next[toColId] ??= []).push(card);
      return next;
    });

    const toName = this.columns().find(c => c.id === toColId)?.name ?? '';
    this.tasksSvc.changeStatus(taskId, toColId).subscribe({
      next: fresh => {
        this.board.update(b => ({
          ...b,
          [toColId]: (b[toColId] ?? []).map(t => t.id === taskId ? { ...fresh } : t),
        }));
        // V5.1 §8 : confirmation de la transition persistée.
        this.toast.show({ message: `${fresh.taskKey} déplacée vers « ${toName} »` });
      },
      error: () => this.board.set(snapshot),
    });
  }

  // ── Column / status mutations (shared with the status modal) ────────────────
  // I2c : chaque mutation de statut est persistée (Project Service §8.2.1).
  private updateColumn(id: string, patch: Partial<KanbanColumn>): void {
    this.columns.update(cols => cols.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  /** Renommage local (au fil de la frappe) — la persistance a lieu au blur. */
  renameColumn(id: string, name: string): void { this.updateColumn(id, { name }); }

  /** Persiste le nom courant du statut (appelé au blur du champ). */
  commitRename(id: string): void {
    const name = this.columns().find(c => c.id === id)?.name?.trim();
    if (name) this.tasksSvc.updateStatus(id, { name }).subscribe();
  }

  setColor(id: string, color: string): void {
    this.updateColumn(id, { color });
    this.tasksSvc.updateStatus(id, { color }).subscribe();
  }

  deleteColumn(id: string): void {
    const snapshot = this.columns();
    this.columns.update(cols => cols.filter(c => c.id !== id));
    // Le backend refuse (409) la suppression d'un statut qui porte des tâches → on rétablit.
    this.tasksSvc.deleteStatus(id).subscribe({ error: () => this.columns.set(snapshot) });
  }

  /**
   * Crée un statut en base puis l'ajoute au board (position = fin de sa
   * catégorie). Émet la colonne créée pour permettre l'édition inline immédiate.
   */
  addColumnAsync(cat: StatusCat = 'active'): Observable<KanbanColumn> {
    const pid = this.projectId();
    const position = this.columns().length;
    const obs = this.tasksSvc.createStatus(pid!, {
      name: 'Nouveau statut', category: toStatusCategory(cat), color: '#6C70F0', position,
    });
    obs.subscribe(col => this.columns.update(cols => this.insertInCategory(cols, col)));
    return obs;
  }

  /** Insère une colonne juste après la dernière de sa catégorie (ordre du board). */
  private insertInCategory(cols: KanbanColumn[], col: KanbanColumn): KanbanColumn[] {
    const arr = [...cols];
    let last = -1;
    arr.forEach((c, i) => { if (c.cat === col.cat) last = i; });
    if (last < 0) arr.push(col); else arr.splice(last + 1, 0, col);
    return arr;
  }

  /** Statuses in a given category, in array order. */
  byCat(cat: StatusCat): KanbanColumn[] { return this.columns().filter(c => c.cat === cat); }

  /** Monte/descend un statut d'un cran (modal Workflow) et persiste les positions. */
  reorderStatus(id: string, dir: -1 | 1): void {
    const cols = [...this.columns()];
    const i = cols.findIndex(c => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cols.length) return;
    [cols[i], cols[j]] = [cols[j], cols[i]];
    const reindexed = cols.map((c, k) => ({ ...c, position: k }));
    this.columns.set(reindexed);
    this.tasksSvc.updateStatus(reindexed[i].id, { position: i }).subscribe();
    this.tasksSvc.updateStatus(reindexed[j].id, { position: j }).subscribe();
  }

  /**
   * Drag-and-drop d'un statut : change sa catégorie et/ou sa position. L'ordre du
   * tableau = l'ordre des positions ; on persiste les positions réindexées et la
   * nouvelle catégorie du statut déplacé.
   */
  moveStatus(dragId: string, cat: StatusCat, beforeId: string | null): void {
    const before = this.columns();
    let reordered: KanbanColumn[] = before;
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
      reordered = arr.map((c, i) => ({ ...c, position: i }));
      return reordered;
    });
    this.persistOrder(before, reordered, dragId, cat);
  }

  /** Persiste les positions modifiées + la catégorie du statut déplacé. */
  private persistOrder(before: KanbanColumn[], after: KanbanColumn[], movedId: string, movedCat: StatusCat): void {
    const prevPos = new Map(before.map(c => [c.id, c.position]));
    for (const c of after) {
      const patch: { position?: number; category?: ReturnType<typeof toStatusCategory> } = {};
      if (prevPos.get(c.id) !== c.position) patch.position = c.position;
      if (c.id === movedId) patch.category = toStatusCategory(movedCat);
      if (patch.position !== undefined || patch.category !== undefined) {
        this.tasksSvc.updateStatus(c.id, patch).subscribe();
      }
    }
  }
}
