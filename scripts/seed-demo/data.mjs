// Données de démonstration NexaWork — noms comoriens & sénégalais.
// Mot de passe commun à tous les comptes.
export const PASSWORD = 'motdepasse';
export const DOMAIN = 'nexa.io';

// Racine des fichiers réels à importer dans la GED.
export const DOCS_DIR = 'D:/memoire-master/nexawork/notes/doc-test-nexawork';

// ── 15 utilisateurs ─────────────────────────────────────────────────────────
// role = rôle dans le workspace principal (OWNER = fondateur, sinon ADMIN/MEMBER).
export const USERS = [
  // Fondateur / propriétaire des deux workspaces. `email` force l'adresse réelle
  // au lieu de la dériver du nom (cf. emailOf) : c'est le compte de démonstration
  // personnel, qui doit recevoir les vrais mails (invitations, liens invité, notifs).
  { key: 'khalif',    firstName: 'Khalif',     lastName: 'Akim',        jobTitle: 'Chef de projet',          role: 'OWNER',
    email: 'akimkhalif7@gmail.com' },
  { key: 'fatou',     firstName: 'Fatoumata',  lastName: 'Ndiaye',      jobTitle: 'Product Designer',        role: 'ADMIN'  },
  { key: 'ibrahima',  firstName: 'Ibrahima',   lastName: 'Fall',        jobTitle: 'Lead Developer',          role: 'ADMIN'  },
  { key: 'mariama',   firstName: 'Mariama',    lastName: 'Bâ',          jobTitle: 'Développeuse Frontend',   role: 'MEMBER' },
  { key: 'ousmane',   firstName: 'Ousmane',    lastName: 'Sow',         jobTitle: 'Développeur Backend',     role: 'MEMBER' },
  { key: 'coumba',    firstName: 'Coumba',     lastName: 'Sarr',        jobTitle: 'UX Designer',             role: 'MEMBER' },
  { key: 'cheikh',    firstName: 'Cheikh',     lastName: 'Gueye',       jobTitle: 'Ingénieur DevOps',        role: 'MEMBER' },
  { key: 'aissatou',  firstName: 'Aïssatou',   lastName: 'Diallo',      jobTitle: 'QA Engineer',             role: 'MEMBER' },
  { key: 'moussa',    firstName: 'Moussa',     lastName: 'Faye',        jobTitle: 'Développeur Mobile',      role: 'MEMBER' },
  { key: 'nafi',      firstName: 'Nafissatou', lastName: 'Mbaye',       jobTitle: 'Business Analyst',        role: 'MEMBER' },
  { key: 'nassuf',    firstName: 'Nassuf',     lastName: 'Abdou',       jobTitle: 'Développeur Fullstack',   role: 'MEMBER' },
  { key: 'zalifa',    firstName: 'Zalifa',     lastName: 'Mohamed',     jobTitle: 'Cheffe Produit',          role: 'ADMIN'  },
  { key: 'said',      firstName: 'Saïd',       lastName: 'Ali Mmadi',   jobTitle: 'Ingénieur Data',          role: 'MEMBER' },
  { key: 'aicha',     firstName: 'Aïcha',      lastName: 'Abdérémane',  jobTitle: 'Community Manager',       role: 'MEMBER' },
  { key: 'youssouf',  firstName: 'Youssouf',   lastName: 'Attoumani',   jobTitle: 'Support & Administration',role: 'MEMBER' },
];

// Retire les accents pour l'email.
const noAccent = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]+/g, '');
// `u.email` prend le pas quand un compte doit porter une adresse réelle.
export const emailOf = (u) => u.email ?? `${noAccent(u.firstName).toLowerCase()}.${noAccent(u.lastName).toLowerCase()}@${DOMAIN}`;

// ── Workspaces ──────────────────────────────────────────────────────────────
export const WS_PRIMARY = { name: 'Nexa Studio', color: '#6C70F0' };
export const WS_SECONDARY = { name: 'Coopérative Dakar-Moroni', color: '#2BB673' };
// Membres du workspace secondaire (comptes existants qui « rejoignent »).
export const WS_SECONDARY_MEMBERS = ['fatou', 'ibrahima', 'nassuf', 'zalifa'];

