import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './header/header.component';
import { RailComponent } from './rail/rail.component';
import { Sidebar2Component } from './sidebar-2/sidebar-2.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { InvitationModalComponent } from '@shared/overlays/invitation/invitation.component';
import { RechercheGlobaleComponent } from '@shared/overlays/recherche-globale/recherche-globale.component';
import { NouveauMessageComponent } from '@features/conversations/modals/nouveau-message/nouveau-message.component';
import { NouveauCanalComponent } from '@features/canaux/modals/nouveau-canal/nouveau-canal.component';
import { CreerProjetComponent } from '@features/projets/modals/creer-projet/creer-projet.component';
import { FicheProfilComponent } from '@shared/overlays/fiche-profil/fiche-profil.component';
import { ShellBus } from './shell.bus';

const SECTION_TITLES: Record<string, string> = {
  accueil: 'Accueil', projets: 'Projets', equipes: 'Équipes', documents: 'Documents',
  canaux: 'Canaux', conversations: 'Conversations', reunions: 'Réunions', parametres: 'Paramètres',
};

/** App shell: header (56px) + dark rail (76px) + contextual sidebar 2 (266px) + content. */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, RailComponent, Sidebar2Component, IconComponent, InvitationModalComponent, RechercheGlobaleComponent, NouveauMessageComponent, NouveauCanalComponent, CreerProjetComponent, FicheProfilComponent],
  template: `
    <div class="shell">
      <app-header (search)="bus.openSearch()" />
      <div class="body">
        <app-rail [collapsed]="!sidebarOpen()" (invite)="bus.openInvite()" (expand)="sidebarOpen.set(true)" />
        @if (sidebarOpen()) {
          <aside class="sb2">
            <div class="sb2__head">
              <span class="sb2__title">{{ title() }}</span>
              <button class="sb2__collapse" title="Réduire" (click)="sidebarOpen.set(false)">
                <app-icon name="chevronLeft" [size]="16" [stroke]="2.2" />
              </button>
            </div>
            <div class="sb2__body">
              <app-sidebar2 [section]="section()"
                            (invite)="bus.openInvite()"
                            (createProject)="bus.openCreateProject()"
                            (newMessage)="bus.openNewMessage()"
                            (newChannel)="bus.openNewChannel($event)" />
            </div>
          </aside>
        }
        <main class="content"><router-outlet /></main>
      </div>
    </div>

    @if (bus.inviteOpen()) { <app-invitation (closed)="bus.inviteOpen.set(false)" /> }
    @if (bus.searchOpen()) { <app-recherche-globale (closed)="bus.searchOpen.set(false)" /> }
    @if (bus.newMessageOpen()) { <app-nouveau-message (closed)="bus.newMessageOpen.set(false)" /> }
    @if (bus.newChannelScope(); as sc) { <app-nouveau-canal [scope]="sc" (closed)="bus.newChannelScope.set(null)" /> }
    @if (bus.createProjectOpen()) { <app-creer-projet (closed)="bus.createProjectOpen.set(false)" (created)="onProjectCreated()" /> }
    @if (bus.profileName(); as pn) { <app-fiche-profil [name]="pn" (closed)="bus.profileName.set(null)" /> }
  `,
  styles: [`
    .shell { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: var(--nx-bg); }
    .body { flex: 1; display: flex; min-height: 0; }
    .sb2 { width: 266px; flex: none; background: #fff; border-right: 1px solid var(--nx-border); display: flex; flex-direction: column; min-height: 0; }
    .sb2__head { height: 52px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 10px 0 18px; border-bottom: 1px solid var(--nx-border-card); }
    .sb2__title { font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
    .sb2__collapse { width: 28px; height: 28px; border: none; border-radius: 7px; background: transparent; color: var(--nx-text-400); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .sb2__collapse:hover { background: var(--nx-surface-2); }
    .sb2__body { flex: 1; overflow-y: auto; padding: 10px 10px 16px; }
    .content { flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--nx-bg); }
  `],
})
export class AppShellComponent {
  private router = inject(Router);
  bus = inject(ShellBus);
  section = signal(this.parse(this.router.url));
  sidebarOpen = signal(true);

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(e => {
      this.section.set(this.parse(e.urlAfterRedirects));
      this.sidebarOpen.set(true);
    });
  }

  title(): string { return SECTION_TITLES[this.section()] ?? ''; }

  onProjectCreated(): void {
    this.bus.createProjectOpen.set(false);
    this.router.navigate(['/app/projets']);
  }

  private parse(url: string): string {
    const seg = url.split('?')[0].split('/').filter(Boolean); // ['app','projets',...]
    return seg[1] ?? 'accueil';
  }
}
