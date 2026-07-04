import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { KanbanColumn, TaskCard } from '@core/models/task.models';
import { KANBAN_COLUMNS, KANBAN_TASKS, TASK_BY_ID } from '@core/mock/tasks';

export abstract class TasksService {
  abstract columns(): Observable<KanbanColumn[]>;
  /** Cards grouped by column id. */
  abstract board(): Observable<Record<string, TaskCard[]>>;
  /** Resolve a single card by id (used when a @@mention opens a task modal). */
  abstract cardById(id: string): TaskCard | undefined;
}

@Injectable()
export class TasksMockService extends TasksService {
  columns(): Observable<KanbanColumn[]> { return of(KANBAN_COLUMNS).pipe(delay(80)); }
  board(): Observable<Record<string, TaskCard[]>> { return of(KANBAN_TASKS).pipe(delay(80)); }
  cardById(id: string): TaskCard | undefined { return TASK_BY_ID[id]; }
}
