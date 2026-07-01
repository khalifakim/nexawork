/**
 * Refs to the four kinds of items that can be @-mentioned in a comment.
 * Items are scoped to the current project (not the workspace), so the picker
 * always shows what is relevant for the task the user is commenting on.
 */

export interface ProjectMemberRef {
  id: string;            // display name (slug-friendly)
  name: string;
  role: string;
  color: string;         // avatar tint
  email: string;
  online?: boolean;
}

export interface ProjectTaskRef {
  id: string;            // MOB-094 etc.
  title: string;
  status?: string;       // 'En cours', 'À faire', …
  color?: string;        // status color
}

export interface ProjectDocRef {
  id: string;            // filename (slug-friendly)
  name: string;
  type: 'pdf' | 'doc' | 'img' | 'sheet' | 'fig' | 'folder';
  owner?: string;
}

export interface ProjectChannelRef {
  id: string;            // slug of the channel name (e.g. 'general')
  name: string;
  members?: number;
  isProject?: boolean;   // true if the channel belongs to a project (vs org)
}

/** Tab keys used by the mention picker. */
export type MentionTab = 'personnes' | 'taches' | 'documents' | 'canaux';

/** Mapping of a single typed mention token (parsed in the composer). */
export interface MentionToken {
  type: MentionTab;
  value: string;         // raw token text after the @/# prefix
  display: string;       // chip text shown in the picker / preview
}
