import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
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
import { ProjectsService } from '@core/services/projects.service';
import { Project } from '@core/models/project.models';
import { TaskCard } from '@core/models/task.models';

interface Tab { key: string; label: string; icon: string; }

@Component({
  selector: 'app-projet-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, KanbanComponent, VueDEnsembleComponent, GanttComponent, CanauxProjetComponent, EquipesComponent, GedViewComponent, FicheTacheComponent, CreerTacheComponent, StatutsComponent, WorkflowComponent],
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
            <span class="pill">En bonne voie</span>
          }
          <span class="spacer"></span>

          @if (isRo()) {
            <button class="btn-restore"><app-icon name="restore" [size]="15" />Restaurer</button>
            <button class="btn-del" (click)="roConfirm.set(true)"><app-icon name="trash" [size]="15" />Supprimer</button>
          } @else {
            <div class="setwrap">
              <button class="set" [class.set--on]="setOpen()" (click)="setOpen.set(!setOpen())"><app-icon name="gear" [size]="15" />Paramètres</button>
              @if (setOpen()) {
                <div class="bd" (click)="setOpen.set(false)"></div>
                <div class="menu" (click)="$event.stopPropagation()">
                  <button class="menu__i"><app-icon name="archive" [size]="16" /><span>Archiver le projet</span></button>
                  <div class="menu__sep"></div>
                  <button class="menu__i menu__i--danger" (click)="setOpen.set(false); delConfirm.set(true)"><app-icon name="trash" [size]="16" /><span>Supprimer le projet</span></button>
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
          <span class="meta"><app-icon name="teams" [size]="15" />8 membres</span>
          <span class="meta"><app-icon name="user" [size]="15" />Chef de projet · Sarah Diallo</span>
          <span class="meta"><app-icon name="calendar" [size]="15" />Échéance · 30 sept. 2025</span>
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
          @case ('kanban') { <app-kanban [readonly]="isRo()" (openTask)="openTask($event)" (create)="createCol.set($event)" (openStatuses)="statutsOpen.set(true)" (openWorkflow)="workflowOpen.set(true)" /> }
          @case ('gantt') { <app-gantt /> }
          @case ('documents') { <app-ged-view [project]="displayName()" [readonly]="isRo()" /> }
          @case ('equipes') { <app-equipes [readonly]="isRo()" /> }
          @case ('canaux') { <app-canaux-projet [readonly]="isRo()" /> }
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

    @if (selected(); as t) { <app-fiche-tache [task]="t" (closed)="selected.set(null)" /> }
    @if (createCol(); as col) { <app-creer-tache [column]="col" [projectName]="displayName()" (closed)="createCol.set(null)" (created)="createCol.set(null)" /> }
    @if (statutsOpen()) { <app-statuts (closed)="statutsOpen.set(false)" /> }
    @if (workflowOpen()) { <app-workflow (closed)="workflowOpen.set(false)" /> }

    @if (roConfirm()) {
      <div class="overlay" (click)="roConfirm.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__bd">
            <div class="modal__top">
              <span class="modal__i"><app-icon name="trash" [size]="22" /></span>
              <div>
                <div class="modal__title">Supprimer définitivement</div>
                <div class="modal__sub">{{ displayName() }}</div>
              </div>
            </div>
            <div class="modal__lines">
              <div class="modal__line"><span class="modal__dot"></span><span>Cette suppression est irréversible.</span></div>
              <div class="modal__line"><span class="modal__dot"></span><span>Le projet archivé et toutes ses ressources seront définitivement supprimés.</span></div>
            </div>
          </div>
          <div class="modal__ft">
            <button class="modal__cancel" (click)="roConfirm.set(false)">Annuler</button>
            <button class="modal__confirm" (click)="doDeleteRo()"><app-icon name="trash" [size]="16" />Supprimer définitivement</button>
          </div>
        </div>
      </div>
    }

    @if (delConfirm()) {
      <div class="overlay" (click)="delConfirm.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__bd">
            <div class="modal__top">
              <span class="modal__i"><app-icon name="trash" [size]="22" /></span>
              <div>
                <div class="modal__title">Supprimer définitivement</div>
                <div class="modal__sub">{{ displayName() }}</div>
              </div>
            </div>
            <div class="modal__lines">
              <div class="modal__line"><span class="modal__dot"></span><span>Cette suppression est irréversible.</span></div>
              <div class="modal__line"><span class="modal__dot"></span><span>Le projet et toutes ses ressources associées seront définitivement supprimés.</span></div>
            </div>
          </div>
          <div class="modal__ft">
            <button class="modal__cancel" (click)="delConfirm.set(false)">Annuler</button>
            <button class="modal__confirm" (click)="doDelete()"><app-icon name="trash" [size]="16" />Supprimer définitivement</button>
          </div>
        </div>
      </div>
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
  private allProjects = toSignal(this.projectsSvc.list(), { initialValue: [] as Project[] });
  router = inject(Router);

  setOpen      = signal(false);
  selected     = signal<(TaskCard & { proj?: string }) | null>(null);
  createCol    = signal<string | null>(null);
  statutsOpen  = signal(false);
  workflowOpen = signal(false);
  roConfirm    = signal(false);
  delConfirm   = signal(false);
  roToast      = signal<string | null>(null);
  private _t: any;

  id      = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? 'refonte-app-mobile')), { initialValue: 'refonte-app-mobile' });
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

  projectName  = computed(() => this.allProjects().find(p => p.id === this.id())?.name ?? 'Refonte App Mobile');
  displayName  = computed(() => (this.isRo() && this.archName()) ? this.archName() : this.projectName());
  tabLabel     = computed(() => this.tabs.find(t => t.key === this.tab())?.label ?? '');

  openTask(t: TaskCard): void { this.selected.set({ ...t, proj: this.displayName() }); }

  doDelete(): void {
    this.delConfirm.set(false);
    this.roToast.set('Projet supprimé définitivement');
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      this.roToast.set(null);
      this.router.navigate(['/app/projets']);
    }, 2000);
  }

  doDeleteRo(): void {
    this.roConfirm.set(false);
    this.roToast.set('Projet supprimé définitivement');
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      this.roToast.set(null);
      this.router.navigate(['/app/projets/archives']);
    }, 2000);
  }
}
