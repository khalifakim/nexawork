import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { adminGuard } from '@core/guards/admin.guard';
import { channelAccessGuard } from '@core/guards/channel-access.guard';

/**
 * Onboarding lives under /auth (split-panel layout). The authenticated app lives
 * under /app (header + rail + contextual sidebar 2 + content). Each rail section
 * has real child routes so URLs are shareable and browser-back works.
 * Section bodies still marked `Placeholder` are delivered in later phases.
 */
export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('@layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'landing' },
      { path: 'landing',          loadComponent: () => import('@features/onboarding/page-accueil/page-accueil.component').then(m => m.PageAccueilComponent) },
      { path: 'login',            loadComponent: () => import('@features/onboarding/connexion/connexion.component').then(m => m.ConnexionComponent) },
      { path: 'forgot/email',     loadComponent: () => import('@features/onboarding/mot-de-passe-oublie/saisie-email.component').then(m => m.MdpSaisieEmailComponent) },
      { path: 'forgot/sent',      loadComponent: () => import('@features/onboarding/mot-de-passe-oublie/lien-envoye.component').then(m => m.MdpLienEnvoyeComponent) },
      { path: 'forgot/new',       loadComponent: () => import('@features/onboarding/mot-de-passe-oublie/nouveau-mot-de-passe.component').then(m => m.MdpNouveauComponent) },
      { path: 'signup',           loadComponent: () => import('@features/onboarding/inscription/inscription.component').then(m => m.InscriptionComponent) },
      { path: 'verify',           loadComponent: () => import('@features/onboarding/verification-email/verification-email.component').then(m => m.VerificationEmailComponent) },
      { path: 'email-change',     loadComponent: () => import('@features/onboarding/email-change/email-change.component').then(m => m.EmailChangeComponent) },
      { path: 'workspace/name',   loadComponent: () => import('@features/onboarding/configuration-espace/configuration-espace.component').then(m => m.ConfigurationEspaceComponent) },
      { path: 'invite',           loadComponent: () => import('@features/onboarding/rejoindre-invitation/rejoindre-invitation.component').then(m => m.RejoindreInvitationComponent) },
      { path: 'selector',         loadComponent: () => import('@features/onboarding/selecteur-espaces/selecteur-espaces.component').then(m => m.SelecteurEspacesComponent) },
    ],
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('@layouts/app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'accueil/mes-taches' },

      // --- Accueil ---
      { path: 'accueil', pathMatch: 'full', redirectTo: 'accueil/mes-taches' },
      { path: 'accueil/mes-taches',      loadComponent: () => import('@features/accueil/mes-taches/mes-taches.component').then(m => m.MesTachesComponent) },
      { path: 'accueil/mentions-recues', loadComponent: () => import('@features/accueil/mentions-recues/mentions-recues.component').then(m => m.MentionsRecuesComponent) },
      { path: 'accueil/tableau-de-bord', canActivate: [adminGuard], loadComponent: () => import('@features/accueil/tableau-de-bord/tableau-de-bord.component').then(m => m.TableauDeBordComponent) },

      // --- Notifications (vue complète, filtrable par type) — sous Accueil ---
      { path: 'accueil/notifications', loadComponent: () => import('@features/notifications/toutes-notifications/toutes-notifications.component').then(m => m.ToutesNotificationsComponent) },

      // --- Projets ---
      { path: 'projets', pathMatch: 'full', loadComponent: () => import('@features/projets/projets-index/projets-index.component').then(m => m.ProjetsIndexComponent) },
      { path: 'projets/archives', canActivate: [adminGuard], loadComponent: () => import('@features/projets/projets-archives/projets-archives.component').then(m => m.ProjetsArchivesComponent) },
      { path: 'projets/:id', pathMatch: 'full', redirectTo: 'projets/:id/kanban' },
      { path: 'projets/:id/:tab', loadComponent: () => import('@features/projets/projet-shell/projet-shell.component').then(m => m.ProjetShellComponent) },

      // --- Équipes ---
      { path: 'equipes', pathMatch: 'full', loadComponent: () => import('@features/equipes/equipes/equipes.component').then(m => m.EquipesComponent) },
      { path: 'equipes/:teamId', loadComponent: () => import('@features/equipes/equipe-detail/equipe-detail.component').then(m => m.EquipeDetailComponent) },

      // --- Documents (GED) ---
      { path: 'documents', pathMatch: 'full', redirectTo: 'documents/mes-documents' },
      { path: 'documents/mes-documents', loadComponent: () => import('@features/documents/mes-documents/mes-documents.component').then(m => m.MesDocumentsComponent) },
      { path: 'documents/partage',      loadComponent: () => import('@features/documents/partage/partage.component').then(m => m.DocumentsPartageComponent) },
      { path: 'documents/corbeille',    loadComponent: () => import('@features/documents/corbeille/corbeille.component').then(m => m.DocumentsCorbeilleComponent) },
      { path: 'documents/organisation', loadComponent: () => import('@features/documents/organisation/organisation.component').then(m => m.DocumentsOrganisationComponent) },
      { path: 'documents/projets', pathMatch: 'full', loadComponent: () => import('@features/documents/espace-projets/espace-projets.component').then(m => m.EspaceProjetsComponent) },
      { path: 'documents/projets/:id',  loadComponent: () => import('@features/documents/documents-projet/documents-projet.component').then(m => m.DocumentsProjetComponent) },

      // --- Canaux ---
      { path: 'canaux', pathMatch: 'full', loadComponent: () => import('@features/canaux/canaux-index/canaux-index.component').then(m => m.CanauxIndexComponent) },
      { path: 'canaux/:id', canActivate: [channelAccessGuard], loadComponent: () => import('@features/canaux/canal/canal.component').then(m => m.CanalComponent) },

      // --- Conversations ---
      { path: 'conversations', pathMatch: 'full', redirectTo: 'conversations/actifs' },
      { path: 'conversations/actifs', loadComponent: () => import('@features/conversations/actifs-maintenant/actifs-maintenant.component').then(m => m.ActifsMaintenantComponent) },
      { path: 'conversations/:id', loadComponent: () => import('@features/conversations/conversation-privee/conversation-privee.component').then(m => m.ConversationPriveeComponent) },

      // --- Réunions ---
      { path: 'reunions', pathMatch: 'full', redirectTo: 'reunions/lancer' },
      { path: 'reunions/lancer',          loadComponent: () => import('@features/reunions/lancer/lancer.component').then(m => m.LancerReunionComponent) },
      { path: 'reunions/historique',      loadComponent: () => import('@features/reunions/historique/historique.component').then(m => m.HistoriqueReunionsComponent) },
      { path: 'reunions/historique/:id',  loadComponent: () => import('@features/reunions/discussion/discussion.component').then(m => m.DiscussionReunionComponent) },

      // --- Paramètres ---
      { path: 'parametres', pathMatch: 'full', redirectTo: 'parametres/profil' },
      { path: 'parametres/profil',      loadComponent: () => import('@features/parametres/profil/profil.component').then(m => m.ParamProfilComponent) },
      { path: 'parametres/securite',    loadComponent: () => import('@features/parametres/securite/securite.component').then(m => m.ParamSecuriteComponent) },
      { path: 'parametres/general',     canActivate: [adminGuard], loadComponent: () => import('@features/parametres/general/general.component').then(m => m.ParamGeneralComponent) },
      { path: 'parametres/membres',     canActivate: [adminGuard], loadComponent: () => import('@features/parametres/membres/membres.component').then(m => m.ParamMembresComponent) },
      { path: 'parametres/invitations', canActivate: [adminGuard], loadComponent: () => import('@features/parametres/invitations/invitations.component').then(m => m.ParamInvitationsComponent) },
      { path: 'parametres/espaces',     loadComponent: () => import('@features/parametres/espaces/espaces.component').then(m => m.ParamEspacesComponent) },
    ],
  },

  // ─── Salles de réunion : hors du shell (fenêtre dédiée, §4.6) ───────────────
  // La salle s'ouvre dans une fenêtre séparée, au-dessus de l'application qui
  // reste utilisable en arrière-plan — d'où une route racine sans header ni rail.
  {
    path: 'salle/:id',
    canActivate: [authGuard],
    loadComponent: () => import('@features/reunions/salle/salle-reunion.component').then(m => m.SalleReunionComponent),
  },
  // Invité externe : page PUBLIQUE atteinte par le lien reçu par email. Aucun
  // compte requis — le token du lien vaut l'accès (V5.1 §4.6).
  {
    path: 'guest/:token',
    loadComponent: () => import('@features/reunions/invite/salle-invite.component').then(m => m.SalleInviteComponent),
  },
  // Lien de partage externe GED (Brique 4) : page PUBLIQUE atteinte par le lien
  // partagé. Aucun compte requis — le token du lien vaut l'accès (consultation,
  // téléchargement, ou dépôt selon le mode du lien).
  {
    path: 's/:token',
    loadComponent: () => import('@features/documents/partage-public/partage-public.component').then(m => m.PartagePublicComponent),
  },

  // Racine et routes inconnues → l'app ; l'authGuard renvoie vers /auth/landing si
  // l'utilisateur n'est pas connecté (voir auth.guard.ts).
  { path: '', pathMatch: 'full', redirectTo: 'app/accueil/mes-taches' },
  { path: '**', redirectTo: 'app/accueil/mes-taches' },
];
