export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Workspace {
  id: string;
  name: string;
  color: string;
  role: WorkspaceRole;
  members: number;
}
