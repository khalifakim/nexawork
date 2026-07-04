import { Conversation, ConversationMessage } from '@core/models/conversation.models';
import { parseRichText } from '@core/util/mention.util';

/**
 * Conversation list per workspace (sidebar + conversations page).
 * Imported only by ConversationsMockService.
 */
export const CONVERSATIONS_BY_WORKSPACE: Record<string, Conversation[]> = {
  'atelier-nexa': [
    { id: 'sarah-diallo',  name: 'Sarah Diallo',  color: '#F2693C', initials: 'SD', msg: "Je t'envoie la maquette ce soir", unread: 2, time: '2 min' },
    { id: 'moussa-ba',     name: 'Moussa Bâ',     color: '#6C70F0', initials: 'MB', msg: 'Parfait, merci',                  unread: 0, time: '1 h'  },
    { id: 'aida-ndiaye',   name: 'Aïda Ndiaye',   color: '#2BB673', initials: 'AN', msg: 'On cale un point demain ?',       unread: 0, time: '3 h'  },
    { id: 'equipe-design', name: 'Équipe Design', color: '#E0497B', initials: 'ED', msg: 'Yacine: PR mergée',               unread: 0, time: 'hier' },
  ],
  'studio-lumen': [
    { id: 'lea-marchand', name: 'Léa Marchand', color: '#5B8DEF', initials: 'LM', msg: 'La direction artistique est validée', unread: 1, time: '12 min' },
    { id: 'tom-riviere',  name: 'Tom Rivière',  color: '#F2693C', initials: 'TR', msg: 'Je pousse les illustrations demain',  unread: 0, time: '2 h'    },
  ],
  'projets-perso': [
    { id: 'moi-notes', name: 'Mes notes', color: '#F5A623', initials: 'MN', msg: 'Penser à sauvegarder le portfolio', unread: 0, time: 'hier' },
  ],
};

/** Message thread per conversation id (mock). Falls back to a generic thread. */
export const CONVERSATION_THREADS: Record<string, ConversationMessage[]> = {
  'sarah-diallo': [
    { me: false, parts: parseRichText('Salut Akim ! Tu as eu le temps de regarder la maquette du profil ?'),
      time: '14:02', day: 'Vendredi 2 juillet',
      files: [{ id: 300, name: 'Maquette-profil-v2.png', size: 720 * 1024 }] },
    { me: true,  parts: parseRichText('Oui ! C’est top, juste un détail sur l’espacement des boutons. Je note ça dans @@MOB-094.'),
      time: '14:05', read: true },
    { me: false, parts: parseRichText('Je t’envoie la version corrigée ce soir. J’ajoute aussi le fichier Figma.'),
      time: '14:06',
      files: [
        { id: 301, name: 'Maquette-profil-v3.fig', size: 3 * 1024 * 1024 + 400 * 1024 },
        { id: 302, name: 'Notes de revue.pdf', size: 210 * 1024 },
      ] },
    { me: false, parts: parseRichText('Bonjour ! Petite question sur l’écran des paramètres. Voici les specs.'),
      time: '09:12', day: "Aujourd'hui",
      files: [{ id: 303, name: 'Specs-ecran-parametres.pdf', size: 540 * 1024 }] },
    { me: true,  parts: parseRichText('Vas-y je t’écoute 👌'), time: '09:15', read: true },
    { me: false, parts: parseRichText('Est-ce que tu peux jeter un œil aux docs suivants ? Je pense qu’il y a un lien avec #dev-frontend.'),
      time: '09:16',
      files: [
        { id: 304, name: 'Roadmap Q3 2026.xlsx', size: 320 * 1024 },
        { id: 305, name: 'demo-parametres.mp4', size: 8 * 1024 * 1024 },
        { id: 306, name: 'capture-bug.png', size: 120 * 1024 },
      ] },
    { me: true,  parts: parseRichText('Au fait, la nouvelle version est en ligne. Regarde @@MOB-088 et @@@Charte graphique Nexa.fig, merci ! @Aïda tu peux confirmer ?'),
      time: '09:18', read: false },
  ],
};

export const DEFAULT_CONVERSATION_THREAD: ConversationMessage[] = [
  { me: false, parts: parseRichText('Salut ! Comment ça avance de ton côté ?'), time: '09:30', day: "Aujourd'hui" },
  { me: true,  parts: parseRichText('Bien ! Je te fais un point cet après-midi.'), time: '09:34', read: false },
];
