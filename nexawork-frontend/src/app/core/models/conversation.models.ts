import { RichPart } from '@core/util/mention.util';
import { MessageReaction, MessageReply } from '@core/models/channel.models';

/** A conversation entry in the sidebar / conversations list. */
export interface Conversation {
  id: string;          // slug used in the URL (e.g. 'sarah-diallo')
  name: string;
  color: string;       // avatar tint
  initials: string;
  /** Photo de profil de l'interlocuteur (annuaire) — remplace les initiales. */
  photoUrl?: string;
  msg: string;         // last-message preview
  unread: number;
  /** Relative time of the last message (e.g. '2 min', '1 h', '3 h', 'hier'). */
  time: string;
  /** UUID backend de la conversation (résolu par le service HTTP). */
  uuid?: string;
  /** UUID de l'autre participant (pour ouvrir/retrouver la conversation). */
  peerUserId?: string;
}

/** Payload brut d'une conversation (Messaging `GET /conversations`). */
export interface ConversationResponse {
  id: string;
  workspaceId: string;
  type: string;
  participantUserIds: string[];
  isRead: boolean;
  /** Vrai nombre de messages non lus reçus (badge sidebar). */
  unreadCount?: number;
  createdAt: string;
}

/** Attached file on a conversation message (matches ChannelFile). */
export interface ConversationFile { id: number; name: string; size: number; /** Chemin de téléchargement File Service (absent tant que le message n'est pas persisté). */ url?: string; }

/** A single message inside a private conversation. */
export interface ConversationMessage {
  /** UUID backend — sert à cibler un message (mention : « ouvrir et encadrer »). */
  id?: string;
  /** Date d'envoi (ISO) — borne la fenêtre de modification/suppression (15 min). */
  sentAt?: string;
  me: boolean;
  parts: RichPart[];   // rich text (mentions rendered as chips)
  time: string;
  /** Day label (e.g. "Aujourd'hui", 'Vendredi 2 juillet'). Renders a divider before the first message of a day. */
  day?: string;
  /** For messages sent by the current user, indicates whether the peer has read it. */
  read?: boolean;
  /** Message reçu du pair et non encore lu par moi (au chargement) — place la séparation « Messages non lus ». */
  unreadByMe?: boolean;
  /** Files attached to the message — same preview format as canaux / task comments. */
  files?: ConversationFile[];
  /** Le message a été modifié après envoi (affiche « · modifié »). */
  edited?: boolean;
  /** Reçu à `true` en temps réel quand le message est supprimé → retrait de la liste. */
  isDeleted?: boolean;
  /** Message cité (réponse ciblée), prêt à afficher. */
  replyTo?: MessageReply;
  /** Réactions emoji prêtes à afficher. */
  reactions?: MessageReaction[];
}
