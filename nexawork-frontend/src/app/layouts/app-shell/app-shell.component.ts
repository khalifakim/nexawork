import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
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
import { ModifierCanalComponent } from '@features/canaux/modals/modifier-canal/modifier-canal.component';
import { GererAccesCanalComponent } from '@features/canaux/modals/gerer-acces-canal/gerer-acces-canal.component';
import { WorkspaceCreateComponent } from '@shared/overlays/workspace-create/workspace-create.component';
import { CreerProjetComponent } from '@features/projets/modals/creer-projet/creer-projet.component';
import { FicheProfilComponent } from '@shared/overlays/fiche-profil/fiche-profil.component';
import { ApercuDocumentComponent } from '@shared/overlays/apercu-document/apercu-document.component';
import { FicheTacheComponent } from '@features/projets/modals/fiche-tache/fiche-tache.component';
import { GedAccessModalComponent } from '@shared/overlays/ged-access-modal/ged-access-modal.component';
import { GedVersionsModalComponent } from '@shared/overlays/ged-versions-modal/ged-versions-modal.component';
import { ConfirmDialogComponent } from '@shared/overlays/confirm-dialog/confirm-dialog.component';
import { SessionService } from '@core/services/session.service';
import { TasksService } from '@core/services/tasks.service';
import { ChannelsService } from '@core/services/channels.service';
import { ToastService } from '@core/services/toast.service';
import { GedOverlayBus } from '@core/services/ged-overlay.bus';
import { TaskCard } from '@core/models/task.models';
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
  imports: [RouterOutlet, HeaderComponent, RailComponent, Sidebar2Component, IconComponent, InvitationModalComponent, RechercheGlobaleComponent, NouveauMessageComponent, NouveauCanalComponent, ModifierCanalComponent, GererAccesCanalComponent, WorkspaceCreateComponent, CreerProjetComponent, FicheProfilComponent, ApercuDocumentComponent, FicheTacheComponent, GedAccessModalComponent, GedVersionsModalComponent, ConfirmDialogComponent],
  template: `
    <div class="shell">
      <app-header (search)="bus.openSearch()" />
      <div class="body">
        <app-rail [collapsed]="!bus.sidebarOpen()" [canInvite]="session.isAdmin()" (invite)="bus.openInvite()" (expand)="bus.sidebarOpen.set(true)" />
        @if (bus.sidebarOpen()) {
          <aside class="sb2">
            <div class="sb2__head">
              <span class="sb2__title">{{ title() }}</span>
              <button class="sb2__collapse" title="Réduire" (click)="bus.sidebarOpen.set(false)">
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
    @if (bus.createWorkspaceOpen()) { <app-workspace-create (closed)="bus.createWorkspaceOpen.set(false)" /> }
    @if (bus.editChannel(); as ec) { <app-modifier-canal [id]="ec.id" [initialName]="ec.name" [initialKind]="ec.kind" (closed)="bus.editChannel.set(null)" /> }
    @if (bus.accessChannel(); as ac) { <app-gerer-acces-canal [id]="ac.id" [name]="ac.name" [scope]="ac.scope" (closed)="bus.accessChannel.set(null)" /> }
    @if (bus.deleteChannel(); as dc) {
      <app-confirm-dialog [danger]="true" title="Supprimer le canal" [subtitle]="'#' + dc.name" icon="trash"
                          confirmLabel="Supprimer" [lines]="deleteLines"
                          (confirmed)="confirmDeleteChannel(dc.id, dc.name)"
                          (closed)="bus.deleteChannel.set(null)" />
    }
    @if (bus.createProjectOpen()) { <app-creer-projet (closed)="bus.createProjectOpen.set(false)" (created)="onProjectCreated()" /> }
    @if (bus.profileName(); as pn) { <app-fiche-profil [name]="pn" (closed)="bus.profileName.set(null)" /> }
    @if (bus.documentName(); as dn) { <app-apercu-document [name]="dn" (closed)="bus.documentName.set(null)" /> }
    @if (taskCard(); as tc) { <app-fiche-tache [task]="tc" [loading]="taskLoading()" (closed)="bus.taskId.set(null)" (openTask)="switchTask($event)" /> }
    @if (ged.accessName(); as an) { <app-ged-access-modal [name]="an" [scope]="gedAccessScope()" (closed)="ged.accessName.set(null)" /> }
    @if (ged.versionsName(); as vn) { <app-ged-versions-modal [name]="vn" (closed)="ged.versionsName.set(null)" /> }
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
    .content { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow-y: auto; background: var(--nx-bg); }
  `],
})
export class AppShellComponent {
  private router = inject(Router);
  private tasksSvc = inject(TasksService);
  private channelsSvc = inject(ChannelsService);
  private toast = inject(ToastService);
  bus = inject(ShellBus);
  ged = inject(GedOverlayBus);
  session = inject(SessionService);

  readonly deleteLines = [
    'Cette suppression est irréversible.',
    'Le fil de messages et les paramètres du canal seront définitivement perdus.',
  ];

  confirmDeleteChannel(id: string, name: string): void {
    this.channelsSvc.remove(id);
    this.bus.deleteChannel.set(null);
    this.toast.show({ message: 'Canal « #' + name + ' » supprimé' });
    if (this.router.url.includes('/app/canaux/' + id)) {
      this.router.navigate(['/app/canaux']);
    }
  }
  section = signal(this.parse(this.router.url));
  private currentUrl = signal(this.router.url);
  /**
   * R16 — scope of the currently-open ged-access-modal, inferred from the URL.
   * `project` for anything under a project (documents, canaux, etc.), else `org`.
   * Recomputed on every NavigationEnd.
   */
  gedAccessScope = computed<'org' | 'project'>(() => {
    const url = this.currentUrl();
    if (url.startsWith('/app/projets/')) return 'project';
    if (url.startsWith('/app/documents/projets')) return 'project';
    return 'org';
  });

  /** Task detail opened from a @@mention outside a project (canal, conversation). */
  taskCard = computed<(TaskCard & { proj?: string }) | null>(() => {
    const id = this.bus.taskId();
    return id ? this.tasksSvc.cardById(id) ?? null : null;
  });
  taskLoading = signal(false);
  private _taskT: any;

  /** Switch the global task modal to another mentioned task, with a loading transition. */
  switchTask(id: string): void {
    if (this.bus.taskId() === id || !this.tasksSvc.cardById(id)) return;
    this.taskLoading.set(true);
    clearTimeout(this._taskT);
    this._taskT = setTimeout(() => {
      this.bus.taskId.set(id);
      this.taskLoading.set(false);
    }, 650);
  }

  constructor() {
    // Charge le catalogue des espaces (header, sélecteur, Paramètres) à l'entrée.
    this.session.loadWorkspaces();

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(e => {
      const nextSection = this.parse(e.urlAfterRedirects);
      const sectionChanged = nextSection !== this.section();
      this.section.set(nextSection);
      this.currentUrl.set(e.urlAfterRedirects);
      // Only re-open sidebar 2 when the top-level rail section changes.
      // Navigating between tabs of the same section (e.g. project overview →
      // gantt → documents, or archived projects list → an archived project)
      // must respect the user's collapse choice.
      if (sectionChanged) this.bus.sidebarOpen.set(true);
    });
  }

  /** Ctrl/Cmd + K opens the global search from anywhere in the app shell. */
  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      this.bus.openSearch();
    }
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
