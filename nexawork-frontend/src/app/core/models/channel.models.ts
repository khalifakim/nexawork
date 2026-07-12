import { RichPart } from '@core/util/mention.util';

/** A channel in the sidebar, grouped by scope (organisation vs project). */
export interface Channel {
  id: string;          // slug used in the URL (e.g. 'general')
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

/** Payload brut d'un message (canal ou conversation). */
export interface MessageResponse {
  id: string;
  channelId?: string;
  conversationId?: string;
  senderUserId: string;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  messageType: 'USER' | 'SYSTEM';
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
  author: string;
  color: string;
  time: string;
  parts: RichPart[];
  mine?: boolean;
  files?: ChannelFile[];
}

/** Visibility restriction of a channel (private = restricted to specific grants). */
export type ChannelAccessMode = 'open' | 'private';
export interface ChannelGrant { type: 'user' | 'team'; name: string; }
export interface ChannelRestriction { mode: ChannelAccessMode; grants: ChannelGrant[]; }

/** Payload used by the "Nouveau canal" modal. */
export interface CreateChannelPayload {
  name: string;
  scope: 'org' | 'project';
  project?: string;
  kind: 'bell' | 'hash';
  readonly: boolean;
  restriction: ChannelRestriction;
}

/** Payload used by the "Modifier le canal" modal. */
export interface UpdateChannelPayload {
  name: string;
  kind: 'bell' | 'hash';
}
