/** Cycle de vie d'un projet (V5.1 §6.2) — il n'existe pas d'état « Terminé ». */
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

/** `ProjectResponse` — payload brut du Project Service. */
export interface ProjectResponse {
  id: string;
  name: string;
  prefix: string;
  description?: string;
  color?: string;
  organisationId: string;
  ownerUserId: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  enforceWorkflowOrder: boolean;
  memberCount: number;
  createdDate: string;
  lastModifiedDate?: string;
}

/** Vue-modèle projet. `id` est l'UUID backend — plus un slug depuis la phase I2. */
export interface Project {
  id: string;
  name: string;
  color: string;
  /** Préfixe des `taskKey` du projet (`MOB` → `MOB-14`). */
  prefix: string;
  description?: string;
  status: ProjectStatus;
  ownerUserId: string;
  memberCount: number;
  startDate?: string;
  endDate?: string;
  /** Workflow strict : une tâche ne peut suivre que les transitions déclarées. */
  enforceWorkflowOrder: boolean;
  createdDate: string;
  /**
   * Un projet archivé est en lecture seule : sa dernière modification est donc
   * l'archivage lui-même. C'est ce qu'affiche la colonne « Archivé le ».
   */
  lastModifiedDate?: string;
  /** Comptes GED, renseignés à partir de la phase I5. */
  docs?: number;
  folders?: number;
}

export interface CreateProjectPayload {
  name: string;
  prefix?: string;
  color?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  prefix?: string;
  description?: string;
  color?: string;
  startDate?: string;
  endDate?: string;
  enforceWorkflowOrder?: boolean;
}
