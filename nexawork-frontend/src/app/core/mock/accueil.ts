import { Dashboard, MyTaskSection, ReceivedMention } from '@core/models/accueil.models';

/**
 * Accueil fixtures per workspace (mes-tâches, mentions reçues, tableau de bord).
 * Imported only by AccueilMockService.
 */

export const MY_TASKS_BY_WORKSPACE: Record<string, MyTaskSection[]> = {
  'atelier-nexa': [
    { cat: "Aujourd'hui", color: '#5B8DEF', tasks: [
      { id: 'MOB-094', t: 'Intégration écran profil utilisateur', proj: 'Refonte App Mobile',    prio: ['Haute',   '#F5564E'], due: "Aujourd'hui" },
      { id: 'MKT-210', t: 'Valider le brief créatif',             proj: 'Campagne Q3 Marketing', prio: ['Moyenne', '#E89A2C'], due: "Aujourd'hui" },
      { id: 'DS-014',  t: 'Revue des composants boutons',         proj: 'Design System Nexa',    prio: ['Basse',   '#2BB673'], due: "Aujourd'hui" },
      { id: 'MOB-088', t: 'Préparer la démo client',              proj: 'Refonte App Mobile',    prio: ['Haute',   '#F5564E'], due: "Aujourd'hui" },
      { id: 'WEB-061', t: 'Relire les textes de la page tarifs',  proj: 'Site Vitrine 2025',     prio: ['Basse',   '#2BB673'], due: "Aujourd'hui" },
      { id: 'DS-022',  t: 'Exporter les icônes en SVG',           proj: 'Design System Nexa',    prio: ['Moyenne', '#E89A2C'], due: "Aujourd'hui" },
    ]},
    { cat: 'En retard', color: '#F5564E', tasks: [
      { id: 'BCK-030', t: 'Migration table utilisateurs',  proj: 'Migration Backend', prio: ['Haute',   '#F5564E'], due: 'Il y a 2 j' },
      { id: 'WEB-077', t: 'Optimiser images page accueil', proj: 'Site Vitrine 2025', prio: ['Moyenne', '#E89A2C'], due: 'Hier' },
    ]},
  ],
  'studio-lumen': [
    { cat: "Aujourd'hui", color: '#5B8DEF', tasks: [
      { id: 'IDV-004', t: 'Décliner le logo sur fonds sombres', proj: 'Identité visuelle',  prio: ['Haute',   '#F5564E'], due: "Aujourd'hui" },
      { id: 'PRT-012', t: 'Calibrer les couleurs CMJN',         proj: 'Print Automne 2026', prio: ['Moyenne', '#E89A2C'], due: "Aujourd'hui" },
    ]},
    { cat: 'En retard', color: '#F5564E', tasks: [
      { id: 'IDV-001', t: 'Livrer la charte v1', proj: 'Identité visuelle', prio: ['Haute', '#F5564E'], due: 'Hier' },
    ]},
  ],
  'projets-perso': [
    { cat: "Aujourd'hui", color: '#5B8DEF', tasks: [
      { id: 'PF-002', t: 'Mettre à jour la page projets', proj: 'Portfolio 2026', prio: ['Basse', '#2BB673'], due: "Aujourd'hui" },
    ]},
  ],
};

