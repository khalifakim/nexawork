import { StatusResponse, TaskResponse } from '@core/models/task.models';

/**
 * Raw Kanban fixture — volontairement au **format des payloads backend**
 * (`StatusResponse` / `TaskResponse`). `TasksMockService` leur applique le même
 * mapping que `TasksHttpService`, ce qui garantit que mock et réel produisent
 * exactement les mêmes cartes.
 */
export const MOCK_STATUSES: StatusResponse[] = [
  { id: 'todo',   name: 'À faire',     color: '#8E8AA0', category: 'NOT_STARTED', position: 0, isInitial: true,  isFinal: false },
  { id: 'doing',  name: 'En cours',    color: '#5B8DEF', category: 'ACTIVE',      position: 1, isInitial: false, isFinal: false },
  { id: 'review', name: 'En révision', color: '#E89A2C', category: 'ACTIVE',      position: 2, isInitial: false, isFinal: false },
  { id: 'done',   name: 'Validé',      color: '#2BB673', category: 'DONE',        position: 3, isInitial: false, isFinal: true  },
];

/** Date ISO (yyyy-mm-dd) décalée de `days` par rapport à aujourd'hui. */
function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const PROJECT = 'refonte-app-mobile';
const CREATED = '2025-09-11T09:00:00';

export const MOCK_TASKS: TaskResponse[] = [
  { id: 'MOB-101', projectId: PROJECT, taskKey: 'MOB-101', title: 'Wireframes écran onboarding',      description: '3 variantes à présenter à la revue produit.',            statusId: 'todo',   statusName: 'À faire',     priority: 'HIGH',   assigneeType: 'USER', assigneeId: 'u2', dueDate: inDays(4),   subtaskCount: 0, commentCount: 4, attachmentCount: 2, createdDate: CREATED },
  { id: 'MOB-118', projectId: PROJECT, taskKey: 'MOB-118', title: 'Audit accessibilité WCAG',          description: 'Contrastes et navigation clavier sur tous les écrans.',  statusId: 'todo',   statusName: 'À faire',     priority: 'MEDIUM', assigneeType: 'USER', assigneeId: 'u4', dueDate: inDays(20),  subtaskCount: 0, commentCount: 0, attachmentCount: 1, createdDate: CREATED },
  { id: 'MOB-094', projectId: PROJECT, taskKey: 'MOB-094', title: 'Intégration écran profil utilisateur', description: 'Composants React Native + états de chargement.',      statusId: 'doing',  statusName: 'En cours',    priority: 'HIGH',   assigneeType: 'USER', assigneeId: 'u3', dueDate: inDays(-3),  subtaskCount: 1, commentCount: 2, attachmentCount: 5, createdDate: CREATED },
  { id: 'MOB-130', projectId: PROJECT, taskKey: 'MOB-130', title: 'API auth — refresh token',           description: "Gestion de l'expiration et du renouvellement silencieux.", statusId: 'doing', statusName: 'En cours',    priority: 'MEDIUM', assigneeType: 'USER', assigneeId: 'u5', dueDate: inDays(6),   subtaskCount: 0, commentCount: 6, attachmentCount: 3, createdDate: CREATED },
  { id: 'MOB-077', projectId: PROJECT, taskKey: 'MOB-077', title: 'Page paramètres — design final',     description: 'En attente de validation du chef de projet.',            statusId: 'review', statusName: 'En révision', priority: 'LOW',    assigneeType: 'USER', assigneeId: 'u2', dueDate: inDays(25),  subtaskCount: 0, commentCount: 1, attachmentCount: 4, createdDate: CREATED },
  { id: 'MOB-088', projectId: PROJECT, taskKey: 'MOB-088', title: 'Composant Kanban drag-drop',         description: 'Comportement de drop entre colonnes à revoir.',          statusId: 'review', statusName: 'En révision', priority: 'MEDIUM', assigneeType: 'USER', assigneeId: 'u3', dueDate: inDays(5),   subtaskCount: 0, commentCount: 5, attachmentCount: 3, createdDate: CREATED },
  { id: 'MOB-061', projectId: PROJECT, taskKey: 'MOB-061', title: 'Système de design tokens',           description: 'Couleurs, typo et espacements exportés.',                statusId: 'done',   statusName: 'Validé',      priority: 'MEDIUM', assigneeType: 'USER', assigneeId: 'u4', dueDate: inDays(18),  subtaskCount: 0, commentCount: 3, attachmentCount: 8, createdDate: CREATED },
  { id: 'MOB-055', projectId: PROJECT, taskKey: 'MOB-055', title: 'Setup CI/CD mobile',                 description: 'Pipeline build + tests automatisés.',                    statusId: 'done',   statusName: 'Validé',      priority: 'HIGH',   assigneeType: 'USER', assigneeId: 'u5', dueDate: inDays(-9),  subtaskCount: 0, commentCount: 0, attachmentCount: 2, createdDate: CREATED },
];
