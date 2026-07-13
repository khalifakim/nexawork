import { Injectable, inject } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import { SKIP_ERROR_TOAST } from '@core/http/http-context';
import { FilesHttpService, StoredFile } from '@core/http/files.http.service';
import {
  AttachmentResponse, CommentResponse, CreateStatusPayload, CreateTaskPayload, KanbanColumn,
  ProjectOverviewResponse, StatusResponse, SubTask, SubTaskResponse, TaskAttachment, TaskCard,
  TaskComment, TaskResponse, Transition, TransitionResponse, UpdateStatusPayload, UpdateTaskPayload,
  WorkflowUpdatePayload,
} from '@core/models/task.models';
import { MOCK_STATUSES, MOCK_TASKS } from '@core/mock/tasks';
import { toCard, toColumn } from '@core/util/task-display.util';
import { SessionService } from './session.service';

/** Colonnes + cartes groupées par statut — tout ce qu'il faut pour peindre un board. */
export interface BoardData {
  columns: KanbanColumn[];
  /** Cartes indexées par `statusId` (= id de colonne). */
  cards: Record<string, TaskCard[]>;
}

/**
 * Tâches & board Kanban (Project Service §13.5-6). Tout est projeté par
 * `projectId` : statuts et tâches appartiennent à un projet donné. Les fichiers
 * (pièces jointes de tâche + de commentaire) transitent par le File Service.
 */
export abstract class TasksService {
  /** Un seul aller-retour : statuts + tâches du projet, déjà groupés. */
  abstract loadBoard(projectId: string): Observable<BoardData>;
  /** Résout une carte par son id (mention `@@tâche` ouverte hors du board). */
  abstract cardById(id: string): Observable<TaskCard | undefined>;
  abstract createTask(projectId: string, req: CreateTaskPayload): Observable<TaskCard>;
  abstract updateTask(id: string, patch: UpdateTaskPayload): Observable<TaskCard>;
  abstract deleteTask(id: string): Observable<void>;
  /** `PATCH /tasks/{id}/status` — 422 si la FSM refuse la transition (workflow strict). */
  abstract changeStatus(id: string, toStatusId: string, silent?: boolean): Observable<TaskCard>;

  // ── Sous-tâches ─────────────────────────────────────────────────────────────
  abstract subtasks(taskId: string): Observable<SubTask[]>;
  abstract addSubtask(taskId: string, title: string): Observable<SubTask>;
  abstract setSubtaskDone(taskId: string, subTaskId: string, done: boolean): Observable<SubTask>;
  abstract removeSubtask(taskId: string, subTaskId: string): Observable<void>;

  // ── Commentaires (avec pièces jointes) ──────────────────────────────────────
  abstract comments(taskId: string): Observable<TaskComment[]>;
  /** Poste un commentaire ; les fichiers sont d'abord poussés au File Service. */
  abstract addComment(taskId: string, projectId: string, content: string, files: File[]): Observable<TaskComment>;
  abstract removeComment(taskId: string, commentId: string): Observable<void>;

  // ── Pièces jointes de la tâche ──────────────────────────────────────────────
  abstract attachments(taskId: string): Observable<TaskAttachment[]>;
  abstract addAttachment(taskId: string, projectId: string, file: File): Observable<TaskAttachment>;
  abstract removeAttachment(taskId: string, attachmentId: string): Observable<void>;

  // ── Statuts & workflow (configuration du board, R8) ─────────────────────────
  abstract createStatus(projectId: string, payload: CreateStatusPayload): Observable<KanbanColumn>;
  abstract updateStatus(statusId: string, patch: UpdateStatusPayload): Observable<void>;
  abstract deleteStatus(statusId: string): Observable<void>;
  abstract transitions(projectId: string): Observable<Transition[]>;
  abstract updateWorkflow(projectId: string, payload: WorkflowUpdatePayload): Observable<void>;

  // ── Vue d'ensemble projet (§6.4.1) ──────────────────────────────────────────
  abstract overview(projectId: string): Observable<ProjectOverviewResponse>;
}

