/** ── Mes tâches ─────────────────────────────────────────────────────────── */
export interface MyTaskRow { id: string; t: string; proj: string; prio: [string, string]; due: string; }
export interface MyTaskSection { cat: string; color: string; tasks: MyTaskRow[]; }

/** ── Mentions reçues ───────────────────────────────────────────────────────
 * `target` is a serialisable descriptor of where a mention leads (no closures,
 * so the mock maps 1:1 to a future API payload).
 */
export type MentionKind = 'Canaux' | 'Discussions' | 'Commentaires';
export type MentionTarget =
  | { kind: 'task'; id: string }
  | { kind: 'conversation'; slug: string }
  | { kind: 'channel'; slug: string };

export interface ReceivedMention {
  id: string;
  a: string; initials: string; c: string;
  verb: string; snip: string; ctx: string; date: string;
  kind: MentionKind;
  read?: boolean;
  target: MentionTarget;
}

/** ── Tableau de bord ───────────────────────────────────────────────────────
 * `id` carries the project id so charts/rows can navigate straight to a project.
 */
export interface DashboardCharge { id: string; n: string; v: number; c: string; }
export interface DashboardProj { id: string; n: string; c: string; p: number; due: string; days: number; e: 'bonne' | 'surveiller' | 'critique'; }
/** A project appearing in the "tâches en retard" breakdown modal. */
export interface DashboardOverdueProject { id: string; n: string; c: string; count: number; }
export type DashboardAlertTarget = { kind: 'taches' } | { kind: 'projet'; id: string };
export interface DashboardAlert { icon: string; t: string; s: string; danger: boolean; target: DashboardAlertTarget; }

export interface DashboardKpis {
  projectsActive: number; projectsLate: number; projectsArchived: number;
  tasksDone: number; tasksTotal: number;
  tasksOverdue: number; tasksOverdueProjects: number;
  members: number; membersOnline: number;
}

export interface Dashboard {
  kpis: DashboardKpis;
  charge: DashboardCharge[];
  alerts: DashboardAlert[];
  overdueProjects: DashboardOverdueProject[];
  projects: DashboardProj[];
}
