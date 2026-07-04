import { Meeting, MeetingThread } from '@core/models/meeting.models';

/**
 * Past meetings per workspace (history list). Imported only by MeetingsMockService.
 */
export const MEETINGS_BY_WORKSPACE: Record<string, Meeting[]> = {
  'atelier-nexa': [
    { id: 'r1', name: 'Revue sprint 12',     proj: 'Refonte App Mobile',    date: '9 mai 2026',  time: '14:00', dur: '48 min', joined: true },
    { id: 'r2', name: 'Cadrage GED projet',  proj: 'Refonte App Mobile',    date: '2 mai 2026',  time: '10:30', dur: '32 min', joined: true },
    { id: 'r3', name: 'Point hebdo design',  proj: 'Site Vitrine 2025',     date: '28 avr. 2026', time: '09:00', dur: '21 min', joined: false },
    { id: 'r4', name: 'Kickoff campagne Q3', proj: 'Campagne Q3 Marketing', date: '21 avr. 2026', time: '16:00', dur: '55 min', joined: true },
  ],
  'studio-lumen': [
    { id: 'r1', name: 'Revue direction artistique', proj: 'Identité visuelle',   date: '7 mai 2026',  time: '11:00', dur: '40 min', joined: true },
    { id: 'r2', name: 'Point production print',     proj: 'Print Automne 2026',  date: '30 avr. 2026', time: '15:00', dur: '25 min', joined: false },
  ],
  'projets-perso': [],
};

/** Read-only discussion thread per meeting id (mock). Falls back to a generic thread. */
export const MEETING_THREADS: Record<string, MeetingThread> = {
  'r1': {
    id: 'r1', name: 'Revue sprint 12', proj: 'Refonte App Mobile', date: 'Jeudi 9 mai 2026',
    docs: [
      { name: 'Specs sprint 12.pdf',   meta: 'PDF · 1,2 Mo',   color: '#F5564E', icon: 'file' },
      { name: 'Board export.png',      meta: 'Image · 840 Ko', color: '#3AA9E0', icon: 'image' },
      { name: 'Notes de réunion.docx', meta: 'Document · 60 Ko', color: '#5B8DEF', icon: 'file' },
    ],
    messages: [
      { author: 'Sarah Diallo', color: '#F2693C', time: '14:02', text: 'On démarre par la revue des écrans d’onboarding.' },
      { author: 'Moussa Bâ',    color: '#6C70F0', time: '14:09', text: 'Je viens de partager l’export du board, voir les documents partagés ci-dessus.' },
      { author: 'Aïda Ndiaye',  color: '#2BB673', time: '14:15', text: 'La maquette du profil est validée côté design.' },
      { author: 'Sarah Diallo', color: '#F2693C', time: '14:28', text: 'Parfait, on cale la prochaine revue vendredi. Merci à tous !' },
    ],
  },
};

export function defaultMeetingThread(id: string, meeting?: Meeting): MeetingThread {
  return {
    id,
    name: meeting?.name ?? 'Réunion',
    proj: meeting?.proj ?? '',
    date: meeting?.date ?? '',
    docs: [],
    messages: [
      { author: 'Sarah Diallo', color: '#F2693C', time: '10:00', text: 'Merci à tous d’avoir participé à cette réunion.' },
    ],
  };
}
