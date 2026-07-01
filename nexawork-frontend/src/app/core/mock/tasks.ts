import { KanbanColumn, TaskCard } from '@core/models/task.models';

/** Raw Kanban data (mock fixture). Imported only by TasksMockService. */
export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo',   name: 'À faire',     color: '#8E8AA0', cat: 'notstarted' },
  { id: 'doing',  name: 'En cours',    color: '#5B8DEF', cat: 'active' },
  { id: 'review', name: 'En révision', color: '#E89A2C', cat: 'active' },
  { id: 'done',   name: 'Validé',      color: '#2BB673', cat: 'done' },
];

export const KANBAN_TASKS: Record<string, TaskCard[]> = {
  todo: [
    { id: 'MOB-101', title: 'Wireframes écran onboarding', desc: '3 variantes à présenter à la revue produit.', prio: ['Haute', '#F5564E', 'rgba(245,86,78,.12)'], tag: ['Design', '#6C70F0'], prog: [20, '#F5564E'], team: ['#F2693C', '#6C70F0', '#2BB673'], links: 2, comments: 4 },
    { id: 'MOB-118', title: 'Audit accessibilité WCAG', desc: 'Contrastes et navigation clavier sur tous les écrans.', prio: ['Moyenne', '#E89A2C', 'rgba(232,154,44,.14)'], tag: ['QA', '#3AA9E0'], prog: [0, '#8E8AA0'], team: ['#E0497B', '#3AA9E0'], links: 1, comments: 0 },
  ],
  doing: [
    { id: 'MOB-094', title: 'Intégration écran profil utilisateur', desc: 'Composants React Native + états de chargement.', prio: ['Haute', '#F5564E', 'rgba(245,86,78,.12)'], tag: ['Dev', '#2BB673'], prog: [55, '#5B8DEF'], team: ['#6C70F0', '#F2693C'], links: 5, comments: 2 },
    { id: 'MOB-130', title: 'API auth — refresh token', desc: "Gestion de l'expiration et du renouvellement silencieux.", prio: ['Moyenne', '#E89A2C', 'rgba(232,154,44,.14)'], tag: ['Backend', '#E0497B'], prog: [40, '#5B8DEF'], team: ['#3AA9E0', '#2BB673', '#E0497B'], links: 3, comments: 6 },
  ],
  review: [
    { id: 'MOB-077', title: 'Page paramètres — design final', desc: 'En attente de validation du chef de projet.', prio: ['Basse', '#2BB673', 'rgba(43,182,115,.12)'], tag: ['Design', '#6C70F0'], prog: [90, '#E89A2C'], team: ['#F2693C', '#6C70F0'], links: 4, comments: 1 },
  ],
  done: [
    { id: 'MOB-061', title: 'Système de design tokens', desc: 'Couleurs, typo et espacements exportés.', prio: ['Moyenne', '#E89A2C', 'rgba(232,154,44,.14)'], tag: ['Design', '#6C70F0'], prog: [100, '#2BB673'], team: ['#6C70F0', '#2BB673', '#F2693C', '#E0497B'], links: 8, comments: 3 },
    { id: 'MOB-055', title: 'Setup CI/CD mobile', desc: 'Pipeline build + tests automatisés.', prio: ['Haute', '#F5564E', 'rgba(245,86,78,.12)'], tag: ['Backend', '#E0497B'], prog: [100, '#2BB673'], team: ['#3AA9E0'], links: 2, comments: 0 },
  ],
};
