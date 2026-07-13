import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KanbanComponent } from '@features/projets/kanban/kanban.component';
import { VueDEnsembleComponent } from '@features/projets/vue-d-ensemble/vue-d-ensemble.component';
import { GanttComponent } from '@features/projets/gantt/gantt.component';
import { CanauxProjetComponent } from '@features/projets/canaux-projet/canaux-projet.component';
import { EquipesComponent } from '@features/equipes/equipes/equipes.component';
import { GedViewComponent } from '@features/documents/ged-view/ged-view.component';
import { FicheTacheComponent } from '@features/projets/modals/fiche-tache/fiche-tache.component';
import { CreerTacheComponent } from '@features/projets/modals/creer-tache/creer-tache.component';
import { StatutsComponent } from '@features/projets/modals/statuts/statuts.component';
import { WorkflowComponent } from '@features/projets/modals/workflow/workflow.component';
import { ConfirmDialogComponent } from '@shared/overlays/confirm-dialog/confirm-dialog.component';
import { ProjectsService } from '@core/services/projects.service';
import { MembersService } from '@core/services/members.service';
import { Member } from '@core/models/member.models';
import { SessionService } from '@core/services/session.service';
import { ArchivedProjectsService } from '@core/services/archived-projects.service';
import { Project } from '@core/models/project.models';
import { TaskCard } from '@core/models/task.models';
import { TasksService } from '@core/services/tasks.service';
import { workspaceSignal } from '@core/util/workspace-signal';
import { DataRefreshService } from '@core/services/data-refresh.service';
import { KanbanStore } from '@features/projets/kanban/kanban.store';

interface Tab { key: string; label: string; icon: string; }

type ConfirmKind = 'archive' | 'delete' | 'restore' | 'deleteArchived';

interface ConfirmCfg { title: string; danger: boolean; btn: string; icon: string; lines: string[]; }

