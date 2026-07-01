import { Injectable, signal } from '@angular/core';

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
  readonly profileName = signal<string | null>(null);

  openProfile(name: string): void { this.profileName.set(name); }
  openInvite(): void { this.inviteOpen.set(true); }
  openSearch(): void { this.searchOpen.set(true); }
  openNewMessage(): void { this.newMessageOpen.set(true); }
  openCreateProject(): void { this.createProjectOpen.set(true); }
  openNewChannel(scope: 'org' | 'project'): void { this.newChannelScope.set(scope); }
}