function toTransition(r: TransitionResponse): Transition {
  return {
    id: r.id, fromStatusId: r.fromStatusId, fromStatusName: r.fromStatusName,
    toStatusId: r.toStatusId, toStatusName: r.toStatusName,
    responsibleType: r.responsibleType ?? 'ALL',
    responsibleUserId: r.responsibleUserId,
    allowedRoles: r.allowedRoles ?? [],
  };
}

/** Groupe des cartes par statut, en garantissant une entrée par colonne. */
function group(columns: KanbanColumn[], cards: TaskCard[]): Record<string, TaskCard[]> {
  const rec: Record<string, TaskCard[]> = {};
  for (const c of columns) rec[c.id] = [];
  for (const card of cards) (rec[card.statusId] ??= []).push(card);
  return rec;
}

/** Index couleur d'un statut, pour teinter la pastille de statut d'une carte. */
function colorIndex(statuses: StatusResponse[]): Record<string, string | undefined> {
  return Object.fromEntries(statuses.map(s => [s.id, s.color]));
}

function toSubTask(r: SubTaskResponse): SubTask {
  return { id: r.id, taskId: r.taskId, title: r.title, done: r.isCompleted, assigneeUserId: r.assigneeUserId };
}
function toComment(r: CommentResponse): TaskComment {
  return {
    id: r.id, taskId: r.taskId, authorUserId: r.authorUserId, content: r.content, createdAt: r.createdAt,
    attachments: (r.attachments ?? []).map(a => ({
      id: a.id, name: a.fileName, url: a.fileUrl, size: a.fileSize, contentType: a.contentType,
    })),
  };
}
function toAttachment(r: AttachmentResponse): TaskAttachment {
  return {
    id: r.id, taskId: r.taskId, name: r.fileName, url: r.fileUrl, size: r.fileSize, contentType: r.contentType,
    uploadedByUserId: r.uploadedByUserId, uploadedAt: r.uploadedAt,
  };
}

@Injectable()
export class TasksMockService extends TasksService {
  private statuses: StatusResponse[] = MOCK_STATUSES.map(s => ({ ...s }));
  private tasks: TaskResponse[] = MOCK_TASKS.map(t => ({ ...t }));
  private subs: Record<string, SubTask[]> = {
    'MOB-094': [{ id: 'MOB-094-1', taskId: 'MOB-094', title: "Préparer les variantes de l'écran", done: false }],
  };
  private cmts: Record<string, TaskComment[]> = {};
  private atts: Record<string, TaskAttachment[]> = {};
  private seq = 200;

  private buildBoard(): BoardData {
    const columns = this.statuses.map(toColumn).sort((a, b) => a.position - b.position);
    const colors = colorIndex(this.statuses);
    const cards = this.tasks.map(t => toCard(t, colors[t.statusId]));
    return { columns, cards: group(columns, cards) };
  }

  loadBoard(_projectId: string): Observable<BoardData> {
    return of(this.buildBoard()).pipe(delay(80));
  }

  cardById(id: string): Observable<TaskCard | undefined> {
    const t = this.tasks.find(x => x.id === id);
    const colors = colorIndex(this.statuses);
    return of(t ? toCard(t, colors[t.statusId]) : undefined).pipe(delay(40));
  }

  createTask(projectId: string, req: CreateTaskPayload): Observable<TaskCard> {
    const statusId = req.statusId ?? this.statuses.find(s => s.isInitial)?.id ?? this.statuses[0].id;
    const status = this.statuses.find(s => s.id === statusId)!;
    const n = ++this.seq;
    const task: TaskResponse = {
      id: 'NEW-' + n, projectId, taskKey: 'NEW-' + n,
      title: req.title, description: req.description,
      statusId, statusName: status.name,
      priority: req.priority ?? 'MEDIUM',
      assigneeType: req.assigneeType, assigneeId: req.assigneeId,
      startDate: req.startDate, dueDate: req.dueDate, estimate: req.estimate,
      subtaskCount: 0, commentCount: 0, attachmentCount: 0,
      createdDate: new Date().toISOString(),
    };
    this.tasks = [...this.tasks, task];
    return of(toCard(task, status.color)).pipe(delay(80));
  }

