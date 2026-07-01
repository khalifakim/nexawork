import { Project } from '@core/models/project.models';

/** Raw project directory (mock fixture). Imported only by ProjectsMockService. */
export const PROJECTS: Project[] = [
  { id: 'refonte-app-mobile',   name: 'Refonte App Mobile',   color: '#6C70F0', progress: 62, docs: 12, folders: 4 },
  { id: 'site-vitrine-2025',    name: 'Site Vitrine 2025',    color: '#F2693C', progress: 38, docs: 7,  folders: 3 },
  { id: 'campagne-q3-marketing', name: 'Campagne Q3 Marketing', color: '#2BB673', progress: 80, docs: 5, folders: 2 },
  { id: 'migration-backend',    name: 'Migration Backend',    color: '#E0497B', progress: 24, docs: 9,  folders: 2 },
  { id: 'design-system-nexa',   name: 'Design System Nexa',   color: '#3AA9E0', progress: 55, docs: 14, folders: 5 },
];
