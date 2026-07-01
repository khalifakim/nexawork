import {
  ProjectChannelRef,
  ProjectDocRef,
  ProjectMemberRef,
  ProjectTaskRef,
} from '@core/models/mention.models';

/**
 * Project-scoped catalog used by the mention picker.
 * Each entry lists the members, tasks, documents and channels that belong to
 * a given project so the picker only shows relevant items.
 *
 * Mock fixture only — replaced by an HTTP service when the backend is wired.
 */
export const PROJECT_CATALOG: Record<string, {
  members: ProjectMemberRef[];
  tasks: ProjectTaskRef[];
  documents: ProjectDocRef[];
  channels: ProjectChannelRef[];
}> = {
  'refonte-app-mobile': {
    members: [
      { id: 'Sarah Diallo', name: 'Sarah Diallo', role: 'Chef de projet', color: '#F2693C', email: 'sarah.diallo@nexa.io', online: true },
      { id: 'Moussa Bâ',    name: 'Moussa Bâ',    role: 'Développeur',    color: '#6C70F0', email: 'moussa.ba@nexa.io',    online: true },
      { id: 'Aïda Ndiaye',  name: 'Aïda Ndiaye',  role: 'Designer',       color: '#2BB673', email: 'aida.ndiaye@nexa.io',  online: true },
      { id: 'Yacine Sow',   name: 'Yacine Sow',   role: 'Développeur',    color: '#E0497B', email: 'yacine.sow@nexa.io',   online: false },
      { id: 'Akim Koné',    name: 'Akim Koné',    role: 'Administrateur', color: '#F5A623', email: 'akim.kone@nexa.io',    online: true },
    ],
    tasks: [
      { id: 'MOB-094', title: 'Intégration écran profil utilisateur', status: 'En cours',    color: '#5B8DEF' },
      { id: 'MOB-101', title: 'Wireframes écran onboarding',          status: 'À faire',     color: '#8E8AA0' },
      { id: 'MOB-130', title: 'API auth — refresh token',             status: 'En cours',    color: '#5B8DEF' },
      { id: 'MOB-077', title: 'Page paramètres — design final',       status: 'En révision', color: '#E89A2C' },
      { id: 'MOB-061', title: 'Système de design tokens',             status: 'Validé',      color: '#2BB673' },
      { id: 'MOB-055', title: 'Setup CI/CD mobile',                   status: 'Validé',      color: '#2BB673' },
    ],
    documents: [
      { id: 'Specs-fonctionnelles.pdf',     name: 'Specs fonctionnelles.pdf',     type: 'pdf' },
      { id: 'Design-system-mobile.fig',     name: 'Design system mobile.fig',     type: 'fig' },
      { id: 'Cahier-des-charges-v2.docx',   name: 'Cahier des charges v2.docx',   type: 'doc' },
      { id: 'Backlog-priorise.xlsx',        name: 'Backlog priorisé.xlsx',        type: 'sheet' },
      { id: 'Maquette-profil-v3.png',       name: 'Maquette-profil-v3.png',       type: 'img' },
      { id: 'Specs-cahier-des-charges',     name: 'Specs & cahier des charges',   type: 'folder' },
    ],
    channels: [
      { id: 'annonces',       name: 'annonces',       members: 12 },
      { id: 'general',        name: 'général',        members: 8,  isProject: false },
      { id: 'design-veille',  name: 'design-veille',  members: 6,  isProject: false },
      { id: 'annonces-projet', name: 'annonces-projet', members: 8, isProject: true },
      { id: 'general-projet', name: 'général-projet', members: 8, isProject: true },
      { id: 'dev-frontend',   name: 'dev-frontend',   members: 5,  isProject: true },
    ],
  },
  'site-vitrine-2025': {
    members: [
      { id: 'Sarah Diallo', name: 'Sarah Diallo', role: 'Chef de projet', color: '#F2693C', email: 'sarah.diallo@nexa.io', online: true },
      { id: 'Moussa Bâ',    name: 'Moussa Bâ',    role: 'Développeur',    color: '#6C70F0', email: 'moussa.ba@nexa.io',    online: true },
      { id: 'Akim Koné',    name: 'Akim Koné',    role: 'Administrateur', color: '#F5A623', email: 'akim.kone@nexa.io',    online: true },
    ],
    tasks: [
      { id: 'WEB-021', title: 'Maquettes page d\'accueil',  status: 'À faire',  color: '#8E8AA0' },
      { id: 'WEB-022', title: 'Intégration hero section',   status: 'En cours', color: '#5B8DEF' },
      { id: 'WEB-023', title: 'Formulaire de contact',      status: 'À faire',  color: '#8E8AA0' },
    ],
    documents: [
      { id: 'Charte-site-2025.pdf',  name: 'Charte site 2025.pdf',  type: 'pdf' },
      { id: 'Wireframes-accueil.fig', name: 'Wireframes accueil.fig', type: 'fig' },
    ],
    channels: [
      { id: 'general-projet', name: 'général-projet', members: 3, isProject: true },
    ],
  },
  'campagne-q3-marketing': {
    members: [
      { id: 'Fatou Traoré', name: 'Fatou Traoré', role: 'Marketing',       color: '#3AA9E0', email: 'fatou.traore@nexa.io', online: false },
      { id: 'Sarah Diallo', name: 'Sarah Diallo', role: 'Chef de projet',  color: '#F2693C', email: 'sarah.diallo@nexa.io', online: true },
      { id: 'Akim Koné',    name: 'Akim Koné',    role: 'Administrateur',  color: '#F5A623', email: 'akim.kone@nexa.io',    online: true },
    ],
    tasks: [
      { id: 'MKT-101', title: 'Définir les personas Q3', status: 'Validé',   color: '#2BB673' },
      { id: 'MKT-102', title: 'Calendrier éditorial',    status: 'En cours', color: '#5B8DEF' },
    ],
    documents: [
      { id: 'Brief-campagne-Q3.pdf', name: 'Brief campagne Q3.pdf', type: 'pdf' },
    ],
    channels: [
      { id: 'general-projet', name: 'général-projet', members: 3, isProject: true },
    ],
  },
};

/** Default project used when none can be resolved from the URL. */
export const DEFAULT_PROJECT_ID = 'refonte-app-mobile';
