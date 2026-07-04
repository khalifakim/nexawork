/** What a notification points at — the header maps this to a destination. */
export type NotificationKind = 'tache' | 'message' | 'document' | 'projet';

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
