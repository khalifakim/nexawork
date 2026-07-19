export interface Member {
  /** Réf. logique User (UUID) — nécessaire aux actions admin. Absent des mocks legacy. */
  userId?: string;
  name: string;
  color: string;
  role: string;
  email: string;
  /**
   * Photo de profil (URL **publique** `/files/{id}/avatar`). Absente → l'avatar
   * rend les initiales sur `color`. C'est cette donnée qui alimente TOUTES les vues
   * affichant un utilisateur (conversations, canaux, commentaires, recherche…).
   */
  photoUrl?: string;
  online: boolean;
  projects: string[];
}

/** Payload brut d'un membre de workspace (Auth `GET /workspaces/{id}/members`). */
export interface MemberResponse {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  jobTitle?: string;
  photoUrl?: string;
  orgRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  isOwner: boolean;
  isDeactivated: boolean;
}

/** Ligne de la liste d'administration des membres (Paramètres ▸ Membres). */
export interface WorkspaceMemberAdmin {
  memberId: string;      // OrganisationMember.id (cible des endpoints /workspace-members/{id})
  userId: string;
  name: string;
  email: string;
  color: string;
  /** Photo de profil (URL publique) — absente → initiales. */
  photoUrl?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  isOwner: boolean;
  active: boolean;       // !isDeactivated
}

/** Invitation en attente (Paramètres ▸ Invitations). */
export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  invitedBy: string;
  createdAt: string;
}