@Component({
  selector: 'app-projet-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, KanbanComponent, VueDEnsembleComponent, GanttComponent, CanauxProjetComponent, EquipesComponent, GedViewComponent, FicheTacheComponent, CreerTacheComponent, StatutsComponent, WorkflowComponent, ConfirmDialogComponent],
  providers: [KanbanStore],
  template: `
    <div class="shell">
      <div class="head">

        @if (isRo()) {
          <button class="back-arch" (click)="router.navigate(['/app/projets/archives'])">
            <app-icon name="chevronLeft" [size]="14" />Projets archivés
          </button>
        }

        <div class="title-row">
          <span class="dot"><app-icon name="projects" [size]="19" /></span>
          <h1>{{ displayName() }}</h1>

          @if (isRo()) {
            <span class="pill pill--arch"><app-icon name="lock" [size]="12" />Projet archivé</span>
          } @else {
            <span class="pill" [class.pill--warn]="health().cls === 'warn'">{{ health().label }}</span>
          }
          <span class="spacer"></span>

          @if (isRo() && isAdmin()) {
            <button class="btn-restore" (click)="openConfirm('restore')"><app-icon name="restore" [size]="15" />Restaurer</button>
            <button class="btn-del" (click)="openConfirm('deleteArchived')"><app-icon name="trash" [size]="15" />Supprimer</button>
          } @else if (!isRo() && isAdmin()) {
            <div class="setwrap">
              <button class="set" [class.set--on]="setOpen()" (click)="setOpen.set(!setOpen())"><app-icon name="gear" [size]="15" />Paramètres</button>
              @if (setOpen()) {
                <div class="bd" (click)="setOpen.set(false)"></div>
                <div class="menu" (click)="$event.stopPropagation()">
                  <button class="menu__i" (click)="setOpen.set(false); openConfirm('archive')"><app-icon name="archive" [size]="16" /><span>Archiver le projet</span></button>
                  <div class="menu__sep"></div>
                  <button class="menu__i menu__i--danger" (click)="setOpen.set(false); openConfirm('delete')"><app-icon name="trash" [size]="16" /><span>Supprimer le projet</span></button>
                </div>
              }
            </div>
          }
        </div>

        @if (isRo()) {
          <div class="ro-banner">
            <app-icon name="lock" [size]="16" />
            <span>Ce projet est archivé — consultation en lecture seule. Aucune modification n'est possible.</span>
          </div>
        }

        <div class="meta-row">
          <span class="meta"><app-icon name="teams" [size]="15" />{{ memberCountLabel() }}</span>
          @if (chiefName(); as chief) {
            <span class="meta"><app-icon name="user" [size]="15" />Chef de projet · {{ chief }}</span>
          } @else {
            <span class="meta"><app-icon name="user" [size]="15" />Aucun chef de projet</span>
          }
          @if (dueLabel(); as due) {
            <span class="meta"><app-icon name="calendar" [size]="15" />Échéance · {{ due }}</span>
          }
        </div>
        <div class="tabs">
          @for (t of tabs; track t.key) {
            <a class="tab" [class.tab--on]="tab()===t.key"
               [routerLink]="['/app/projets', id(), t.key]"
               [queryParams]="isRo() ? { ro: '1', name: archName() } : {}">
              <app-icon [name]="t.icon" [size]="16" />{{ t.label }}
            </a>
          }
        </div>
      </div>

      <div class="body">
        @switch (tab()) {
          @case ('vue-d-ensemble') { <app-vue-d-ensemble [readonly]="isRo()" /> }
          @case ('kanban') { <app-kanban [readonly]="isRo()" [canManageBoard]="isAdmin()" (openTask)="openTask($event)" (create)="createCol.set($event)" (openStatuses)="statutsOpen.set(true)" (openWorkflow)="workflowOpen.set(true)" /> }
          @case ('gantt') { <app-gantt /> }
          @case ('documents') { <app-ged-view [projectId]="id()" [readonly]="isRo()" /> }
          @case ('equipes') { <app-equipes [readonly]="isRo()" [canManage]="isAdmin() || isProjectLead()" /> }
          @case ('canaux') { <app-canaux-projet [readonly]="isRo()" [projectName]="displayName()" /> }
          @default {
            <div class="todo">
              <span class="todo__i"><app-icon name="sparkle" [size]="26" /></span>
              <div class="todo__t">Onglet {{ tabLabel() }}</div>
              <div class="todo__s">Disposition à détailler — fidèle au prototype.</div>
            </div>
          }
        }
      </div>
    </div>

    @if (selected(); as t) { <app-fiche-tache [task]="t" [loading]="taskLoading()" (closed)="selected.set(null)" (openTask)="switchTask($event)" (deleted)="onTaskDeleted($event)" (updated)="onTaskUpdated($event)" /> }
    @if (createCol() !== null) {
      <app-creer-tache
        [projectId]="id()"
        [columns]="kanbanColumns()"
        [initialStatusId]="createCol()"
        [column]="createColName()"
        [projectName]="displayName()"
        (closed)="createCol.set(null)"
        (created)="onTaskCreated($event)" />
    }
    @if (statutsOpen()) { <app-statuts [projectName]="displayName()" (closed)="statutsOpen.set(false)" /> }
    @if (workflowOpen()) { <app-workflow [projectName]="displayName()" (closed)="workflowOpen.set(false)" /> }

    @if (confirmKind(); as kind) {
      @if (confirmCfg(); as cfg) {
        <app-confirm-dialog
          [danger]="cfg.danger"
          [title]="cfg.title"
          [subtitle]="displayName()"
          [icon]="cfg.icon"
          [confirmLabel]="cfg.btn"
          [lines]="cfg.lines"
          (confirmed)="runConfirm(kind)"
          (closed)="confirmKind.set(null)" />
      }
    }

    @if (roToast()) {
      <div class="toast">
        <span class="toast__i"><app-icon name="check" [size]="14" /></span>
        <span class="toast__t">{{ roToast() }}</span>
        <button class="toast__x" (click)="roToast.set(null)"><app-icon name="x" [size]="14" /></button>
      </div>
    }
  `,
  styleUrl: './projet-shell.component.scss',
})
export class ProjetShellComponent {
  private route    = inject(ActivatedRoute);
  private projectsSvc = inject(ProjectsService);
  private membersSvc = inject(MembersService);
  private tasksSvc = inject(TasksService);
  private session = inject(SessionService);
  private archivedSvc = inject(ArchivedProjectsService);
  private refresh = inject(DataRefreshService);
  private allProjects = workspaceSignal<Project[]>(this.session, () => this.projectsSvc.list(), [], this.refresh.projects);
  private store = inject(KanbanStore);
  router = inject(Router);

