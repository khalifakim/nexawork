import {
  DueBucket, KanbanColumn, StatusCat, StatusCategory, StatusResponse,
  TaskCard, TaskPriority, TaskResponse,
} from '@core/models/task.models';
import { avatarColorFor, tintOf } from './ui.util';

/**
 * Traduit les payloads du Project Service vers les modèles d'affichage attendus
 * par les templates (tuples `[label, couleur, fond]`, buckets d'échéance,
 * couleurs d'avatar). Les composants ne connaissent que ces formes-là — elles
 * n'ont pas bougé depuis la version mock.
 */

/** Priorité → `[label, couleur, fond teinté]`. */
const PRIO: Record<TaskPriority, [string, string, string]> = {
  LOW:    ['Basse',   '#2BB673', 'rgba(43,182,115,.12)'],
  MEDIUM: ['Moyenne', '#E89A2C', 'rgba(232,154,44,.14)'],
  HIGH:   ['Haute',   '#F5564E', 'rgba(245,86,78,.12)'],
  URGENT: ['Urgente', '#E0497B', 'rgba(224,73,123,.14)'],
};

export function prioTuple(p: TaskPriority): [string, string, string] {
  return PRIO[p] ?? PRIO.MEDIUM;
}

/** Libellé de priorité (valeur des options du filtre « Priorité »). */
export function prioLabel(p: TaskPriority): string { return prioTuple(p)[0]; }

const CAT: Record<StatusCategory, StatusCat> = {
  NOT_STARTED: 'notstarted',
  ACTIVE:      'active',
  DONE:        'done',
  CLOSED:      'closed',
};
const CAT_INVERSE: Record<StatusCat, StatusCategory> = {
  notstarted: 'NOT_STARTED',
  active:     'ACTIVE',
  done:       'DONE',
  closed:     'CLOSED',
};

export function toStatusCat(c: StatusCategory): StatusCat { return CAT[c] ?? 'active'; }
export function toStatusCategory(c: StatusCat): StatusCategory { return CAT_INVERSE[c] ?? 'ACTIVE'; }

/** Couleur de repli d'un statut sans couleur définie. */
const DEFAULT_STATUS_COLOR = '#8E8AA0';

export function toColumn(s: StatusResponse): KanbanColumn {
  return {
    id: s.id,
    name: s.name,
    color: s.color || DEFAULT_STATUS_COLOR,
    cat: toStatusCat(s.category),
    position: s.position,
    isInitial: s.isInitial,
    isFinal: s.isFinal,
  };
}

const DAY_MS = 86_400_000;

/**
 * Range une échéance dans le bucket du filtre : dépassée, sous 7 jours, sous
 * 31 jours. Au-delà (ou sans échéance) la tâche n'apparaît dans aucun bucket.
 */
export function dueBucket(dueDate?: string): DueBucket | undefined {
  if (!dueDate) return undefined;
  const due = new Date(dueDate + 'T00:00:00');
  if (Number.isNaN(due.getTime())) return undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / DAY_MS);

  if (days < 0) return 'retard';
  if (days <= 7) return 'semaine';
  if (days <= 31) return 'mois';
  return undefined;
}

/**
 * `TaskResponse` → `TaskCard`.
 *
 * Le backend porte **un seul** assigné (utilisateur ou équipe) : `team` contient
 * donc zéro ou une couleur d'avatar. Le `tag` reprend le statut courant, avec la
 * couleur de sa colonne quand elle est connue.
 */
export function toCard(t: TaskResponse, statusColor?: string): TaskCard {
  const color = statusColor || DEFAULT_STATUS_COLOR;
  return {
    id: t.id,
    projectId: t.projectId,
    taskKey: t.taskKey,
    title: t.title,
    desc: t.description ?? '',
    statusId: t.statusId,
    priority: t.priority,
    prio: prioTuple(t.priority),
    tag: [t.statusName, color],
    team: t.assigneeId ? [avatarColorFor(t.assigneeId)] : [],
    assigneeType: t.assigneeType,
    assigneeId: t.assigneeId,
    startDate: t.startDate,
    dueDate: t.dueDate,
    estimate: t.estimate,
    links: t.attachmentCount ?? 0,
    comments: t.commentCount ?? 0,
    due: dueBucket(t.dueDate),
    createdDate: t.createdDate,
  };
}

/** Fond teinté d'une pastille de statut. Réexporté pour les templates Kanban. */
export { tintOf };
