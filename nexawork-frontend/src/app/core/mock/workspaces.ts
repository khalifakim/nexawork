import { Workspace } from '@core/models/workspace.models';

/**
 * Mock catalog of workspaces the demo user belongs to.
 * Mirrors the menu entries in the prototype's header workspace switcher and
 * the "Mes espaces de travail" page in Paramètres → Espaces.
 */
export const WORKSPACES: Workspace[] = [
  { id: 'atelier-nexa',     name: 'Atelier Nexa',     color: '#6C70F0', role: 'OWNER',  members: 12 },
  { id: 'studio-lumen',     name: 'Studio Lumen',     color: '#2BB673', role: 'MEMBER', members: 8  },
  { id: 'projets-perso',    name: 'Projets Perso',    color: '#E0497B', role: 'ADMIN',  members: 3  },
];

/** Lookup helper — returns the workspace matching the given id, or undefined. */
export function findWorkspace(id: string): Workspace | undefined {
  return WORKSPACES.find(w => w.id === id);
}

/** Default workspace when none is set yet (initial mock session). */
export const DEFAULT_WORKSPACE_ID = 'atelier-nexa';
