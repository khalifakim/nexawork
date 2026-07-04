import { RichPart } from '@core/util/mention.util';

/** A channel in the sidebar, grouped by scope (organisation vs project). */
export interface Channel {
  id: string;          // slug used in the URL (e.g. 'general')
  name: string;
  scope: 'org' | 'project';
  kind: 'bell' | 'hash'; // announcement channel (bell) vs standard (#)
  project?: string;    // owning project name when scope === 'project'
  readonly?: boolean;  // write reserved to admins / project lead
}

/** Attached file on a message (canal / conversation / comment). */
export interface ChannelFile { id: number; name: string; size: number; }

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
