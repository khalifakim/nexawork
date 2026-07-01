import { Member } from '@core/models/member.models';

/**
 * Raw member directory, indexed by workspace id (mock fixture).
 * The demo user "Akim Koné" appears in every workspace (otherwise the
 * "ME"-based filters in MembersMockService would fail).
 */
export const MEMBERS_BY_WORKSPACE: Record<string, Member[]> = {
  'atelier-nexa': [
    { name: 'Sarah Diallo', color: '#F2693C', role: 'Chef de projet', email: 'sarah.diallo@ateliernexa.com', online: true,  projects: ['Refonte App Mobile', 'Campagne Q3 Marketing'] },
    { name: 'Moussa Bâ',    color: '#6C70F0', role: 'Développeur',    email: 'moussa.ba@ateliernexa.com',    online: true,  projects: ['Refonte App Mobile', 'Migration Backend'] },
    { name: 'Aïda Ndiaye',  color: '#2BB673', role: 'Designer',       email: 'aida.ndiaye@ateliernexa.com',  online: true,  projects: ['Refonte App Mobile', 'Design System Nexa'] },
    { name: 'Yacine Sow',   color: '#E0497B', role: 'Développeur',    email: 'yacine.sow@ateliernexa.com',   online: false, projects: ['Migration Backend'] },
    { name: 'Fatou Traoré', color: '#3AA9E0', role: 'Marketing',      email: 'fatou.traore@ateliernexa.com', online: false, projects: ['Campagne Q3 Marketing'] },
    { name: 'Akim Koné',    color: '#F5A623', role: 'Administrateur', email: 'akim.kone@nexa.io',            online: true,  projects: ['Refonte App Mobile', 'Design System Nexa'] },
  ],
  'studio-lumen': [
    { name: 'Léa Marchand', color: '#5B8DEF', role: 'Directrice artistique', email: 'lea.marchand@studiolumen.fr', online: true,  projects: ['Identité visuelle', 'Site vitrine Lumen'] },
    { name: 'Tom Rivière',  color: '#F2693C', role: 'Illustrateur',          email: 'tom.riviere@studiolumen.fr',  online: true,  projects: ['Print Automne 2026'] },
    { name: 'Inès Caron',   color: '#2BB673', role: 'Designer print',        email: 'ines.caron@studiolumen.fr',   online: false, projects: ['Print Automne 2026'] },
    { name: 'Akim Koné',    color: '#F5A623', role: 'Membre',                email: 'akim.kone@nexa.io',           online: true,  projects: ['Identité visuelle'] },
  ],
  'projets-perso': [
    { name: 'Akim Koné', color: '#F5A623', role: 'Administrateur', email: 'akim.kone@nexa.io', online: true, projects: ['Portfolio 2026', 'App Budget Famille'] },
  ],
};
