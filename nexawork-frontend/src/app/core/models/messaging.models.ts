export interface Channel {
  id: number;
  name: string;
  channelType: 'PUBLIC' | 'PRIVATE' | 'DIRECT';
  organisationId: number;
  projectId?: number;
  createdAt?: string;
}

export interface Message {
  id: number;
  channelId: number;
  senderUserId: number;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  sentAt: string;
  edited: boolean;
}
