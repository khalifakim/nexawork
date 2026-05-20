export interface Call {
  id: number;
  topic: string;
  roomName: string;
  organisationId: number;
  projectId?: number;
  hostUserId: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  scheduledAt?: string;
  startedAt?: string;
  jitsiToken?: string;
  jitsiUrl?: string;
  createdAt: string;
}

export interface CreateCallRequest {
  topic: string;
  projectId?: number;
  scheduledAt?: string;
}
