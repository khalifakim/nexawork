export interface Notification {
  id: number;
  recipientUserId: number;
  type: string;
  title: string;
  body?: string;
  targetUrl?: string;
  read: boolean;
  createdAt: string;
}