export const MENTIONS_BY_WORKSPACE: Record<string, ReceivedMention[]> = {
  'atelier-nexa': [
    { id: 'm1', a: 'Sarah Diallo', initials: 'SD', c: 'linear-gradient(135deg,#F5A623,#F2693C)', verb: 'vous a mentioné dans un commentaire', snip: '@Akim peux-tu valider la maquette du profil avant ce soir ?', ctx: 'Tâche · MOB-094', date: 'Il y a 12 min', kind: 'Commentaires', target: { kind: 'task', id: 'MOB-094' } },
    { id: 'm2', a: 'Sarah Diallo', initials: 'SD', c: 'linear-gradient(135deg,#F5A623,#F2693C)', verb: 'vous a mentioné dans un message privé', snip: "@Akim je t'envoie la maquette du profil ce soir, tu pourras relire ?", ctx: 'Message privé · Sarah Diallo', date: 'Il y a 30 min', kind: 'Discussions', read: true, target: { kind: 'conversation', slug: 'sarah-diallo' } },
    { id: 'm3', a: 'Moussa Bâ', initials: 'MB', c: 'linear-gradient(135deg,#6C70F0,#4B3FD6)', verb: 'vous a mentioné dans #général', snip: 'Bon boulot @Akim sur la mise en place du CI/CD 👏', ctx: 'Canal · #général', date: 'Il y a 2 h', kind: 'Canaux', target: { kind: 'channel', slug: 'general' } },
    { id: 'm4', a: 'Aïda Ndiaye', initials: 'AN', c: 'linear-gradient(135deg,#2BB673,#1E8F57)', verb: 'vous a mentioné dans un commentaire', snip: "@Akim je te laisse trancher sur la couleur d'accent.", ctx: 'Tâche · MOB-077', date: 'Hier', kind: 'Commentaires', read: true, target: { kind: 'task', id: 'MOB-077' } },
    { id: 'm5', a: 'Moussa Bâ', initials: 'MB', c: 'linear-gradient(135deg,#6C70F0,#4B3FD6)', verb: 'vous a mentioné dans un message privé', snip: '@Akim la PR backend attend ton OK avant le merge 🙏', ctx: 'Message privé · Moussa Bâ', date: 'Hier', kind: 'Discussions', target: { kind: 'conversation', slug: 'moussa-ba' } },
    { id: 'm6', a: 'Yacine Sow', initials: 'YS', c: 'linear-gradient(135deg,#E0497B,#B5346A)', verb: 'vous a mentioné dans #dev-frontend', snip: '@Akim la PR est prête pour relecture quand tu veux.', ctx: 'Canal · #dev-frontend', date: 'Il y a 2 j', kind: 'Canaux', target: { kind: 'channel', slug: 'dev-frontend' } },
  ],
  'studio-lumen': [
    { id: 'm1', a: 'Léa Marchand', initials: 'LM', c: 'linear-gradient(135deg,#5B8DEF,#3A6FD0)', verb: 'vous a mentioné dans un commentaire', snip: '@Akim valides-tu la direction artistique ?', ctx: 'Tâche · IDV-004', date: 'Il y a 1 h', kind: 'Commentaires', target: { kind: 'task', id: 'IDV-004' } },
    { id: 'm2', a: 'Tom Rivière', initials: 'TR', c: 'linear-gradient(135deg,#F2693C,#D14E22)', verb: 'vous a mentioné dans #général', snip: '@Akim jette un œil aux illustrations 🙏', ctx: 'Canal · #général', date: 'Hier', kind: 'Canaux', target: { kind: 'channel', slug: 'general' } },
  ],
  'projets-perso': [],
};

