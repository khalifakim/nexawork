/** What a notification points at — the header maps this to a destination. */
export type NotificationKind = 'tache' | 'message' | 'document' | 'projet';

/** Types émis par le backend (Notification Service). */
export type NotificationType =
  | 'MEMBER_INVITED' | 'EXTERNAL_GUEST_INVITED' | 'ADDED_TO_PROJECT' | 'TASK_ASSIGNED'
  | 'LIVRABLE_VALIDATED' | 'MENTION' | 'MESSAGE_RECEIVED' | 'DOCUMENT_SHARED'
  | 'MEETING_INVITED' | 'CALL_ENDED';

/** Payload brut d'une notification. */
export interface NotificationResponse {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  body?: string;
  targetUrl?: string;
  read: boolean;
  workspaceId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationPageResponse {
  notifications: NotificationResponse[];
  unreadCount: number;
  page: number;
  totalPages: number;
  totalElements: number;
}

export interface Notification {
  id: string;
  actor: string;
  ac: string;            // avatar tint
  title: string;
  text: string;
  date: string;
  read?: boolean;
  kind: NotificationKind;
  target: string;        // task id / conversation slug / doc name / project slug
}