  updateTask(id: string, patch: UpdateTaskPayload): Observable<TaskCard> {
    this.tasks = this.tasks.map(t => t.id === id ? {
      ...t,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.startDate !== undefined ? { startDate: patch.startDate } : {}),
      ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
      ...(patch.estimate !== undefined ? { estimate: patch.estimate } : {}),
      ...(patch.clearAssignee ? { assigneeId: undefined, assigneeType: undefined } : {}),
    } : t);
    const t = this.tasks.find(x => x.id === id)!;
    const colors = colorIndex(this.statuses);
    return of(toCard(t, colors[t.statusId])).pipe(delay(80));
  }

  deleteTask(id: string): Observable<void> {
    this.tasks = this.tasks.filter(t => t.id !== id);
    return of(void 0).pipe(delay(80));
  }

  changeStatus(id: string, toStatusId: string, _silent = false): Observable<TaskCard> {
    const status = this.statuses.find(s => s.id === toStatusId)!;
    this.tasks = this.tasks.map(t => t.id === id ? { ...t, statusId: toStatusId, statusName: status.name } : t);
    const t = this.tasks.find(x => x.id === id)!;
    return of(toCard(t, status.color)).pipe(delay(80));
  }

  subtasks(taskId: string): Observable<SubTask[]> { return of((this.subs[taskId] ?? []).map(s => ({ ...s }))).pipe(delay(40)); }
  addSubtask(taskId: string, title: string): Observable<SubTask> {
    const s: SubTask = { id: taskId + '-' + (++this.seq), taskId, title, done: false };
    this.subs[taskId] = [...(this.subs[taskId] ?? []), s];
    return of({ ...s }).pipe(delay(40));
  }
  setSubtaskDone(taskId: string, subTaskId: string, done: boolean): Observable<SubTask> {
    this.subs[taskId] = (this.subs[taskId] ?? []).map(s => s.id === subTaskId ? { ...s, done } : s);
    return of({ ...this.subs[taskId].find(s => s.id === subTaskId)! }).pipe(delay(40));
  }
  removeSubtask(taskId: string, subTaskId: string): Observable<void> {
    this.subs[taskId] = (this.subs[taskId] ?? []).filter(s => s.id !== subTaskId);
    return of(void 0).pipe(delay(40));
  }

  comments(taskId: string): Observable<TaskComment[]> { return of((this.cmts[taskId] ?? []).map(c => ({ ...c }))).pipe(delay(40)); }
  addComment(taskId: string, _projectId: string, content: string, files: File[]): Observable<TaskComment> {
    const c: TaskComment = {
      id: 'c' + (++this.seq), taskId, authorUserId: 'me', content, createdAt: new Date().toISOString(),
      attachments: files.map((f, i) => ({ id: 'ca' + this.seq + i, name: f.name, url: '#', size: f.size, contentType: f.type })),
    };
    this.cmts[taskId] = [...(this.cmts[taskId] ?? []), c];
    return of({ ...c }).pipe(delay(60));
  }
  removeComment(taskId: string, commentId: string): Observable<void> {
    this.cmts[taskId] = (this.cmts[taskId] ?? []).filter(c => c.id !== commentId);
    return of(void 0).pipe(delay(40));
  }

  attachments(taskId: string): Observable<TaskAttachment[]> { return of((this.atts[taskId] ?? []).map(a => ({ ...a }))).pipe(delay(40)); }
  addAttachment(taskId: string, _projectId: string, file: File): Observable<TaskAttachment> {
    const a: TaskAttachment = {
      id: 'a' + (++this.seq), taskId, name: file.name, url: '#', size: file.size, contentType: file.type,
      uploadedByUserId: 'me', uploadedAt: new Date().toISOString(),
    };
    this.atts[taskId] = [...(this.atts[taskId] ?? []), a];
    return of({ ...a }).pipe(delay(60));
  }
  removeAttachment(taskId: string, attachmentId: string): Observable<void> {
    this.atts[taskId] = (this.atts[taskId] ?? []).filter(a => a.id !== attachmentId);
    return of(void 0).pipe(delay(40));
  }

  private catToCategory(cat: string): StatusResponse['category'] {
    return ({ notstarted: 'NOT_STARTED', active: 'ACTIVE', done: 'DONE', closed: 'CLOSED' } as const)[cat] ?? 'ACTIVE';
  }
  createStatus(_projectId: string, payload: CreateStatusPayload): Observable<KanbanColumn> {
    const s: StatusResponse = {
      id: 'st-' + (++this.seq), name: payload.name, category: payload.category,
      position: payload.position ?? this.statuses.length,
      isInitial: payload.category === 'NOT_STARTED', isFinal: payload.category === 'DONE' || payload.category === 'CLOSED',
      color: payload.color,
    };
    this.statuses = [...this.statuses, s];
    return of(toColumn(s)).pipe(delay(60));
  }
  updateStatus(statusId: string, patch: UpdateStatusPayload): Observable<void> {
    this.statuses = this.statuses.map(s => s.id === statusId ? {
      ...s,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
    } : s);
    return of(void 0).pipe(delay(40));
  }
  deleteStatus(statusId: string): Observable<void> {
    this.statuses = this.statuses.filter(s => s.id !== statusId);
    return of(void 0).pipe(delay(40));
  }
  transitions(_projectId: string): Observable<Transition[]> { return of([]).pipe(delay(40)); }
  updateWorkflow(_projectId: string, _payload: WorkflowUpdatePayload): Observable<void> { return of(void 0).pipe(delay(40)); }

  overview(projectId: string): Observable<ProjectOverviewResponse> {
    const cat = (id: string) => this.statuses.find(s => s.id === id)?.category;
    const count = (c: string) => this.tasks.filter(t => cat(t.statusId) === c).length;
    const total = this.tasks.length;
    const done = count('DONE') + count('CLOSED');
    return of({
      projectId, name: 'Projet', status: 'ACTIVE',
      progress: total ? Math.round((done / total) * 100) : 0,
      totalTasks: total, notStartedTasks: count('NOT_STARTED'), activeTasks: count('ACTIVE'),
      doneTasks: count('DONE'), closedTasks: count('CLOSED'), unassignedStatusTasks: 0,
      overdueTasks: 0, memberCount: 8, upcomingDueTasks: [],
    }).pipe(delay(60));
  }
}

