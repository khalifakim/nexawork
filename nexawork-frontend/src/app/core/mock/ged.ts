import { GedItem } from '@core/models/ged.models';
import { TASK_FOLDER } from '@core/util/ui.util';

/** Raw GED data (mock fixture). Imported only by GedMockService. */

/** Root of a project's GED (system folder first). */
export function projectRoot(): GedItem[] {
  return [
    { type: 'folder', system: true, name: TASK_FOLDER, owner: 'Système', size: '5 éléments', mod: 'Mise à jour automatique', by: 'Système' },
    { type: 'folder', name: 'Maquettes', owner: 'Sarah Diallo', size: '8 éléments', mod: 'il y a 2 h', by: 'Sarah Diallo' },
    { type: 'folder', name: 'Specs & cahier des charges', owner: 'Moi', size: '5 éléments', mod: 'hier', by: 'Akim Koné' },
    { type: 'pdf', name: 'Specs fonctionnelles.pdf', owner: 'Yacine Sow', size: '2,4 Mo', mod: 'hier', by: 'Yacine Sow' },
    { type: 'doc', name: 'Compte-rendu kickoff.docx', owner: 'Aïda Ndiaye', size: '180 Ko', mod: 'il y a 3 j', by: 'Aïda Ndiaye' },
    { type: 'img', name: 'Logo-export@3x.png', owner: 'Moi', size: '860 Ko', mod: 'il y a 5 j', by: 'Moussa Bâ' },
    { type: 'sheet', name: 'Budget prévisionnel.xlsx', owner: 'Akim Koné', size: '64 Ko', mod: 'la semaine dernière', by: 'Akim Koné' },
  ];
}

export const FOLDER_DATA: Record<string, GedItem[]> = {
  'Maquettes': [
    { type: 'folder', name: 'Écrans onboarding', owner: 'Sarah Diallo', size: '4 éléments', mod: 'il y a 2 h', by: 'Sarah Diallo' },
    { type: 'fig', name: 'Design system mobile.fig', owner: 'Sarah Diallo', size: '12,4 Mo', mod: 'il y a 2 h', by: 'Sarah Diallo' },
    { type: 'img', name: 'Accueil-v3@2x.png', owner: 'Aïda Ndiaye', size: '1,2 Mo', mod: 'hier', by: 'Aïda Ndiaye' },
    { type: 'pdf', name: 'Revue design sprint 12.pdf', owner: 'Moi', size: '640 Ko', mod: 'il y a 3 j', by: 'Akim Koné' },
  ],
  'Specs & cahier des charges': [
    { type: 'doc', name: 'Cahier des charges v2.docx', owner: 'Moi', size: '240 Ko', mod: 'hier', by: 'Akim Koné' },
    { type: 'pdf', name: 'User stories.pdf', owner: 'Yacine Sow', size: '320 Ko', mod: 'il y a 2 j', by: 'Yacine Sow' },
    { type: 'sheet', name: 'Backlog priorisé.xlsx', owner: 'Moussa Bâ', size: '88 Ko', mod: 'il y a 3 j', by: 'Moussa Bâ' },
  ],
};

/** Virtual content of the system "task attachments" folder. */
export const SYSTEM_FOLDER_CONTENT: GedItem[] = [
  { type: 'pdf', name: 'Specs écran profil.pdf', owner: 'Sarah Diallo', size: '1,2 Mo', added: "Aujourd'hui, 14:23", task: { id: 'MOB-094', title: 'Intégration écran profil utilisateur' } },
  { type: 'img', name: 'Maquette-profil-v3.png', owner: 'Aïda Ndiaye', size: '860 Ko', added: "Aujourd'hui, 11:05", task: { id: 'MOB-094', title: 'Intégration écran profil utilisateur' } },
  { type: 'fig', name: 'Wireframes-onboarding.fig', owner: 'Sarah Diallo', size: '5,8 Mo', added: 'Hier, 16:48', task: { id: 'MOB-101', title: 'Wireframes écran onboarding' } },
  { type: 'doc', name: 'Notes refresh token.docx', owner: 'Moussa Bâ', size: '92 Ko', added: 'Il y a 2 j', task: { id: 'MOB-130', title: 'API auth — refresh token' } },
  { type: 'pdf', name: 'Charte couleurs.pdf', owner: 'Yacine Sow', size: '410 Ko', added: 'Il y a 3 j', task: { id: 'MOB-077', title: 'Page paramètres — design final' } },
];