export const DASHBOARD_BY_WORKSPACE: Record<string, Dashboard> = {
  'atelier-nexa': {
    kpis: { projectsActive: 5, projectsLate: 2, projectsArchived: 3, tasksDone: 142, tasksTotal: 220, tasksOverdue: 4, tasksOverdueProjects: 2, members: 12, membersOnline: 6 },
    charge: [
      { id: 'migration-backend',   n: 'Migration Backend', v: 52, c: '#E0497B' },
      { id: 'refonte-app-mobile',  n: 'Refonte App Mobile', v: 38, c: '#6C70F0' },
      { id: 'design-system-nexa',  n: 'Design System', v: 24, c: '#3AA9E0' },
      { id: 'campagne-q3-marketing', n: 'Campagne Q3', v: 16, c: '#2BB673' },
      { id: 'site-vitrine-2025',   n: 'Site Vitrine', v: 9, c: '#F2693C' },
    ],
    alerts: [
      { icon: 'alert',    t: '4 tâches en retard',        s: 'Migration Backend · Site Vitrine 2025',       danger: true,  target: { kind: 'taches' } },
      { icon: 'calendar', t: '3 échéances cette semaine', s: 'Campagne Q3, Migration Backend, Site Vitrine', danger: false, target: { kind: 'taches' } },
      { icon: 'shield',   t: '1 projet critique',         s: 'Migration Backend — 24 % à J-3',              danger: true,  target: { kind: 'projet', id: 'migration-backend' } },
      { icon: 'alert',    t: '2 tâches bloquées',         s: 'En attente de validation',                    danger: false, target: { kind: 'taches' } },
    ],
    overdueProjects: [
      { id: 'migration-backend', n: 'Migration Backend', c: '#E0497B', count: 3 },
      { id: 'site-vitrine-2025', n: 'Site Vitrine 2025', c: '#F2693C', count: 1 },
    ],
    projects: [
      { id: 'refonte-app-mobile',   n: 'Refonte App Mobile', c: '#6C70F0', p: 62, due: '30 sept.', days: 12, e: 'bonne' },
      { id: 'campagne-q3-marketing', n: 'Campagne Q3 Marketing', c: '#2BB673', p: 80, due: '12 août', days: 5, e: 'surveiller' },
      { id: 'migration-backend',    n: 'Migration Backend', c: '#E0497B', p: 24, due: '5 août', days: 3, e: 'critique' },
      { id: 'design-system-nexa',   n: 'Design System Nexa', c: '#3AA9E0', p: 55, due: '20 sept.', days: 18, e: 'bonne' },
      { id: 'site-vitrine-2025',    n: 'Site Vitrine 2025', c: '#F2693C', p: 38, due: '28 août', days: 9, e: 'surveiller' },
    ],
  },
  'studio-lumen': {
    kpis: { projectsActive: 3, projectsLate: 1, projectsArchived: 1, tasksDone: 40, tasksTotal: 96, tasksOverdue: 2, tasksOverdueProjects: 1, members: 4, membersOnline: 2 },
    charge: [
      { id: 'print-automne-2026', n: 'Print Automne 2026', v: 30, c: '#F5A623' },
      { id: 'identite-visuelle',  n: 'Identité visuelle', v: 22, c: '#2BB673' },
      { id: 'site-vitrine-lumen', n: 'Site vitrine Lumen', v: 11, c: '#5B8DEF' },
    ],
    alerts: [
      { icon: 'alert',    t: '2 tâches en retard',        s: 'Identité visuelle',        danger: true,  target: { kind: 'taches' } },
      { icon: 'calendar', t: '1 échéance cette semaine',  s: 'Print Automne 2026',       danger: false, target: { kind: 'taches' } },
      { icon: 'shield',   t: '1 projet à surveiller',     s: 'Site vitrine Lumen — 18 %', danger: false, target: { kind: 'projet', id: 'site-vitrine-lumen' } },
    ],
    overdueProjects: [
      { id: 'identite-visuelle', n: 'Identité visuelle', c: '#2BB673', count: 2 },
    ],
    projects: [
      { id: 'identite-visuelle',  n: 'Identité visuelle', c: '#2BB673', p: 45, due: '15 sept.', days: 20, e: 'bonne' },
      { id: 'site-vitrine-lumen', n: 'Site vitrine Lumen', c: '#5B8DEF', p: 18, due: '10 août', days: 6, e: 'surveiller' },
      { id: 'print-automne-2026', n: 'Print Automne 2026', c: '#F5A623', p: 70, due: '25 août', days: 10, e: 'bonne' },
    ],
  },
  'projets-perso': {
    kpis: { projectsActive: 2, projectsLate: 0, projectsArchived: 0, tasksDone: 6, tasksTotal: 30, tasksOverdue: 0, tasksOverdueProjects: 0, members: 1, membersOnline: 1 },
    charge: [
      { id: 'portfolio-2026',     n: 'Portfolio 2026', v: 8, c: '#E0497B' },
      { id: 'app-budget-famille', n: 'App Budget Famille', v: 3, c: '#6C70F0' },
    ],
    alerts: [],
    overdueProjects: [],
    projects: [
      { id: 'portfolio-2026',     n: 'Portfolio 2026', c: '#E0497B', p: 30, due: '30 nov.', days: 40, e: 'bonne' },
      { id: 'app-budget-famille', n: 'App Budget Famille', c: '#6C70F0', p: 5, due: '31 déc.', days: 70, e: 'bonne' },
    ],
  },
};