@Injectable()
export class TasksHttpService extends BaseHttpService implements TasksService {
  private readonly files = inject(FilesHttpService);
  private readonly session = inject(SessionService);

  loadBoard(projectId: string): Observable<BoardData> {
    return forkJoin({
      statuses: this.get$<StatusResponse[]>('project', `/projects/${projectId}/statuses`),
      tasks: this.get$<TaskResponse[]>('project', `/projects/${projectId}/tasks`),
    }).pipe(
      map(({ statuses, tasks }) => {
        const columns = statuses.map(toColumn).sort((a, b) => a.position - b.position);
        const colors = colorIndex(statuses);
        const cards = tasks.map(t => toCard(t, colors[t.statusId]));
        return { columns, cards: group(columns, cards) };
      }),
    );
  }

  cardById(id: string): Observable<TaskCard | undefined> {
    return this.get$<TaskResponse>('project', `/tasks/${id}`).pipe(map(t => toCard(t)));
  }

  createTask(projectId: string, req: CreateTaskPayload): Observable<TaskCard> {
    return this.post$<TaskResponse>('project', `/projects/${projectId}/tasks`, req).pipe(map(t => toCard(t)));
  }

  updateTask(id: string, patch: UpdateTaskPayload): Observable<TaskCard> {
    return this.patch$<TaskResponse>('project', `/tasks/${id}`, patch).pipe(map(t => toCard(t)));
  }

  deleteTask(id: string): Observable<void> {
    return this.delete$<void>('project', `/tasks/${id}`);
  }

  changeStatus(id: string, toStatusId: string, silent = false): Observable<TaskCard> {
    // `silent` : l'appelant gère l'erreur (message inline) → pas de toast centralisé.
    const context = silent ? new HttpContext().set(SKIP_ERROR_TOAST, true) : undefined;
    return this.patch$<TaskResponse>('project', `/tasks/${id}/status`, { toStatusId }, context).pipe(map(t => toCard(t)));
  }

