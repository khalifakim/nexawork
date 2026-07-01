import { Member } from '@core/models/member.models';

/** Raw member directory (mock fixture). Imported only by MembersMockService. */
export const MEMBERS: Member[] = [
  { name: 'Sarah Diallo', color: '#F2693C', role: 'Chef de projet', email: 'sarah.diallo@ateliernexa.com', online: true,  projects: ['Refonte App Mobile', 'Campagne Q3 Marketing'] },
  { name: 'Moussa Bâ',    color: '#6C70F0', role: 'Développeur',    email: 'moussa.ba@ateliernexa.com',    online: true,  projects: ['Refonte App Mobile', 'Migration Backend'] },
  { name: 'Aïda Ndiaye',  color: '#2BB673', role: 'Designer',      email: 'aida.ndiaye@ateliernexa.com',  online: true,  projects: ['Refonte App Mobile', 'Design System Nexa'] },
  { name: 'Yacine Sow',   color: '#E0497B', role: 'Développeur',   email: 'yacine.sow@ateliernexa.com',   online: false, projects: ['Migration Backend'] },
  { name: 'Fatou Traoré', color: '#3AA9E0', role: 'Marketing',     email: 'fatou.traore@ateliernexa.com', online: false, projects: ['Campagne Q3 Marketing'] },
  { name: 'Akim Koné',    color: '#F5A623', role: 'Administrateur', email: 'akim.kone@ateliernexa.com',   online: true,  projects: ['Refonte App Mobile', 'Design System Nexa'] },
];
