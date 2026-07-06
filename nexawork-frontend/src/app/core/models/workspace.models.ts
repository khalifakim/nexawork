export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Workspace {
  id: string;
  name: string;
  color: string;
  role: WorkspaceRole;
  members: number;
}

/** POST /workspaces — nom + couleur (slug généré côté serveur si absent). */
export interface CreateWorkspacePayload {
  name: string;
  color: string;
  slug?: string;
}

/** PATCH /workspaces/{id} — renommage / recoloriage (OWNER + ADMIN). */
export interface UpdateWorkspacePayload {
  name?: string;
  color?: string;
}

/**
 * Réponse backend `/workspaces` (Auth Service). Mappée vers {@link Workspace} :
 * `myRole → role`, `memberCount → members`.
 */
export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  color: string;
  iconUrl?: string | null;
  memberCount: number;
  myRole: WorkspaceRole;
  isOwner: boolean;
}
