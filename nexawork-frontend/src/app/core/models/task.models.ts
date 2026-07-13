/** Priorité d'une tâche (V5.1 §6.2). */
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** Assignation polymorphe : un utilisateur ou une équipe. */
export type AssigneeType = 'USER' | 'TEAM';

/** Catégorie fixe d'un statut Kanban (V5.1 §6.2). */
export type StatusCategory = 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';

/** Catégorie côté affichage (colonnes du board, groupes du modal Statuts). */
export type StatusCat = 'notstarted' | 'active' | 'done' | 'closed';

/** `StatusResponse` — payload brut d'un statut de workflow. */
export interface StatusResponse {
  id: string;
  name: string;
  category: StatusCategory;
  position: number;
  isInitial: boolean;
  isFinal: boolean;
  color?: string;
}

/** `TaskResponse` — payload brut d'une tâche. */
export interface TaskResponse {
  id: string;
  projectId: string;
  taskKey: string;
  title: string;
  description?: string;
  statusId: string;
  statusName: string;
  priority: TaskPriority;
  assigneeType?: AssigneeType;
  assigneeId?: string;
  startDate?: string;
  dueDate?: string;
  estimate?: string;
  subtaskCount: number;
  commentCount: number;
  attachmentCount: number;
  createdDate: string;
}

/** Une colonne du board = un statut de workflow. L'ordre du tableau fait foi. */
export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  cat: StatusCat;
  position: number;
  /** Statut d'entrée d'une tâche (catégorie NOT_STARTED). */
  isInitial: boolean;
  /** Statut terminal (catégories DONE / CLOSED). */
  isFinal: boolean;
}

/** Échéance bucket used by the Kanban "Échéance" filter. */
export type DueBucket = 'retard' | 'semaine' | 'mois';

export interface TaskCard {
  id: string;
  projectId: string;
  /** Identifiant lisible affiché sur la carte (`MOB-94`). */
  taskKey: string;
  title: string;
  desc: string;
  /** Statut courant = colonne dans laquelle la carte est rendue. */
  statusId: string;
  priority: TaskPriority;
  prio: [string, string, string];   // [label, color, tintBg]
  tag: [string, string];            // [label, color] — statut de la tâche
  team: string[];                   // avatar colors (assignees)
  assigneeType?: AssigneeType;
  assigneeId?: string;
  startDate?: string;
  dueDate?: string;
  estimate?: string;
  links: number;
  comments: number;
  due?: DueBucket;                  // échéance bucket for filtering
  createdDate: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeType?: AssigneeType;
  assigneeId?: string;
  statusId?: string;
  startDate?: string;
  dueDate?: string;
  estimate?: string;
}

export interface UpdateTaskPayload extends Omit<CreateTaskPayload, 'title' | 'statusId'> {
  title?: string;
  /** Retire l'assigné (un `assigneeId` absent signifie « ne pas toucher »). */
  clearAssignee?: boolean;
}

// ── Sous-tâches / commentaires / pièces jointes (fiche de tâche) ─────────────

export interface SubTaskResponse {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  assigneeUserId?: string;
  createdBy: string;
  createdAt: string;
}

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  assigneeUserId?: string;
}

export interface CommentAttachmentResponse {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  contentType?: string;
}

export interface CommentResponse {
  id: string;
  taskId: string;
  authorUserId: string;
  content: string;
  createdAt: string;
  attachments: CommentAttachmentResponse[];
}

/** Fichier joint (commentaire ou tâche) — forme d'affichage. */
export interface AttachedRef {
  id: string;
  name: string;
  /** Chemin de téléchargement relatif (File Service, préfixé par `apiUrl`). */
  url: string;
  size?: number;
  contentType?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorUserId: string;
  content: string;
  createdAt: string;
  attachments: AttachedRef[];
}

export interface AttachmentResponse {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  contentType?: string;
  uploadedByUserId: string;
  uploadedAt: string;
}

export interface TaskAttachment extends AttachedRef {
  taskId: string;
  uploadedByUserId: string;
  uploadedAt: string;
}

export interface CreateStatusPayload {
  name: string;
  category: StatusCategory;
  color?: string;
  position?: number;
}

export interface UpdateStatusPayload {
  name?: string;
  color?: string;
  category?: StatusCategory;
  position?: number;
}

// ── Workflow (transitions) ──────────────────────────────────────────────────

export type TransitionResponsibleType = 'ALL' | 'PROJECT_LEAD' | 'SPECIFIC_MEMBER';

export interface TransitionResponse {
  id: string;
  fromStatusId: string;
  fromStatusName: string;
  toStatusId: string;
  toStatusName: string;
  responsibleType?: TransitionResponsibleType;
  responsibleUserId?: string;
  allowedRoles?: string[];
}

export interface Transition {
  id: string;
  fromStatusId: string;
  fromStatusName: string;
  toStatusId: string;
  toStatusName: string;
  responsibleType: TransitionResponsibleType;
  responsibleUserId?: string;
  allowedRoles: string[];
}

export interface WorkflowUpdatePayload {
  enforceWorkflowOrder?: boolean;
  transitions?: {
    transitionId: string;
    responsibleType?: TransitionResponsibleType;
    responsibleUserId?: string;
    allowedRoles?: string[];
  }[];
}

// ── Vue d'ensemble projet (overview) ────────────────────────────────────────

export interface UpcomingDueTask { taskId: string; title: string; dueDate: string; }

export interface ProjectOverviewResponse {
  projectId: string;
  name: string;
  color?: string;
  status: string;
  progress: number;
  totalTasks: number;
  notStartedTasks: number;
  activeTasks: number;
  doneTasks: number;
  closedTasks: number;
  unassignedStatusTasks: number;
  overdueTasks: number;
  memberCount: number;
  upcomingDueTasks: UpcomingDueTask[];
}
