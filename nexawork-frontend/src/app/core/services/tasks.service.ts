import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { KanbanColumn, TaskCard } from '@core/models/task.models';
import { KANBAN_COLUMNS, KANBAN_TASKS } from '@core/mock/tasks';

export abstract class TasksService {
  abstract columns(): Observable<KanbanColumn[]>;
  /** Cards grouped by column id. */
  abstract board(): Observable<Record<string, TaskCard[]>>;
}

@Injectable()
export class TasksMockService extends TasksService {
  columns(): Observable<KanbanColumn[]> { return of(KANBAN_COLUMNS).pipe(delay(80)); }
  board(): Observable<Record<string, TaskCard[]>> { return of(KANBAN_TASKS).pipe(delay(80)); }
}
