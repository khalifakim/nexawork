import { Notification } from '@core/models/notification.models';

/**
 * Header notifications per workspace (mock fixture).
 * Imported only by NotificationsMockService.
 */
export const NOTIFICATIONS_BY_WORKSPACE: Record<string, Notification[]> = {
  'atelier-nexa': [
    { id: 'n1', actor: 'Sarah Diallo',  ac: '#F2693C', title: 'Nouvelle tâche assignée',       text: 'Sarah Diallo vous a assigné « Intégration écran profil utilisateur » dans Refonte App Mobile.', date: 'Il y a 1 minute',   kind: 'tache',    type: 'TASK_ASSIGNED',    target: 'MOB-094' },
    { id: 'n2', actor: 'Moussa Bâ',     ac: '#6C70F0', title: 'Mention dans un commentaire',    text: '@Akim peux-tu valider la maquette du profil avant ce soir ?',                                    date: 'Il y a 18 minutes', kind: 'tache',    type: 'MENTION',          target: 'MOB-094' },
    { id: 'n3', actor: 'Aïda Ndiaye',   ac: '#2BB673', title: 'Nouveau message',                text: 'Aïda Ndiaye : on cale un point demain matin ?',                                                  date: 'Il y a 2 heures',   kind: 'message',  type: 'MESSAGE_RECEIVED', target: 'aida-ndiaye' },
    { id: 'n4', actor: 'Yacine Sow',    ac: '#E0497B', title: 'Document partagé',               text: 'Yacine Sow a partagé « Specs fonctionnelles.pdf » avec vous.',                                   date: 'Il y a 5 heures',   kind: 'document', type: 'DOCUMENT_SHARED',  target: 'Specs fonctionnelles.pdf', read: true },
    { id: 'n5', actor: 'Fatou Traoré',  ac: '#3AA9E0', title: 'Ajout à un projet',              text: 'Vous avez été ajouté au projet « Campagne Q3 Marketing ».',                                      date: 'Hier',              kind: 'projet',   type: 'ADDED_TO_PROJECT', target: 'campagne-q3-marketing', read: true },
  ],
  'studio-lumen': [
    { id: 'n1', actor: 'Léa Marchand', ac: '#5B8DEF', title: 'Nouvelle tâche assignée', text: 'Léa Marchand vous a assigné une tâche dans Identité visuelle.', date: 'Il y a 10 minutes', kind: 'projet',  type: 'TASK_ASSIGNED',    target: 'identite-visuelle' },
    { id: 'n2', actor: 'Tom Rivière',  ac: '#F2693C', title: 'Nouveau message',         text: 'Tom Rivière : je pousse les illustrations demain.',              date: 'Il y a 1 heure',    kind: 'message', type: 'MESSAGE_RECEIVED', target: 'tom-riviere' },
  ],
  'projets-perso': [],
};
