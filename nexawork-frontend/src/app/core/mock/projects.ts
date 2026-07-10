import { Project } from '@core/models/project.models';

/** Champs communs à toutes les fixtures — évite de les répéter dix fois. */
const base = {
  status: 'ACTIVE' as const,
  ownerUserId: 'u1',
  enforceWorkflowOrder: false,
  createdDate: '2025-01-15T09:00:00',
};

/**
 * Raw project directory, indexed by workspace id (mock fixture).
 * Imported only by ProjectsMockService.
 */
export const PROJECTS_BY_WORKSPACE: Record<string, Project[]> = {
  'atelier-nexa': [
    { ...base, id: 'refonte-app-mobile',    name: 'Refonte App Mobile',    color: '#6C70F0', prefix: 'MOB', memberCount: 8, docs: 12, folders: 4 },
    { ...base, id: 'site-vitrine-2025',     name: 'Site Vitrine 2025',     color: '#F2693C', prefix: 'SV',  memberCount: 5, docs: 7,  folders: 3 },
    { ...base, id: 'campagne-q3-marketing', name: 'Campagne Q3 Marketing', color: '#2BB673', prefix: 'CQ3', memberCount: 4, docs: 5,  folders: 2 },
    { ...base, id: 'migration-backend',     name: 'Migration Backend',     color: '#E0497B', prefix: 'MIG', memberCount: 6, docs: 9,  folders: 2 },
    { ...base, id: 'design-system-nexa',    name: 'Design System Nexa',    color: '#3AA9E0', prefix: 'DSN', memberCount: 3, docs: 14, folders: 5 },
  ],
  'studio-lumen': [
    { ...base, id: 'identite-visuelle',  name: 'Identité visuelle',  color: '#2BB673', prefix: 'IV',  memberCount: 3, docs: 6, folders: 2 },
    { ...base, id: 'site-vitrine-lumen', name: 'Site vitrine Lumen', color: '#5B8DEF', prefix: 'SVL', memberCount: 2, docs: 3, folders: 1 },
    { ...base, id: 'print-automne-2026', name: 'Print Automne 2026', color: '#F5A623', prefix: 'PA',  memberCount: 4, docs: 8, folders: 3 },
  ],
  'projets-perso': [
    { ...base, id: 'portfolio-2026',     name: 'Portfolio 2026',     color: '#E0497B', prefix: 'PF',  memberCount: 1, docs: 4, folders: 1 },
    { ...base, id: 'app-budget-famille', name: 'App Budget Famille', color: '#6C70F0', prefix: 'ABF', memberCount: 1, docs: 1, folders: 0 },
  ],
};

/** Projets archivés (REF E) — servis par `ProjectsMockService.listArchived()`. */
export const ARCHIVED_PROJECTS: Project[] = [
  { ...base, status: 'ARCHIVED', id: 'ancienne-landing-2024', name: 'Ancienne Landing 2024', color: '#8E8AA0', prefix: 'ALD', memberCount: 5, lastModifiedDate: '2025-03-12T10:00:00' },
  { ...base, status: 'ARCHIVED', id: 'refonte-newsletter',    name: 'Refonte Newsletter',    color: '#8E8AA0', prefix: 'RNL', memberCount: 4, lastModifiedDate: '2025-02-03T10:00:00' },
];