// ── 3 projets (workspace principal) ─────────────────────────────────────────
// members = clés utilisateurs ; chief = clé du chef de projet ; teams = équipes.
export const PROJECTS = [
  {
    key: 'npay', name: 'App mobile NexaPay', prefix: 'NPAY', color: '#6C70F0',
    startDate: '2026-06-01', endDate: '2026-09-30',
    members: ['khalif', 'ibrahima', 'mariama', 'ousmane', 'moussa', 'coumba', 'aissatou'],
    chief: 'ibrahima',
    teams: [
      { name: 'Design', color: '#F2693C', members: ['coumba', 'mariama'] },
      { name: 'Développement', color: '#6C70F0', members: ['ousmane', 'moussa'] },
      { name: 'Qualité', color: '#2BB673', members: ['aissatou'] },
    ],
  },
  {
    key: 'web', name: 'Refonte site vitrine', prefix: 'WEB', color: '#F2693C',
    startDate: '2026-05-15', endDate: '2026-08-15',
    members: ['khalif', 'fatou', 'coumba', 'mariama', 'nafi', 'aicha'],
    chief: 'fatou',
    teams: [
      { name: 'Design', color: '#E0497B', members: ['fatou', 'coumba'] },
      { name: 'Contenu', color: '#3AA9E0', members: ['nafi', 'aicha'] },
    ],
  },
  {
    key: 'infra', name: 'Migration infra cloud', prefix: 'INFRA', color: '#2BB673',
    startDate: '2026-06-10', endDate: '2026-10-31',
    members: ['khalif', 'cheikh', 'ousmane', 'aissatou', 'said', 'nassuf'],
    chief: 'cheikh',
    teams: [
      { name: 'Infrastructure', color: '#2BB673', members: ['cheikh', 'nassuf'] },
      { name: 'Data & QA', color: '#6C70F0', members: ['said', 'aissatou'] },
    ],
  },
];

// Priorités disponibles (backend).
export const PRIOS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