  subtasks(taskId: string): Observable<SubTask[]> {
    return this.get$<SubTaskResponse[]>('project', `/tasks/${taskId}/subtasks`).pipe(map(rs => rs.map(toSubTask)));
  }
  addSubtask(taskId: string, title: string): Observable<SubTask> {
    return this.post$<SubTaskResponse>('project', `/tasks/${taskId}/subtasks`, { title }).pipe(map(toSubTask));
  }
  setSubtaskDone(taskId: string, subTaskId: string, done: boolean): Observable<SubTask> {
    return this.patch$<SubTaskResponse>('project', `/tasks/${taskId}/subtasks/${subTaskId}`, { isCompleted: done }).pipe(map(toSubTask));
  }
  removeSubtask(taskId: string, subTaskId: string): Observable<void> {
    return this.delete$<void>('project', `/tasks/${taskId}/subtasks/${subTaskId}`);
  }

  comments(taskId: string): Observable<TaskComment[]> {
    return this.get$<CommentResponse[]>('project', `/tasks/${taskId}/comments`).pipe(map(rs => rs.map(toComment)));
  }
  addComment(taskId: string, projectId: string, content: string, files: File[]): Observable<TaskComment> {
    const post = (stored: StoredFile[]) => this.post$<CommentResponse>('project', `/tasks/${taskId}/comments`, {
      content,
      attachments: stored.map(s => ({ fileName: s.fileName, fileUrl: s.downloadUrl, fileSize: s.size, contentType: s.contentType })),
    }).pipe(map(toComment));

    if (files.length === 0) return post([]);
    return forkJoin(files.map(f => this.uploadTaskFile(taskId, projectId, f))).pipe(switchMap(post));
  }
  removeComment(taskId: string, commentId: string): Observable<void> {
    return this.delete$<void>('project', `/tasks/${taskId}/comments/${commentId}`);
  }

  attachments(taskId: string): Observable<TaskAttachment[]> {
    return this.get$<AttachmentResponse[]>('project', `/tasks/${taskId}/attachments`).pipe(map(rs => rs.map(toAttachment)));
  }
  addAttachment(taskId: string, projectId: string, file: File): Observable<TaskAttachment> {
    return this.uploadTaskFile(taskId, projectId, file).pipe(
      switchMap(s => this.post$<AttachmentResponse>('project', `/tasks/${taskId}/attachments`, {
        fileName: s.fileName, fileUrl: s.downloadUrl, fileSize: s.size, contentType: s.contentType,
      })),
      map(toAttachment),
    );
  }
  removeAttachment(taskId: string, attachmentId: string): Observable<void> {
    return this.delete$<void>('project', `/tasks/${taskId}/attachments/${attachmentId}`);
  }

  createStatus(projectId: string, payload: CreateStatusPayload): Observable<KanbanColumn> {
    return this.post$<StatusResponse>('project', `/projects/${projectId}/statuses`, payload).pipe(map(toColumn));
  }
  updateStatus(statusId: string, patch: UpdateStatusPayload): Observable<void> {
    return this.patch$<void>('project', `/statuses/${statusId}`, patch);
  }
  deleteStatus(statusId: string): Observable<void> {
    return this.delete$<void>('project', `/statuses/${statusId}`);
  }
  transitions(projectId: string): Observable<Transition[]> {
    return this.get$<TransitionResponse[]>('project', `/projects/${projectId}/transitions`).pipe(map(rs => rs.map(toTransition)));
  }
  updateWorkflow(projectId: string, payload: WorkflowUpdatePayload): Observable<void> {
    return this.patch$<void>('project', `/projects/${projectId}/workflow`, payload);
  }
  overview(projectId: string): Observable<ProjectOverviewResponse> {
    return this.get$<ProjectOverviewResponse>('project', `/projects/${projectId}/overview`);
  }

  /** Upload d'un fichier dans le bucket task-attachment (workspace + projet + tâche). */
  private uploadTaskFile(taskId: string, projectId: string, file: File): Observable<StoredFile> {
    return this.files.upload('task-attachment', file, {
      workspaceId: this.session.activeWorkspaceId(),
      projectId,
      taskId,
    });
  }
}
