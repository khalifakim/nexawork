import { Project } from '@core/models/project.models';

/**
 * Raw project directory, indexed by workspace id (mock fixture).
 * Imported only by ProjectsMockService.
 */
export const PROJECTS_BY_WORKSPACE: Record<string, Project[]> = {
  'atelier-nexa': [
    { id: 'refonte-app-mobile',   name: 'Refonte App Mobile',   color: '#6C70F0', progress: 62, docs: 12, folders: 4 },
    { id: 'site-vitrine-2025',    name: 'Site Vitrine 2025',    color: '#F2693C', progress: 38, docs: 7,  folders: 3 },
    { id: 'campagne-q3-marketing', name: 'Campagne Q3 Marketing', color: '#2BB673', progress: 80, docs: 5,  folders: 2 },
    { id: 'migration-backend',    name: 'Migration Backend',    color: '#E0497B', progress: 24, docs: 9,  folders: 2 },
    { id: 'design-system-nexa',   name: 'Design System Nexa',   color: '#3AA9E0', progress: 55, docs: 14, folders: 5 },
  ],
  'studio-lumen': [
    { id: 'identite-visuelle',   name: 'Identité visuelle',    color: '#2BB673', progress: 45, docs: 6,  folders: 2 },
    { id: 'site-vitrine-lumen',  name: 'Site vitrine Lumen',   color: '#5B8DEF', progress: 18, docs: 3,  folders: 1 },
    { id: 'print-automne-2026',  name: 'Print Automne 2026',   color: '#F5A623', progress: 70, docs: 8,  folders: 3 },
  ],
  'projets-perso': [
    { id: 'portfolio-2026',      name: 'Portfolio 2026',       color: '#E0497B', progress: 30, docs: 4,  folders: 1 },
    { id: 'app-budget-famille',  name: 'App Budget Famille',   color: '#6C70F0', progress: 5,  docs: 1,  folders: 0 },
  ],
};