  constructor() {
    // Le board Kanban est projeté par projet : on pousse l'UUID de la route dans
    // le store, qui (re)charge statuts + tâches à chaque changement de projet.
    effect(() => {
      const pid = this.id();
      if (pid) this.store.projectId.set(pid);
    });

    // Notification cliquée (?task=<id>) → ouvre directement la fiche de la tâche.
    this.route.queryParamMap
      .pipe(map(q => q.get('task')), takeUntilDestroyed())
      .subscribe(taskId => {
        if (!taskId || this.selected()?.id === taskId) return;
        this.taskLoading.set(true);
        this.tasksSvc.cardById(taskId).subscribe(card => {
          this.taskLoading.set(false);
          if (card) this.selected.set({ ...card, proj: this.displayName() });
        });
      });
  }
  /** True when current user is ADMIN or OWNER (règles R7, R8). */
  isAdmin = this.session.isAdmin;
  /**
   * True when the current user is chef de projet on this project.
   * Placeholder: real matching will be done via ProjectsService once backend
   * provides `chefDeProjet` on the Project entity.
   */
  isProjectLead = computed(() => false);

  setOpen      = signal(false);
  selected     = signal<(TaskCard & { proj?: string }) | null>(null);
  createCol    = signal<string | null>(null);
  statutsOpen  = signal(false);
  workflowOpen = signal(false);
  confirmKind  = signal<ConfirmKind | null>(null);
  roToast      = signal<string | null>(null);
  taskLoading  = signal(false);
  private _t: any;
  private _taskT: any;

  id      = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')), { initialValue: '' });
  tab     = toSignal(this.route.paramMap.pipe(map(p => p.get('tab') ?? 'kanban')),             { initialValue: 'kanban' });
  isRo    = toSignal(this.route.queryParamMap.pipe(map(q => q.get('ro') === '1')),             { initialValue: false });
  archName = toSignal(this.route.queryParamMap.pipe(map(q => q.get('name') ?? '')),            { initialValue: '' });

  tabs: Tab[] = [
    { key: 'vue-d-ensemble', label: "Vue d'ensemble", icon: 'dashboard' },
    { key: 'kanban',         label: 'Kanban',         icon: 'kanban'    },
    { key: 'gantt',          label: 'Gantt',           icon: 'gantt'     },
    { key: 'documents',      label: 'Documents',       icon: 'documents' },
    { key: 'equipes',        label: 'Équipes',         icon: 'teams'     },
    { key: 'canaux',         label: 'Canaux',          icon: 'channels'  },
  ];

  /** Projet réellement sélectionné (données d'en-tête). */
  curProject   = computed(() => this.allProjects().find(p => p.id === this.id()));
  projectName  = computed(() => this.curProject()?.name ?? '');
  displayName  = computed(() => (this.isRo() && this.archName()) ? this.archName() : this.projectName());
  tabLabel     = computed(() => this.tabs.find(t => t.key === this.tab())?.label ?? '');

  // ── En-tête réel du projet ──────────────────────────────────────────────────
  /** Annuaire du workspace — résout ownerUserId → nom du chef de projet. */
  private directory = toSignal(this.membersSvc.directory(), { initialValue: [] as Member[] });
  memberCountLabel = computed(() => {
    const n = this.curProject()?.memberCount ?? 0;
    return n + (n > 1 ? ' membres' : ' membre');
  });
  chiefName = computed(() => {
    const owner = this.curProject()?.ownerUserId;
    if (!owner) return null;
    return this.directory().find(m => m.userId === owner)?.name ?? null;
  });
  dueLabel = computed(() => {
    const d = this.curProject()?.endDate;
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  });
  /** Santé dérivée de la vue d'ensemble réelle (avancement + retard). */
  private overview = toSignal(
    toObservable(this.id).pipe(switchMap(id => id ? this.tasksSvc.overview(id) : of(null))),
    { initialValue: null },
  );
  health = computed<{ label: string; cls: string }>(() => {
    const o = this.overview();
    if (!o) return { label: 'En bonne voie', cls: 'ok' };
    if ((o.overdueTasks ?? 0) > 0) return { label: 'À surveiller', cls: 'warn' };
    return { label: 'En bonne voie', cls: 'ok' };
  });

  /** Colonnes réelles du board (statuts) — passées au modal de création. */
  kanbanColumns = this.store.columns;
  createColName = computed(() => this.store.columns().find(c => c.id === this.createCol())?.name ?? '');

  openTask(t: TaskCard): void { this.selected.set({ ...t, proj: this.displayName() }); }

  /** Une tâche vient d'être créée → l'insérer dans sa colonne sans recharger. */
  onTaskCreated(card: TaskCard): void {
    this.store.addCard(card);
    this.createCol.set(null);
  }

