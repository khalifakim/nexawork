import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import {
  Dashboard, DashboardAlert, DashboardProj, MentionKind, MyTaskRow, MyTaskSection, ReceivedMention,
} from '@core/models/accueil.models';
import { TaskResponse } from '@core/models/task.models';
import { MY_TASKS_BY_WORKSPACE, MENTIONS_BY_WORKSPACE, DASHBOARD_BY_WORKSPACE } from '@core/mock/accueil';
import { prioTuple, dueBucket } from '@core/util/task-display.util';
import { avatarColorFor, initials, slugName } from '@core/util/ui.util';
import { SessionService } from './session.service';
import { MembersService } from './members.service';

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
}

// ── Payloads backend ─────────────────────────────────────────────────────────

interface DashboardResponse {
  kpis: { activeProjects: number; inProgressTasks: number; overdueTasks: number; workspaceMembers?: number };
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

  /**
   * « Mes tâches » : tâches assignées à l'appelant (`GET /users/me/tasks`),
   * regroupées par bucket d'échéance — en retard, cette semaine, ce mois.
   */
  myTasks(): Observable<MyTaskSection[]> {
    return this.get$<TaskResponse[]>('project', '/users/me/tasks').pipe(map(tasks => {
      const rows = tasks.map(toMyTaskRow);
      const sections: MyTaskSection[] = [
        { cat: 'En retard',      color: '#F5564E', tasks: rows.filter(r => r.bucket === 'retard') },
        { cat: 'Cette semaine',  color: '#E89A2C', tasks: rows.filter(r => r.bucket === 'semaine') },
        { cat: 'Ce mois',        color: '#5B8DEF', tasks: rows.filter(r => r.bucket === 'mois') },
        { cat: 'Sans échéance',  color: '#8E8AA0', tasks: rows.filter(r => !r.bucket) },
      ];
      return sections.filter(s => s.tasks.length > 0);
    }));
  }

  /** « Mentions reçues » : mentions me visant, avec auteur, extrait et contexte. */
  mentions(): Observable<ReceivedMention[]> {
    return forkJoin({
      list: this.get$<MentionResponse[]>('messaging', '/mentions'),
      dir: this.members.directory(),
    }).pipe(map(({ list, dir }) => {
      const byId = new Map(dir.map(m => [m.userId, m]));
      return list.map(m => toMention(m, byId));
    }));
  }

  /** Tableau de bord du workspace (R1 : réservé ADMIN/OWNER — 403 sinon). */
  dashboard(): Observable<Dashboard> {
    const wsId = this.session.activeWorkspaceId();
    if (!wsId) return of(EMPTY_DASHBOARD);
    return this.get$<DashboardResponse>('project', `/workspaces/${wsId}/dashboard`).pipe(map(toDashboard));
  }
}

// ── Mapping ──────────────────────────────────────────────────────────────────

/** Ligne « Mes tâches », enrichie du bucket d'échéance servant au regroupement. */
function toMyTaskRow(t: TaskResponse): MyTaskRow & { bucket?: string } {
  const prio = prioTuple(t.priority);
  return {
    id: t.id,
    t: t.title,
    proj: t.taskKey,
    prio: [prio[0], prio[1]],
    due: t.dueDate ? formatDue(t.dueDate) : 'Sans échéance',
    bucket: dueBucket(t.dueDate),
  };
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

function toMention(m: MentionResponse, byId: Map<string | undefined, { name: string; color: string }>): ReceivedMention {
  const author = m.authorUserId ? byId.get(m.authorUserId) : undefined;
  const name = author?.name ?? 'Membre';
  const kind = mentionKind(m);
  return {
    id: m.id,
    a: name,
    initials: initials(name),
    c: author?.color ?? avatarColorFor(m.authorUserId ?? m.id),
    verb: 'vous a mentionné',
    snip: m.messageContent ?? '',
    ctx: m.channelName ? '#' + m.channelName : (m.conversationId ? 'Conversation' : 'Commentaire'),
    date: formatAgo(m.createdAt),
    kind,
    read: m.isRead,
    target: m.channelName
      ? { kind: 'channel', slug: slugName(m.channelName) }
      : m.conversationId
        ? { kind: 'conversation', slug: slugName(name) }
        : { kind: 'task', id: m.targetId ?? '' },
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

  // Avancement global : moyenne des projets actifs (le backend agrège par projet).
  const tasksTotal = projects.length;
  const tasksDone = projects.filter(p => p.p >= 100).length;

  return {
    kpis: {
      projectsActive: r.kpis?.activeProjects ?? 0,
      projectsLate: overdueProjects.length,
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
