import { RichPart } from '@core/util/mention.util';

/** A channel in the sidebar, grouped by scope (organisation vs project). */
export interface Channel {
  /**
   * Identifiant d'URL — **unique**. Pour un canal d'organisation : le slug du nom
   * (`general`). Pour un canal **de projet** : le slug **suffixé du projet**
   * (`general-184da140`).
   *
   * 🔴 Sans ce suffixe, deux projets ayant chacun leur `#général` produisaient le
   * **même id** : clés dupliquées dans la sidebar, cache écrasé (le second canal
   * effaçait le premier), et route ambiguë. C'est ce qui rendait les canaux
   * automatiques d'un projet invisibles ou inaccessibles.
   */
  id: string;
  /** Slug du seul nom (`general`) — les liens de notification l'utilisent. */
  slug?: string;
  name: string;
  scope: 'org' | 'project';
  kind: 'bell' | 'hash'; // announcement channel (bell) vs standard (#)
  project?: string;    // owning project name when scope === 'project'
  readonly?: boolean;  // write reserved to admins / project lead
  /** UUID backend (résolu par le service HTTP ; absent des fixtures mock). */
  uuid?: string;
  /** Visibilité restreinte (canal privé). */
  isPrivate?: boolean;
  /** L'appelant peut-il écrire ? (REF D, déjà calculé backend `canWrite`). */
  canWrite?: boolean;
  /** projectId backend, pour la résolution du nom de projet. */
  projectId?: string;
  /** Bénéficiaires explicites (canal privé) ; absent = ouvert à tous les membres. */
  memberCount?: number;
  /** Date du dernier message (ISO) — absent si le canal est vide. */
  lastActivityAt?: string;
}

/** Payload brut d'un canal (Messaging `GET /channels`). */
export interface ChannelResponse {
  id: string;
  name: string;
  icon: 'HASH' | 'BELL';
  channelType: 'GLOBAL_ORG' | 'PROJECT';
  organisationId: string;
  projectId?: string;
  createdByUserId?: string;
  isSystem: boolean;
  readonly: boolean;
  isPrivate: boolean;
  canWrite: boolean;
  memberCount?: number;
  lastActivityAt?: string;
  createdAt: string;
}

/** Payload brut d'une mention portée par un message. */
export interface MentionResponse {
  id: string;
  messageId: string;
  mentionType: 'USER' | 'TASK' | 'DOCUMENT' | 'CHANNEL';
  targetId?: string;
  targetText?: string;
  isRead: boolean;
  createdAt: string;
}

/** Pièce jointe portée par un message (Messaging, V2). */
export interface MessageAttachmentResponse {
  id?: string;
  fileName?: string;
  fileUrl: string;
  uploaderUserId?: string;
  uploadedAt?: string;
}

/** Payload brut d'un message (canal ou conversation). */
export interface MessageResponse {
  id: string;
  channelId?: string;
  conversationId?: string;
  senderUserId: string;
  content: string;
  /** Pièces jointes du message (0..N) — V2. */
  attachments?: MessageAttachmentResponse[];
  /** @deprecated forme mono-pièce héritée (anciens messages). */
  attachmentUrl?: string;
  /** @deprecated cf. attachmentUrl. */
  attachmentName?: string;
  messageType: 'USER';
  edited: boolean;
  sentAt: string;
  readAt?: string;
  mentions: MentionResponse[];
}

/** Page de messages (historique paginé par curseur). */
export interface MessagePageResponse {
  messages: MessageResponse[];
  nextCursor?: string;
  hasMore: boolean;
}

/** Attached file on a message (canal / conversation / comment). */
export interface ChannelFile { id: number; name: string; size: number; /** Chemin de téléchargement File Service (absent tant que le message n'est pas persisté). */ url?: string; }

/** A single message inside a channel. */
export interface ChannelMessage {
  /** UUID backend — sert à cibler un message (mention : « ouvrir et encadrer »). */
  id?: string;
  author: string;
  /** Photo de profil de l'auteur — résolue depuis l'annuaire (absente → initiales). */
  authorPhotoUrl?: string;
  color: string;
  time: string;
  parts: RichPart[];
  mine?: boolean;
  files?: ChannelFile[];
}

/** Visibility restriction of a channel (private = restricted to specific grants). */
export type ChannelAccessMode = 'open' | 'private';
/** `id` = userId (membre) ou teamId (équipe) — c'est lui qui part au backend. */
export interface ChannelGrant { type: 'user' | 'team'; id: string; name: string; }
export interface ChannelRestriction { mode: ChannelAccessMode; grants: ChannelGrant[]; }

/** Bénéficiaire explicite d'un canal privé (`GET /channels/{id}/access`). */
export interface ChannelMemberResponse {
  id: string;
  userId: string;
  accessLevel: 'READER' | 'EDITOR';
}

/** Payload used by the "Nouveau canal" modal. */
export interface CreateChannelPayload {
  name: string;
  scope: 'org' | 'project';
  project?: string;
  /** UUID du projet propriétaire quand `scope === 'project'` (sinon canal d'organisation). */
  projectId?: string;
  kind: 'bell' | 'hash';
  readonly: boolean;
  restriction: ChannelRestriction;
}

/** Payload used by the "Modifier le canal" modal. */
export interface UpdateChannelPayload {
  name: string;
  kind: 'bell' | 'hash';
}
