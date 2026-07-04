import { Channel, ChannelMessage } from '@core/models/channel.models';
import { parseRichText } from '@core/util/mention.util';

/**
 * Channel list per workspace (sidebar). The owning project name is used to
 * group project channels in the sidebar. Imported only by ChannelsMockService.
 */
export const CHANNELS_BY_WORKSPACE: Record<string, Channel[]> = {
  'atelier-nexa': [
    { id: 'annonces',        name: 'annonces',        scope: 'org',     kind: 'bell' },
    { id: 'general',         name: 'général',         scope: 'org',     kind: 'hash' },
    { id: 'design-veille',   name: 'design-veille',   scope: 'org',     kind: 'hash' },
    { id: 'annonces-projet', name: 'annonces-projet', scope: 'project', kind: 'bell', project: 'Refonte App Mobile' },
    { id: 'general-projet',  name: 'général-projet',  scope: 'project', kind: 'hash', project: 'Refonte App Mobile' },
    { id: 'dev-frontend',    name: 'dev-frontend',    scope: 'project', kind: 'hash', project: 'Refonte App Mobile' },
  ],
  'studio-lumen': [
    { id: 'annonces',       name: 'annonces',       scope: 'org',     kind: 'bell' },
    { id: 'general',        name: 'général',        scope: 'org',     kind: 'hash' },
    { id: 'atelier-print',  name: 'atelier-print',  scope: 'project', kind: 'hash', project: 'Print Automne 2026' },
  ],
  'projets-perso': [
    { id: 'general', name: 'général', scope: 'org', kind: 'hash' },
  ],
};

/** Message thread per channel id (mock). Falls back to a generic thread. */
export const CHANNEL_THREADS: Record<string, ChannelMessage[]> = {
  'general': [
    { author: 'Sarah Diallo', color: '#F2693C', time: '09:12',
      parts: parseRichText('Bonjour à tous. La nouvelle version du board Kanban est en ligne, pensez à mettre à jour vos tâches. Je partage le brief mis à jour.'),
      files: [
        { id: 100, name: 'Brief sprint 12.pdf', size: 620 * 1024 },
      ] },
    { author: 'Moussa Bâ',    color: '#6C70F0', time: '09:18',
      parts: parseRichText('Super, je m’en occupe ce matin. @@MOB-094 est presque terminée.') },
    { author: 'Aïda Ndiaye',  color: '#2BB673', time: '09:24',
      parts: parseRichText('De mon côté la maquette du profil est prête, je partage le lien dans #design-veille. @Akim jette un œil quand tu peux — voici les screens.'),
      files: [
        { id: 110, name: 'Maquette-profil-v3.png', size: 860 * 1024 },
        { id: 111, name: 'capture-board.png', size: 320 * 1024 },
      ] },
    { author: 'Yacine Sow', color: '#E0497B', time: '09:29',
      parts: parseRichText('Je regarde la partie backend, ping @Moussa Bâ si besoin.') },
    { author: 'Akim Koné',    color: '#F5A623', time: '09:31', mine: true,
      parts: parseRichText('Ok reçu — je regarde ça juste après la review de @@MOB-088. Merci !') },
    { author: 'Akim Koné',    color: '#F5A623', time: '09:33', mine: true,
      parts: parseRichText('Je vous partage aussi le dernier @@@Cahier des charges v3.docx pour ceux qui veulent le contexte.'),
      files: [{ id: 1, name: 'Cahier des charges v3.docx', size: 480 * 1024 }] },
    { author: 'Sarah Diallo', color: '#F2693C', time: '09:41',
      parts: parseRichText('Bonus : la démo vidéo de la nouvelle onboarding pour @@MOB-101 est ci-dessous. Regardez surtout la transition entre les 2 écrans.'),
      files: [
        { id: 120, name: 'demo-profil.mp4', size: 12 * 1024 * 1024 },
        { id: 121, name: 'Wireframes-onboarding.fig', size: 5 * 1024 * 1024 + 800 * 1024 },
      ] },
    { author: 'Aïda Ndiaye', color: '#2BB673', time: '09:47',
      parts: parseRichText('Petit ajout : la charte à jour. #design-veille pour les inspirations.'),
      files: [
        { id: 130, name: 'Charte graphique Nexa.fig', size: 3 * 1024 * 1024 + 200 * 1024 },
        { id: 131, name: 'logo-nexa.svg', size: 18 * 1024 },
      ] },
    { author: 'Moussa Bâ', color: '#6C70F0', time: '09:52',
      parts: parseRichText('Specs API auth mises à jour pour @@MOB-130.'),
      files: [
        { id: 140, name: 'Specs API auth.pdf', size: 1024 * 1024 + 100 * 1024 },
      ] },
    { author: 'Akim Koné', color: '#F5A623', time: '09:58', mine: true,
      parts: parseRichText('Nickel, merci @Moussa Bâ. Je relis et je reviens vers toi dans #dev-frontend.') },
  ],
  'annonces': [
    { author: 'Sarah Diallo', color: '#F2693C', time: '08:45',
      parts: parseRichText('Rappel : rétrospective sprint vendredi 15 h en salle A. Merci d’ajouter vos points au board partagé.') },
    { author: 'Moussa Bâ',    color: '#6C70F0', time: '08:52',
      parts: parseRichText('Note à toute l’équipe : la nouvelle politique de sécurité prend effet lundi. #général pour toute question.'),
      files: [
        { id: 200, name: 'Politique de sécurité.pdf', size: 2 * 1024 * 1024 },
      ] },
  ],
};

export const DEFAULT_CHANNEL_THREAD: ChannelMessage[] = [
  { author: 'Sarah Diallo', color: '#F2693C', time: '09:12', parts: parseRichText('Bienvenue dans le canal 👋') },
  { author: 'Akim Koné',    color: '#F5A623', time: '09:14', mine: true,
    parts: parseRichText('Yes, ravi de vous rejoindre 🚀') },
];
