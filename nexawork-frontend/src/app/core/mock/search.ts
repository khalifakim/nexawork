import { SearchResult } from '@core/models/search.models';

/**
 * Global search results per workspace (mock fixture).
 * Imported only by SearchMockService.
 */
export const SEARCH_BY_WORKSPACE: Record<string, SearchResult[]> = {
  'atelier-nexa': [
    { type: 'projets',    icon: 'projects', color: '#6C70F0', name: 'Refonte App Mobile',                          ctx: 'Projet',                            date: 'il y a 3 j' },
    { type: 'taches',     mono: 'MOB-101',  name: 'Wireframes écran onboarding',                                   ctx: 'Tâche · Refonte App Mobile',        date: "aujourd'hui", radio: '#8E8AA0' },
    { type: 'taches',     mono: 'MOB-094',  name: 'Intégration écran profil utilisateur',                          ctx: 'Tâche · Refonte App Mobile',        date: 'il y a 1 j',  radio: '#5B8DEF' },
    { type: 'documents',  icon: 'file', color: '#F5564E', name: 'Specs fonctionnelles.pdf',                        ctx: 'Document · Refonte App Mobile',     date: 'hier' },
    { type: 'canaux',     hash: true, name: 'annonces',                                                            ctx: 'Canal · Organisation',              date: 'il y a 2 h' },
    { type: 'canaux',     hash: true, name: 'dev-frontend',                                                        ctx: 'Canal · Refonte App Mobile',        date: 'il y a 2 j' },
    { type: 'messages',   icon: 'comment', color: '#F2693C', name: 'Sarah Diallo : la maquette du profil est prête', ctx: 'Message · Conversation',          date: 'il y a 14 min' },
    { type: 'personnes',  avatar: 'SD', color: '#F2693C', name: 'Sarah Diallo',                                    ctx: 'Chef de projet',                    date: 'En ligne' },
    { type: 'personnes',  avatar: 'MB', color: '#6C70F0', name: 'Moussa Bâ',                                       ctx: 'Développeur',                       date: 'En ligne' },
  ],
  'studio-lumen': [
    { type: 'projets',   icon: 'projects', color: '#2BB673', name: 'Identité visuelle',      ctx: 'Projet',                        date: 'il y a 1 j' },
    { type: 'taches',    mono: 'IDV-004',  name: 'Décliner le logo sur fonds sombres',       ctx: 'Tâche · Identité visuelle',     date: "aujourd'hui", radio: '#5B8DEF' },
    { type: 'canaux',    hash: true, name: 'atelier-print',                                  ctx: 'Canal · Print Automne 2026',    date: 'il y a 3 j' },
    { type: 'personnes', avatar: 'LM', color: '#5B8DEF', name: 'Léa Marchand',               ctx: 'Directrice artistique',         date: 'En ligne' },
  ],
  'projets-perso': [
    { type: 'projets', icon: 'projects', color: '#E0497B', name: 'Portfolio 2026', ctx: 'Projet', date: 'il y a 5 j' },
  ],
};