// Générateur de tâches par projet. cat = catégorie de statut visée
// (NOT_STARTED | ACTIVE | DONE), assignee = clé user | {team:'NomÉquipe'} | null.
// due = offset en jours depuis aujourd'hui (négatif = en retard). sub = sous-tâches.
export const TASKS = {
  npay: [
    { title: 'Cadrer le parcours d’onboarding',            cat: 'DONE',        prio: 'MEDIUM', assignee: 'coumba',   start: -40, due: -25, est: '3 j', sub: ['Wireframes basse fidélité', 'Validation avec le chef de projet'] },
    { title: 'Maquettes écran de paiement',                cat: 'ACTIVE',      prio: 'HIGH',   assignee: { team: 'Design' }, start: -20, due: 5,  est: '1 sem', sub: ['Variantes de bouton', 'Écran de confirmation'] },
    { title: 'API d’authentification (JWT)',               cat: 'ACTIVE',      prio: 'URGENT', assignee: 'ousmane',  start: -15, due: -2, est: '2 j' },
    { title: 'Intégration passerelle de paiement',         cat: 'NOT_STARTED', prio: 'HIGH',   assignee: { team: 'Développement' }, start: 2, due: 20, est: '2 sem' },
    { title: 'Écran d’accueil (Flutter)',                  cat: 'ACTIVE',      prio: 'MEDIUM', assignee: 'moussa',   start: -10, due: 8,  est: '4 j' },
    { title: 'Plan de tests de recette',                   cat: 'NOT_STARTED', prio: 'MEDIUM', assignee: 'aissatou', start: 5,  due: 25, est: '3 j' },
    { title: 'Corriger le crash au démarrage Android',     cat: 'ACTIVE',      prio: 'URGENT', assignee: 'moussa',   start: -3, due: -1, est: '1 j' },
    { title: 'Notifications push (Firebase)',              cat: 'NOT_STARTED', prio: 'LOW',    assignee: null,       start: 10, due: 30, est: '2 j' },
    { title: 'Revue de sécurité OWASP',                    cat: 'NOT_STARTED', prio: 'HIGH',   assignee: 'ibrahima', start: 12, due: 28, est: '4 j' },
    { title: 'Documentation API (OpenAPI)',                cat: 'DONE',        prio: 'LOW',    assignee: 'ousmane',  start: -30, due: -18, est: '2 j' },
    { title: 'Écran historique des transactions',          cat: 'ACTIVE',      prio: 'MEDIUM', assignee: 'mariama',  start: -8, due: 10, est: '3 j' },
    { title: 'Préparer la démo investisseurs',             cat: 'NOT_STARTED', prio: 'HIGH',   assignee: 'khalif',   start: 15, due: 22, est: '1 j' },
  ],
  web: [
    { title: 'Nouvelle charte graphique',                  cat: 'DONE',        prio: 'HIGH',   assignee: 'fatou',    start: -35, due: -20, est: '1 sem', sub: ['Palette de couleurs', 'Typographie'] },
    { title: 'Maquettes page d’accueil',                   cat: 'ACTIVE',      prio: 'HIGH',   assignee: { team: 'Design' }, start: -18, due: 4, est: '1 sem' },
    { title: 'Rédaction des textes « À propos »',          cat: 'ACTIVE',      prio: 'MEDIUM', assignee: 'aicha',    start: -12, due: 6,  est: '2 j' },
    { title: 'Intégration HTML/CSS accueil',               cat: 'NOT_STARTED', prio: 'MEDIUM', assignee: 'mariama',  start: 3,  due: 18, est: '4 j' },
    { title: 'Optimisation SEO',                           cat: 'NOT_STARTED', prio: 'LOW',    assignee: 'nafi',     start: 8,  due: 25, est: '3 j' },
    { title: 'Formulaire de contact',                      cat: 'ACTIVE',      prio: 'MEDIUM', assignee: 'mariama',  start: -6, due: -1, est: '2 j' },
    { title: 'Bannière retard fournisseur images',         cat: 'ACTIVE',      prio: 'URGENT', assignee: { team: 'Contenu' }, start: -9, due: -3, est: '1 j' },
    { title: 'Mentions légales & RGPD',                    cat: 'NOT_STARTED', prio: 'MEDIUM', assignee: 'nafi',     start: 6,  due: 20, est: '2 j' },
    { title: 'Recette responsive mobile',                  cat: 'NOT_STARTED', prio: 'HIGH',   assignee: null,       start: 14, due: 26, est: '3 j' },
    { title: 'Mise en ligne (production)',                 cat: 'NOT_STARTED', prio: 'HIGH',   assignee: 'khalif',   start: 20, due: 30, est: '1 j' },
  ],
  infra: [
    { title: 'Audit de l’existant on-premise',             cat: 'DONE',        prio: 'HIGH',   assignee: 'cheikh',   start: -38, due: -22, est: '1 sem' },
    { title: 'Schéma d’architecture cible',                cat: 'DONE',        prio: 'HIGH',   assignee: 'nassuf',   start: -25, due: -14, est: '3 j' },
    { title: 'Provisionnement Kubernetes',                 cat: 'ACTIVE',      prio: 'URGENT', assignee: { team: 'Infrastructure' }, start: -12, due: 3, est: '2 sem' },
    { title: 'Pipeline CI/CD',                             cat: 'ACTIVE',      prio: 'HIGH',   assignee: 'cheikh',   start: -10, due: 7,  est: '1 sem' },
    { title: 'Migration base de données',                  cat: 'NOT_STARTED', prio: 'URGENT', assignee: 'said',     start: 4,  due: 21, est: '1 sem' },
    { title: 'Mise en place monitoring (Grafana)',         cat: 'NOT_STARTED', prio: 'MEDIUM', assignee: 'nassuf',   start: 9,  due: 24, est: '4 j' },
    { title: 'Corriger la fuite mémoire du service files', cat: 'ACTIVE',      prio: 'URGENT', assignee: 'ousmane',  start: -4, due: -2, est: '2 j' },
    { title: 'Plan de reprise après sinistre',             cat: 'NOT_STARTED', prio: 'HIGH',   assignee: null,       start: 12, due: 28, est: '3 j' },
    { title: 'Tests de charge (JMeter)',                   cat: 'NOT_STARTED', prio: 'MEDIUM', assignee: { team: 'Data & QA' }, start: 15, due: 30, est: '4 j' },
    { title: 'Bascule DNS production',                     cat: 'NOT_STARTED', prio: 'HIGH',   assignee: 'cheikh',   start: 25, due: 31, est: '1 j' },
  ],
};

// ── GED : fichiers réels à importer (nom source → nom affiché) ───────────────
// scope: 'org' (espace Organisation) ou clé projet. access: OPEN | PRIVATE | SHARED.
// folder: nom du dossier cible (créé s'il n'existe pas). owner: clé user qui importe.
export const FOLDERS = [
  { name: 'Ressources RH',      scope: 'org',   access: 'OPEN'    },
  { name: 'Contrats & Légal',   scope: 'org',   access: 'PRIVATE' },
  { name: 'Design & Maquettes', scope: 'org',   access: 'OPEN'    },
  { name: 'Livrables clients',  scope: 'org',   access: 'OPEN'    },
  { name: 'Boîte de dépôt',     scope: 'org',   access: 'OPEN'    },
];

