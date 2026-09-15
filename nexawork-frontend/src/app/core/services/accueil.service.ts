import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { catchError, delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import {
  Dashboard, DashboardAlert, DashboardProj, MentionKind, MyTaskRow, MyTaskSection, ReceivedMention,
  ReceivedCommentMentionResponse, TaskUrgency,
} from '@core/models/accueil.models';
import { TaskResponse } from '@core/models/task.models';
import { MY_TASKS_BY_WORKSPACE, MENTIONS_BY_WORKSPACE, DASHBOARD_BY_WORKSPACE } from '@core/mock/accueil';
import { prioTuple } from '@core/util/task-display.util';
import { avatarColorFor, initials, slugName } from '@core/util/ui.util';
import { SessionService } from './session.service';
import { MembersService } from './members.service';
import { ProjectsService } from './projects.service';

const EMPTY_DASHBOARD: Dashboard = {
  kpis: { projectsActive: 0, projectsLate: 0, projectsArchived: 0, tasksDone: 0, tasksTotal: 0, tasksOverdue: 0, tasksOverdueProjects: 0, members: 0, membersOnline: 0 },
  charge: [], alerts: [], overdueProjects: [], projects: [],
};

/**
 * Accueil data (workspace-scoped): mes tâches, mentions reçues, tableau de bord.
 * Swap `AccueilMockService` for `AccueilHttpService` via `environment.mock.accueil`.
 */
export abstract class AccueilService {
  abstract myTasks(): Observable<MyTaskSection[]>;
  abstract mentions(): Observable<ReceivedMention[]>;
  abstract dashboard(): Observable<Dashboard>;
  /** Marque une mention (messagerie) comme lue. */
  abstract markMentionRead(id: string): Observable<void>;
  /** Marque toutes les mentions (messagerie) comme lues. */
  abstract markAllMentionsRead(): Observable<void>;
}

@Injectable()
export class AccueilMockService extends AccueilService {
  private readonly session = inject(SessionService);

  myTasks(): Observable<MyTaskSection[]> {
    return of(MY_TASKS_BY_WORKSPACE[this.session.activeWorkspaceId()] ?? []).pipe(delay(80));
  }
  mentions(): Observable<ReceivedMention[]> {
    return of(MENTIONS_BY_WORKSPACE[this.session.activeWorkspaceId()] ?? []).pipe(delay(80));
  }
  dashboard(): Observable<Dashboard> {
    return of(DASHBOARD_BY_WORKSPACE[this.session.activeWorkspaceId()] ?? EMPTY_DASHBOARD).pipe(delay(80));
  }
  markMentionRead(_id: string): Observable<void> { return of(void 0); }
  markAllMentionsRead(): Observable<void> { return of(void 0); }
}

// ── Payloads backend ─────────────────────────────────────────────────────────

interface DashboardResponse {
  kpis: { activeProjects: number; inProgressTasks: number; overdueTasks: number; workspaceMembers?: number; totalTasks?: number; completedTasks?: number };
  workload: { projectId: string; projectName: string; color?: string; activeTaskCount: number }[];
  alerts: { type: string; severity: string; message: string; projectId?: string }[];
  activeProjectsList: {
    id: string; name: string; color?: string; progress: number; status: string;
    endDate?: string; daysRemaining?: number; health: string;
  }[];
  overdueProjects: { id: string; name: string; color?: string; count: number }[];
}

interface MentionResponse {
  id: string;
  messageId: string;
  mentionType: 'USER' | 'TASK' | 'DOCUMENT' | 'CHANNEL';
  targetId?: string;
  targetText?: string;
  isRead: boolean;
  createdAt: string;
  authorUserId?: string;
  messageContent?: string;
  channelId?: string;
  channelName?: string;
  conversationId?: string;
}

@Injectable()
export class AccueilHttpService extends BaseHttpService implements AccueilService {
  private readonly session = inject(SessionService);
  private readonly members = inject(MembersService);
  private readonly projects = inject(ProjectsService);

  /**
   * « Mes tâches » (V5.1 §5.1) : toutes les tâches assignées à l'appelant
   * (`GET /users/me/tasks`), en **une liste plate**, tous projets confondus.
   * L'urgence (en retard / échéance proche) n'est plus un regroupement ici : elle
   * est portée par le **bandeau « Alertes »** via le champ {@code urg} de chaque ligne.
   *
   * Le nom du projet n'est pas porté par la tâche : il est résolu depuis la
   * liste des projets (la colonne « Projet » de chaque ligne).
   */
  myTasks(): Observable<MyTaskSection[]> {
    return forkJoin({
      tasks: this.get$<TaskResponse[]>('project', '/users/me/tasks'),
      projects: this.projects.list(),
    }).pipe(map(({ tasks, projects }) => {
      const projectName = new Map(projects.map(p => [p.id, p.name]));
      const rows = tasks.map(t => toMyTaskRow(t, projectName.get(t.projectId) ?? ''));
      return rows.length ? [{ cat: 'Mes tâches', color: '#5B8DEF', tasks: rows }] : [];
    }));
  }

  /** « Mentions reçues » : mentions me visant, avec auteur, extrait et contexte. */
  mentions(): Observable<ReceivedMention[]> {
    return forkJoin({
      list: this.get$<MentionResponse[]>('messaging', '/mentions'),
      // Mentions dans les commentaires (Project) → onglet « Commentaires ». Tolérant
      // aux pannes : un échec ne doit pas vider les mentions de messagerie.
      comments: this.get$<ReceivedCommentMentionResponse[]>('project', '/comment-mentions')
        .pipe(catchError(() => of<ReceivedCommentMentionResponse[]>([]))),
      dir: this.members.directory(),
    }).pipe(map(({ list, comments, dir }) => {
      const byId = new Map(dir.map(m => [m.userId, m]));
      return [
        ...list.map(m => toMention(m, byId)),
        ...comments.map(c => toCommentMention(c, byId)),
      ];
    }));
  }

  /** Tableau de bord du workspace (R1 : réservé ADMIN/OWNER — 403 sinon). */
  dashboard(): Observable<Dashboard> {
    const wsId = this.session.activeWorkspaceId();
    if (!wsId) return of(EMPTY_DASHBOARD);
    return this.get$<DashboardResponse>('project', `/workspaces/${wsId}/dashboard`).pipe(map(toDashboard));
  }
  markMentionRead(id: string): Observable<void> {
    return this.patch$<void>('messaging', `/mentions/${id}/read`, {});
  }
  markAllMentionsRead(): Observable<void> {
    return this.post$<void>('messaging', '/mentions/mark-all-read', {}).pipe(map(() => void 0));
  }
}

// ── Mapping ──────────────────────────────────────────────────────────────────

/** Ligne « Mes tâches », enrichie de son urgence d'échéance (bandeau Alertes). */
function toMyTaskRow(t: TaskResponse, projectName: string): MyTaskRow {
  const prio = prioTuple(t.priority);
  return {
    id: t.id,
    key: t.taskKey,
    t: t.title,
    proj: projectName,
    prio: [prio[0], prio[1]],
    due: t.dueDate ? formatDue(t.dueDate) : '',
    urg: urgencyOf(t.dueDate),
  };
}

/** Seuil « échéance proche » (en jours) pour le bandeau « Alertes ». */
const DUE_SOON_DAYS = 3;

/**
 * Urgence d'une tâche d'après son échéance (bandeau « Alertes ») :
 * - `overdue` : échéance **dépassée** ;
 * - `soon` : échéance dans les **{@link DUE_SOON_DAYS} prochains jours** (aujourd'hui inclus) ;
 * - `other` : plus lointaine ou sans échéance.
 */
function urgencyOf(dueDate?: string): TaskUrgency {
  if (!dueDate) return 'other';
  const d = new Date(dueDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return 'other';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return 'overdue';
  if (days <= DUE_SOON_DAYS) return 'soon';
  return 'other';
}

function formatDue(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return 'En retard de ' + Math.abs(days) + ' j';
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  if (days <= 7) return 'Dans ' + days + ' jours';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Type de mention → onglet de la vue « Mentions reçues ». */
function mentionKind(m: MentionResponse): MentionKind {
  if (m.channelId) return 'Canaux';
  if (m.conversationId) return 'Discussions';
  return 'Commentaires';
}

/** Mention de commentaire (Project) → ligne « Mentions reçues » (onglet Commentaires). */
function toCommentMention(
  c: ReceivedCommentMentionResponse,
  byId: Map<string | undefined, { name: string; color: string; photoUrl?: string }>,
): ReceivedMention {
  const author = byId.get(c.authorUserId);
  const name = author?.name ?? 'Membre';
  return {
    id: c.commentId,
    a: name,
    initials: initials(name),
    photoUrl: author?.photoUrl,
    c: author?.color ?? avatarColorFor(c.authorUserId),
    verb: 'vous a mentionné',
    snip: c.excerpt ?? '',
    ctx: c.taskKey ? c.taskKey + ' · ' + c.projectName : 'Commentaire',
    date: formatAgo(c.createdAt),
    kind: 'Commentaires',
    // Le domaine Project n'expose pas l'état « lu » des mentions de commentaires :
    // elles sont non-lues par défaut et marquées lues localement (store) au clic.
    read: false,
    // Ouvre la fiche de tâche ancrée sur le commentaire.
    target: { kind: 'task', id: c.taskId, commentId: c.commentId },
  };
}

function toMention(
  m: MentionResponse,
  byId: Map<string | undefined, { name: string; color: string; photoUrl?: string }>,
): ReceivedMention {
  const author = m.authorUserId ? byId.get(m.authorUserId) : undefined;
  const name = author?.name ?? 'Membre';
  const kind = mentionKind(m);
  return {
    id: m.id,
    a: name,
    initials: initials(name),
    photoUrl: author?.photoUrl,
    c: author?.color ?? avatarColorFor(m.authorUserId ?? m.id),
    verb: 'vous a mentionné',
    snip: m.messageContent ?? '',
    ctx: m.channelName ? '#' + m.channelName : (m.conversationId ? 'Conversation' : 'Commentaire'),
    date: formatAgo(m.createdAt),
    kind,
    read: m.isRead,
    // `targetId` n'est pas résolu côté Messaging : on retombe sur le libellé
    // mentionné (la clé lisible de la tâche), que `TasksService` sait résoudre.
    target: m.channelName
      ? { kind: 'channel', slug: slugName(m.channelName) }
      : m.conversationId
        ? { kind: 'conversation', slug: slugName(name) }
        : { kind: 'task', id: m.targetId ?? m.targetText ?? '' },
  };
}

function formatAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const min = Math.round((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return "À l'instant";
  if (min < 60) return min + ' min';
  const h = Math.round(min / 60);
  if (h < 24) return h + ' h';
  const j = Math.round(h / 24);
  return j === 1 ? 'hier' : j + ' j';
}

/** `health` backend → état d'affichage du projet. */
function health(h: string): DashboardProj['e'] {
  const v = (h ?? '').toUpperCase();
  if (v.includes('CRITIQUE')) return 'critique';
  if (v.includes('SURVEILLER')) return 'surveiller';
  return 'bonne';
}

function toDashboard(r: DashboardResponse): Dashboard {
  const projects: DashboardProj[] = (r.activeProjectsList ?? []).map(p => ({
    id: p.id,
    n: p.name,
    c: p.color ?? '#5B5FE9',
    p: p.progress ?? 0,
    due: p.endDate ? new Date(p.endDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—',
    days: p.daysRemaining ?? 0,
    e: health(p.health),
  }));

  const alerts: DashboardAlert[] = (r.alerts ?? []).map(a => ({
    icon: a.severity === 'critique' ? 'warning' : 'info',
    t: a.message,
    s: a.severity,
    danger: a.severity === 'critique',
    target: a.projectId ? { kind: 'projet', id: a.projectId } : { kind: 'taches' },
  }));

  const overdueProjects = (r.overdueProjects ?? []).map(p => ({
    id: p.id, n: p.name, c: p.color ?? '#5B5FE9', count: p.count,
  }));

  // Tâches terminées / total : agrégat réel de toutes les tâches des projets
  // actifs du workspace (fourni par le backend), pas un décompte de projets.
  const tasksTotal = r.kpis?.totalTasks ?? 0;
  const tasksDone = r.kpis?.completedTasks ?? 0;
  // Projets « en retard » = projets actifs dont l'échéance est **dépassée**
  // (jours restants < 0), et non ceux ayant des tâches en retard.
  const projectsLate = projects.filter(p => p.days < 0).length;

  return {
    kpis: {
      projectsActive: r.kpis?.activeProjects ?? 0,
      projectsLate,
      projectsArchived: 0,
      tasksDone,
      tasksTotal,
      tasksOverdue: r.kpis?.overdueTasks ?? 0,
      tasksOverdueProjects: overdueProjects.length,
      members: r.kpis?.workspaceMembers ?? 0,
      // KPI « membres en ligne » retirée du tableau de bord (V5.1 §5.2).
      membersOnline: 0,
    },
    charge: (r.workload ?? []).map(w => ({
      id: w.projectId, n: w.projectName, v: w.activeTaskCount, c: w.color ?? '#5B5FE9',
    })),
    alerts,
    overdueProjects,
    projects,
  };
}
