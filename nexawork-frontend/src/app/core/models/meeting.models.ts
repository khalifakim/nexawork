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
