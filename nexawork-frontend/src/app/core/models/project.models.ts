export interface Project {
  id: number;
  name: string;
  description?: string;
  organisationId: number;
  ownerUserId: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  createdDate?: string;
}

export interface WorkflowStatus {
  id: number;
  projectId: number;
  name: string;
  position: number;
  isFinal: boolean;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  statusId?: number;
  statusName?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigneeUserId?: number;
  dueDate?: string;
  createdDate?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  statusId: number;
  priority?: string;
  assigneeUserId?: number;
  dueDate?: string;
}
