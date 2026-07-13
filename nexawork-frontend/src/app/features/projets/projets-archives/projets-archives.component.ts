import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ConfirmDialogComponent } from '@shared/overlays/confirm-dialog/confirm-dialog.component';
import { FilterChipComponent, FilterOption } from '@shared/ui/filter-chip/filter-chip.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { ProjectsService } from '@core/services/projects.service';
import { SessionService } from '@core/services/session.service';
import { DataRefreshService } from '@core/services/data-refresh.service';
import { ArchivedProjectsService } from '@core/services/archived-projects.service';
import { Project } from '@core/models/project.models';
import { workspaceSignal } from '@core/util/workspace-signal';

@Component({
  selector: 'app-projets-archives',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ConfirmDialogComponent, FilterChipComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <button class="back" (click)="back()"><app-icon name="chevronLeft" [size]="14" />Retour aux projets actifs</button>
        <div class="tt">
          <span class="ic"><app-icon name="archive" [size]="19" /></span>
          <h1>Projets archivés</h1>
          <span class="cnt">{{ shown().length }}</span>
        </div>
        <p>Réservé à l'administrateur. Restaurez un projet pour le réactiver, ou supprimez-le définitivement.</p>
        <div class="filters">
          <div class="search"><app-icon name="search" [size]="16" /><input placeholder="Rechercher un projet archivé…" [value]="q()" (input)="q.set($any($event.target).value)" /></div>
          <app-filter-chip label="Chef de projet" [options]="chefOpts()" [value]="chefFilter()" (valueChange)="chefFilter.set($event)" />
          <app-filter-chip label="Date d'archivage" [options]="DATE_OPTS" [value]="dateFilter()" (valueChange)="dateFilter.set($event)" />
        </div>
      </div>
      <div class="tbl">
        <div class="thead"><span>Projet</span><span>Chef de projet</span><span>Membres</span><span>Archivé le</span><span></span></div>
        @for (p of shown(); track p.id) {
          <div class="row" (click)="openProj(p)">
            <div class="name"><span class="dot" [style.background]="p.color"><app-icon name="projects" [size]="16" /></span><span class="nm">{{ p.name }}</span></div>
            <span class="muted">—</span>
            <span class="muted">{{ p.memberCount }} membres</span>
            <span class="muted">{{ archivedOn(p) }}</span>
            <div class="acts" (click)="$event.stopPropagation()">
              <button class="restore" (click)="restore(p)"><app-icon name="restore" [size]="14" />Restaurer</button>
              <button class="del" title="Supprimer définitivement" (click)="confirmTarget.set(p)"><app-icon name="trash" [size]="15" /></button>
            </div>
          </div>
        } @empty { <div class="empty">Aucun projet archivé</div> }
      </div>
    </div>

    @if (confirmTarget(); as target) {
      <app-confirm-dialog
        [danger]="true"
        title="Supprimer définitivement"
        [subtitle]="target.name"
        icon="trash"
        confirmLabel="Supprimer définitivement"
        [lines]="[
          'Cette suppression est irréversible.',
          'Le projet archivé et toutes ses ressources seront définitivement supprimés.'
        ]"
        (confirmed)="doDelete()"
        (closed)="confirmTarget.set(null)" />
    }

    @if (toastMsg()) {
      <div class="toast">
        <span class="toast__i"><app-icon name="check" [size]="14" /></span>
        <span class="toast__t">{{ toastMsg() }}</span>
        <button class="toast__x" (click)="toastMsg.set(null)"><app-icon name="x" [size]="14" /></button>
      </div>
    }
  `,
  styleUrl: './projets-archives.component.scss',
})
export class ProjetsArchivesComponent {
  private router = inject(Router);
  private bus = inject(ShellBus);
  private projectsSvc = inject(ProjectsService);
  private session = inject(SessionService);
  private refresh = inject(DataRefreshService);
  private archivedSvc = inject(ArchivedProjectsService);

  q = signal('');
  private locallyRemoved = signal<Set<string>>(new Set());
  confirmTarget = signal<Project | null>(null);
  toastMsg = signal<string | null>(null);
  chefFilter = signal<string | null>(null);
  dateFilter = signal<string | null>(null);
  private _t: any;

  /**
   * Options du filtre « Chef de projet », dérivées des projets archivés. Le nom
   * du chef n'est pas encore résolu (annuaire des membres = phase I3) : la liste
   * reste vide en I2a — le chip est présent (design préservé) mais inerte.
   */
  chefOpts = computed<FilterOption[]>(() => []);

  private archived = workspaceSignal<Project[]>(
    this.session, () => this.projectsSvc.listArchived(), [], this.refresh.projects,
  );

  readonly DATE_OPTS: FilterOption[] = [
    { value: '7j',  label: '7 derniers jours' },
    { value: '30j', label: '30 derniers jours' },
    { value: '90j', label: '3 derniers mois' },
  ];

  shown = computed<Project[]>(() => {
    const q = this.q().toLowerCase().trim();
    const date = this.dateFilter();
    const rm = this.locallyRemoved();
    return this.archived().filter(p => {
      if (rm.has(p.id)) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (date && !this.withinDate(p.lastModifiedDate, date)) return false;
      return true;
    });
  });

  /** Date d'archivage lisible (dernière modification d'un projet archivé). */
  archivedOn(p: Project): string {
    const raw = p.lastModifiedDate ?? p.createdDate;
    if (!raw) return '—';
    return new Date(raw).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private withinDate(raw: string | undefined, bucket: string): boolean {
    if (!raw) return true;
    const diff = (Date.now() - new Date(raw).getTime()) / 86_400_000;
    if (bucket === '7j')  return diff <= 7;
    if (bucket === '30j') return diff <= 30;
    if (bucket === '90j') return diff <= 90;
    return true;
  }

  /**
   * Return from the archived-projects area back to the active projects list.
   * Force sidebar 2 to expand — the user asked to "see all active projects".
   */
  back(): void { this.bus.openSidebar(); this.router.navigate(['/app/projets']); }

  openProj(p: Project): void {
    this.router.navigate(['/app/projets', p.id, 'kanban'], { queryParams: { ro: '1', name: p.name } });
  }

  restore(p: Project): void {
    this.projectsSvc.restore(p.id).subscribe(() => {
      this.archivedSvc.restore(p.id);
      this.locallyRemoved.update(s => new Set(s).add(p.id));
      this.refresh.bumpProjects();
      this.showToast('Projet « ' + p.name + ' » restauré');
    });
  }

  doDelete(): void {
    const p = this.confirmTarget();
    if (!p) return;
    this.confirmTarget.set(null);
    this.projectsSvc.remove(p.id).subscribe(() => {
      this.locallyRemoved.update(s => new Set(s).add(p.id));
      this.refresh.bumpProjects();
      this.showToast('Projet supprimé définitivement');
    });
  }

  private showToast(msg: string): void {
    this.toastMsg.set(msg);
    clearTimeout(this._t);
    this._t = setTimeout(() => this.toastMsg.set(null), 2800);
  }
}
