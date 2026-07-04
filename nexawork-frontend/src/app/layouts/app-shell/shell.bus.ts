import { Injectable, signal } from '@angular/core';

export interface EditChannelState { id: string; name: string; kind: 'hash' | 'bell'; }
export interface AccessChannelState { id: string; name: string; scope: 'org' | 'project'; }
export interface DeleteChannelState { id: string; name: string; }

/**
 * Shared overlay state for the app shell. Any routed view can open the global
 * modals/overlays (invite, search, new message, new channel, create project)
 * without prop-drilling through the layout.
 */
@Injectable({ providedIn: 'root' })
export class ShellBus {
  readonly inviteOpen = signal(false);
  readonly searchOpen = signal(false);
  readonly newMessageOpen = signal(false);
  readonly createProjectOpen = signal(false);
  readonly newChannelScope = signal<'org' | 'project' | null>(null);
  readonly createWorkspaceOpen = signal(false);
  readonly editChannel = signal<EditChannelState | null>(null);
  readonly accessChannel = signal<AccessChannelState | null>(null);
  readonly deleteChannel = signal<DeleteChannelState | null>(null);
  readonly profileName = signal<string | null>(null);
  readonly documentName = signal<string | null>(null);
  readonly taskId = signal<string | null>(null);
  /** Team currently opened inside the Équipes space (sidebar-2 shows it under the project). */
  readonly openTeamNav = signal<{ name: string; project: string } | null>(null);
  /** Meeting whose discussion is currently open — nested under "Historique discussion" in sidebar-2. */
  readonly openMeetingNav = signal<{ id: string; name: string; proj: string; date: string } | null>(null);
  /**
   * Temporary preview of an archived project's channels inside the Canaux
   * rail. Set when an admin opens an archived project's channel — the sidebar
   * then shows ONLY the channels of that project, with a distinctive header.
   * Reset as soon as the user leaves the Canaux section (rail switch) or the
   * shell explicitly clears it.
   */
  readonly archivedChannelsPreview = signal<{ projectId: string; projectName: string } | null>(null);
  /**
   * Shared search query for the Conversations section. Filters the sidebar
   * conversation list, and — when the "En ligne" sub-route is open —
   * filters the members roster in that view as well.
   */
  readonly conversationSearch = signal('');
  /**
   * Sidebar 2 open/closed state. Held here (not in the shell component) so that
   * any routed view can force the sidebar back open — e.g. clicking "Retour aux
   * projets actifs" from an archived project must re-expand it even though the
   * rail section (projets) hasn't changed.
   */
  readonly sidebarOpen = signal(true);

  /** Programmatically expand sidebar 2 from any route. */
  openSidebar(): void { this.sidebarOpen.set(true); }

  openProfile(name: string): void { this.profileName.set(name); }
  openDocument(name: string): void { this.documentName.set(name); }
  /** Opens the task detail modal globally (from a @@task mention outside a project). */
  openTask(id: string): void { this.taskId.set(id); }
  openInvite(): void { this.inviteOpen.set(true); }
  openSearch(): void { this.searchOpen.set(true); }
  openNewMessage(): void { this.newMessageOpen.set(true); }
  openCreateProject(): void { this.createProjectOpen.set(true); }
  openNewChannel(scope: 'org' | 'project'): void { this.newChannelScope.set(scope); }
  openCreateWorkspace(): void { this.createWorkspaceOpen.set(true); }
  openEditChannel(s: EditChannelState): void { this.editChannel.set(s); }
  openAccessChannel(s: AccessChannelState): void { this.accessChannel.set(s); }
  openDeleteChannel(s: DeleteChannelState): void { this.deleteChannel.set(s); }
}
