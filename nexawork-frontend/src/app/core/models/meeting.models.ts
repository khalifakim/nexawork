/** A past meeting in the history list. */
export interface Meeting {
  id: string;
  name: string;
  proj: string;
  date: string;
  time: string;
  dur: string;
  joined: boolean;
}

/** Coordonnées d'ouverture de la salle JaaS d'un appel actif. */
export interface CallRoom {
  id: string;
  roomName: string;
  topic: string;
  /** Domaine JaaS (base de l'IFrame API). */
  jitsiUrl: string;
  /** JWT signé (identité + droits + lobby_bypass). */
  jwt: string;
}

/** Payload brut d'un appel (Meeting `CallResponse`). */
export interface CallResponse {
  id: string;
  topic: string;
  roomName: string;
  organisationId: string;
  hostUserId: string;
  status: 'ACTIVE' | 'ENDED';
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  participants: { userId: string; joinedAt?: string; leftAt?: string; ongoing: boolean }[];
  jitsiUrl?: string;
  jwt?: string;
}

/** Invitation d'un invité externe (lien à usage unique). */
export interface GuestInviteResponse {
  email: string;
  displayName: string;
  guestLink: string;
}

/** A document shared during a meeting. */
export interface MeetingDoc { name: string; meta: string; color: string; icon: string; }

/** A message in a meeting's (read-only) discussion thread. */
export interface MeetingMessage { author: string; color: string; time: string; text: string; }

/** Full read-only discussion of a past meeting. */
export interface MeetingThread {
  id: string;
  name: string;
  proj: string;
  date: string;
  docs: MeetingDoc[];
  messages: MeetingMessage[];
}