  /** Une tâche a été supprimée depuis sa fiche → la retirer du board et fermer. */
  onTaskDeleted(id: string): void {
    this.store.deleteTask(id);
    this.selected.set(null);
  }

  /** Une tâche a été éditée depuis sa fiche → mettre à jour le board sans recharger. */
  onTaskUpdated(card: TaskCard): void {
    this.store.updateCard(card);
    // Garde la fiche ouverte synchronisée avec les nouvelles valeurs.
    this.selected.update(s => s ? { ...s, ...card } : s);
  }

  /**
   * Switch the open task modal to another task referenced by a @@mention.
   * Shows a short loading overlay so it's clear a *different* task is opening,
   * then swaps the modal content in place.
   */
  switchTask(id: string): void {
    if (!this.selected() || this.selected()?.id === id) return;
    this.taskLoading.set(true);
    clearTimeout(this._taskT);
    this._taskT = setTimeout(() => {
      this.tasksSvc.cardById(id).subscribe(next => {
        if (next) this.selected.set({ ...next, proj: this.displayName() });
        this.taskLoading.set(false);
      });
    }, 650);
  }

  openConfirm(kind: ConfirmKind): void { this.confirmKind.set(kind); }

  /** Config for the active confirm modal — mirrors the prototype's `confirmProjectModal`. */
  private readonly CONFIRM: Record<ConfirmKind, ConfirmCfg> = {
    archive: {
      title: 'Archiver le projet', danger: false, btn: 'Archiver le projet', icon: 'archive',
      lines: [
        "Les données du projet sont conservées en base, mais le projet devient invisible dans l'interface principale.",
        'Ses canaux et sa GED associée deviennent également invisibles.',
        'Les données restent récupérables uniquement via une restauration.',
      ],
    },
    delete: {
      title: 'Supprimer le projet', danger: true, btn: 'Supprimer définitivement', icon: 'trash',
      lines: [
        'Cette suppression est irréversible.',
        'Toutes les ressources liées (documents, canaux, équipes) seront supprimées.',
        "Les utilisateurs conservent leur compte mais perdent l'accès au projet ; ses canaux deviennent inaccessibles.",
      ],
    },
    restore: {
      title: 'Restaurer le projet', danger: false, btn: 'Restaurer le projet', icon: 'restore',
      lines: [
        "Le projet redevient visible et entièrement modifiable dans l'interface principale.",
        'Ses canaux et sa GED associée redeviennent accessibles aux membres.',
      ],
    },
    deleteArchived: {
      title: 'Supprimer définitivement', danger: true, btn: 'Supprimer définitivement', icon: 'trash',
      lines: [
        'Cette suppression est irréversible.',
        'Le projet archivé et toutes ses ressources seront définitivement supprimés.',
      ],
    },
  };

  confirmCfg = computed(() => {
    const k = this.confirmKind();
    return k ? this.CONFIRM[k] : null;
  });

  runConfirm(kind: ConfirmKind): void {
    this.confirmKind.set(null);
    const id = this.id();
    switch (kind) {
      case 'archive':
        // REF E : l'archivage est persisté ; on masque aussi le projet dans les
        // barres latérales tout de suite (ses canaux + GED disparaissent).
        this.projectsSvc.archive(id).subscribe(() => {
          this.archivedSvc.archive(id);
          this.showToast('Projet archivé');
          this._t = setTimeout(() => this.router.navigate(['/app/projets/archives']), 900);
        });
        break;
      case 'restore':
        this.projectsSvc.restore(id).subscribe(() => {
          this.archivedSvc.restore(id);
          this.showToast('Projet restauré');
          this._t = setTimeout(() => this.router.navigate(['/app/projets', id, 'kanban']), 900);
        });
        break;
      case 'delete':
        this.projectsSvc.remove(id).subscribe(() => {
          this.archivedSvc.archive(id);
          this.showToast('Projet supprimé définitivement');
          this._t = setTimeout(() => this.router.navigate(['/app/projets']), 900);
        });
        break;
      case 'deleteArchived':
        this.projectsSvc.remove(id).subscribe(() => {
          this.showToast('Projet supprimé définitivement');
          this._t = setTimeout(() => this.router.navigate(['/app/projets/archives']), 900);
        });
        break;
    }
  }

  private showToast(msg: string): void {
    this.roToast.set(msg);
    clearTimeout(this._t);
  }
}
