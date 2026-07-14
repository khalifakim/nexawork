/**
 * Refs to the four kinds of items that can be @-mentioned in a comment.
 * Items are scoped to the current project (not the workspace), so the picker
 * always shows what is relevant for the task the user is commenting on.
 */

/*
 * `id` = le libellé tel qu'il apparaît DANS le texte du message (c'est lui qui
 * fait le token `@…`). `uuid` = la cible réelle, envoyée au backend pour que la
 * mention soit rattachée à quelque chose (sans elle, « Mentions reçues » ne
 * trouve jamais personne et aucune notification ne part).
 */

export interface ProjectMemberRef {
  id: string;            // display name (slug-friendly)
  uuid: string;          // userId réel
  name: string;
  role: string;
  color: string;         // avatar tint
  /** Photo de profil — affichée à la place des initiales dans le sélecteur. */
  photoUrl?: string;
  email: string;
  online?: boolean;
}

export interface ProjectTaskRef {
  id: string;            // MOB-094 etc.
  uuid: string;          // id réel de la tâche
  title: string;
  status?: string;       // 'En cours', 'À faire', …
  color?: string;        // status color
}

export interface ProjectDocRef {
  id: string;            // filename (slug-friendly)
  uuid: string;          // id réel du document
  name: string;
  type: 'pdf' | 'doc' | 'img' | 'sheet' | 'fig' | 'folder';
  owner?: string;
}

export interface ProjectChannelRef {
  id: string;            // slug of the channel name (e.g. 'general')
  uuid?: string;         // id réel du canal
  name: string;
  members?: number;
  isProject?: boolean;   // true if the channel belongs to a project (vs org)
}

/** Une mention résolue, telle qu'envoyée avec le message. */
export interface MentionRef {
  type: 'USER' | 'TASK' | 'DOCUMENT' | 'CHANNEL';
  targetId: string;
  targetText: string;
}

/** Tab keys used by the mention picker. */
export type MentionTab = 'personnes' | 'taches' | 'documents' | 'canaux';

/** Mapping of a single typed mention token (parsed in the composer). */
export interface MentionToken {
  type: MentionTab;
  value: string;         // raw token text after the @/# prefix
  display: string;       // chip text shown in the picker / preview
}