export const GED_FILES = [
  { src: 'ATTESTATION HEBERGEMENT.pdf',                                              name: 'Attestation d’hébergement.pdf',      folder: 'Contrats & Légal',   owner: 'khalif',   access: 'PRIVATE' },
  { src: 'Formulaire autorisation de soutance.pdf',                                  name: 'Autorisation de soutenance.pdf',     folder: 'Contrats & Légal',   owner: 'khalif',   access: 'SHARED', grantTo: ['fatou', 'ibrahima'] },
  { src: 'Guide_Spring_Boot_CRUD_Gestion_Stock.pdf',                                 name: 'Guide Spring Boot — CRUD.pdf',       folder: 'Ressources RH',      owner: 'ibrahima', access: 'OPEN' },
  { src: 'Numéros Courtiers Dakar.txt',                                              name: 'Contacts partenaires Dakar.txt',     folder: 'Ressources RH',      owner: 'nafi',     access: 'OPEN' },
  { src: 'NexaWork.pptx',                                                            name: 'Présentation NexaWork.pptx',         folder: 'Livrables clients',  owner: 'khalif',   access: 'OPEN' },
  { src: 'Figure_Projet_Collaboratif.drawio',                                        name: 'Schéma projet collaboratif.drawio',  folder: 'Design & Maquettes', owner: 'coumba',   access: 'OPEN' },
  { src: 'figure3_18.png',                                                           name: 'Maquette écran principal.png',       folder: 'Design & Maquettes', owner: 'coumba',   access: 'OPEN', versionSrc: 'Photo.png', versionNote: 'Version haute résolution' },
  { src: 'use_case_invite_externe.svg',                                              name: 'Diagramme cas d’usage.svg',          folder: 'Design & Maquettes', owner: 'fatou',    access: 'OPEN' },
  { src: 'RabbitMQ-Logo.wine.png',                                                   name: 'Logo RabbitMQ.png',                  folder: 'Ressources RH',      owner: 'cheikh',   access: 'OPEN' },
  { src: 'redis-logo.png',                                                           name: 'Logo Redis.png',                     folder: 'Ressources RH',      owner: 'cheikh',   access: 'OPEN' },
  { src: 'jitsi-meet-icon.png',                                                      name: 'Icône Jitsi Meet.png',               folder: 'Design & Maquettes', owner: 'mariama',  access: 'OPEN' },
  { src: 'Pour préparer Examen DES1_DES2_DES3 ORL_25 mars 2026_pour les réponses.xlsx', name: 'Budget prévisionnel 2026.xlsx',   folder: 'Contrats & Légal',   owner: 'khalif',   access: 'SHARED', grantTo: ['zalifa'] },
  { src: 'Khalif AKIM - 20230C6HD.zip',                                              name: 'Archive livrables v1.zip',           folder: 'Livrables clients',  owner: 'ibrahima', access: 'OPEN' },
];

// Fichier importé à la racine d'un projet (pour montrer la GED projet).
export const GED_PROJECT_FILES = [
  { src: 'Correction_QCM_ORL_11juillet2026.docx', name: 'Cahier des charges NexaPay.docx', project: 'npay', owner: 'ibrahima' },
];

// Liens de partage : mode READ (lecture), DROP (dépôt), READ_WRITE (les deux).
export const SHARE_LINKS = [
  { target: { type: 'FILE',   file: 'Présentation NexaWork.pptx' }, mode: 'READ',       by: 'khalif' },
  { target: { type: 'FILE',   file: 'Guide Spring Boot — CRUD.pdf' }, mode: 'READ',     by: 'ibrahima' },
  { target: { type: 'FOLDER', folder: 'Boîte de dépôt' },           mode: 'DROP',       by: 'khalif' },
  { target: { type: 'FOLDER', folder: 'Livrables clients' },        mode: 'READ_WRITE', by: 'khalif' },
];

// ── Messagerie : canaux ──────────────────────────────────────────────────────
// icon: HASH | BELL. private + members (clés) si privé. project: clé projet | null.
export const CHANNELS = [
  { key: 'general',  name: 'général',      icon: 'HASH', readonly: false, private: false, project: null },
  { key: 'annonces', name: 'annonces',     icon: 'BELL', readonly: true,  private: false, project: null },
  { key: 'design',   name: 'design',       icon: 'HASH', readonly: false, private: false, project: 'web' },
  { key: 'dev-npay', name: 'dev-nexapay',  icon: 'HASH', readonly: false, private: false, project: 'npay' },
  { key: 'infra',    name: 'infra-ops',    icon: 'HASH', readonly: false, private: false, project: 'infra' },
  { key: 'direction', name: 'direction',   icon: 'HASH', readonly: false, private: true,  project: null, members: ['khalif', 'fatou', 'ibrahima', 'zalifa'] },
];
