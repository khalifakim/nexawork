import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { TasksService } from '@core/services/tasks.service';
import { ReportsService } from '@core/services/reports.service';
import { SessionService } from '@core/services/session.service';
import { ProjectOverviewResponse } from '@core/models/task.models';

interface Seg { l: string; v: number; c: string; }

@Component({
  selector: 'app-vue-d-ensemble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      @if (!readonly) {
        <div class="topbar">
          <button class="report" [disabled]="reports.busy()" (click)="generateReport()"><app-icon name="file" [size]="15" [stroke]="2" />{{ reports.busy() ? 'Génération…' : 'Générer un rapport' }}</button>
        </div>
      }

      <!-- KPI -->
      <div class="kpis">
        <div class="card kpi">
          <div class="kpi__l">Avancement global</div>
          <div class="kpi__pct"><span class="v">{{ progress() }}</span><span class="u">%</span></div>
          <div class="bar"><div class="bar__f" [style.width.%]="progress()" style="background:var(--nx-indigo)"></div></div>
        </div>
        <div class="card kpi">
          <div class="kpi__l">Tâches terminées</div>
          <div class="kpi__big"><span class="v" style="color:var(--nx-success)">{{ done() }}</span><span class="t">/ {{ total() }}</span></div>
          <div class="kpi__sub">{{ remaining() }} tâches restantes</div>
        </div>
        <button type="button" class="card kpi kpi--btn" (click)="goToLateTasks()" title="Voir les tâches en retard">
          <div class="kpi__l">Tâches en retard</div>
          <div class="kpi__num" style="color:var(--nx-danger)">{{ overdue() }}</div>
          <div class="kpi__sub">à traiter en priorité</div>
          <span class="kpi__cta"><app-icon name="chevronRight" [size]="14" [stroke]="2.2" /></span>
        </button>
        <button type="button" class="card kpi kpi--btn" (click)="goToTeam()" title="Voir les membres du projet">
          <div class="kpi__l">Membres du projet</div>
          <div class="kpi__big"><span class="v">{{ members() }}</span><span class="t">membres</span></div>
          <div class="kpi__sub">rattachés au projet</div>
          <span class="kpi__cta"><app-icon name="chevronRight" [size]="14" [stroke]="2.2" /></span>
        </button>
      </div>

      <!-- Répartition (pleine largeur) -->
      <div class="card pad rep">
        <div class="rep__head">
          <div>
            <div class="card__t">Répartition des tâches par statut</div>
            <div class="card__s">Vue globale de l'avancement des {{ total() }} tâches du projet.</div>
          </div>
          <div class="rep__totals">
            <div class="rep__stat">
              <span class="rep__stat__v">{{ done() }}</span>
              <span class="rep__stat__l">Terminées</span>
            </div>
            <div class="rep__stat">
              <span class="rep__stat__v">{{ active() }}</span>
              <span class="rep__stat__l">En cours</span>
            </div>
            <div class="rep__stat">
              <span class="rep__stat__v">{{ notStarted() }}</span>
              <span class="rep__stat__l">À faire</span>
            </div>
          </div>
        </div>

        <div class="donut">
          <div class="donut__g">
            <svg width="180" height="180" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="56" fill="none" stroke="#F0EEE8" stroke-width="22"></circle>
              @for (s of ring(); track $index) {
                <circle cx="80" cy="80" r="56" fill="none" [attr.stroke]="s.c" stroke-width="22"
                        [attr.stroke-dasharray]="s.dash" [attr.stroke-dashoffset]="s.off" transform="rotate(-90 80 80)"></circle>
              }
            </svg>
            <div class="donut__c"><span class="n">{{ total() }}</span><span class="l">tâches</span></div>
          </div>
          <div class="legend">
            @for (s of segs(); track s.l) {
              <div class="lg">
                <span class="lg__d" [style.background]="s.c"></span>
                <span class="lg__l">{{ s.l }}</span>
                <span class="lg__bar"><span class="lg__bar__f" [style.width.%]="pct(s.v)" [style.background]="s.c"></span></span>
                <span class="lg__v">{{ s.v }}</span>
                <span class="lg__p">{{ pct(s.v) }}%</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- échéances -->
      <div class="card pad dl">
        <div class="card__t">Échéances proches</div>
        <div class="card__s">Les tâches les plus urgentes à traiter en priorité.</div>
        <div class="dl__head"><span>Tâche</span><span>Responsable</span><span style="text-align:right">Échéance</span></div>
        @for (d of deadlines(); track d.taskId; let i = $index) {
          <div class="dl__row" [class.dl__row--first]="i===0">
            <div class="dl__t"><span class="dl__dot" [style.background]="isUrgent(d.dueDate) ? 'var(--nx-danger)' : '#C9C5BC'"></span><span>{{ d.title }}</span></div>
            <span class="dl__w">—</span>
            <span class="dl__d" [style.color]="isUrgent(d.dueDate) ? 'var(--nx-danger)' : 'var(--nx-text-500)'">{{ dueLabel(d.dueDate) }}</span>
          </div>
        } @empty {
          <div class="dl__row dl__row--first"><span class="dl__w" style="grid-column:1/-1;color:var(--nx-text-400)">Aucune échéance à venir.</span></div>
        }
      </div>
    </div>
  `,
  styleUrl: './vue-d-ensemble.component.scss',
})
export class VueDEnsembleComponent {
  @Input() readonly = false;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tasksSvc = inject(TasksService);
  private session = inject(SessionService);
  protected reports = inject(ReportsService);

  generateReport(): void {
    const id = this.projectId();
    if (id) this.reports.projectReport(id, this.session.activeWorkspace().name);
  }

  private projectId(): string {
    return this.route.snapshot.paramMap.get('id')
      ?? this.route.parent?.snapshot.paramMap.get('id')
      ?? '';
  }

  private overview = toSignal<ProjectOverviewResponse | null>(
    this.route.paramMap.pipe(switchMap(() => this.tasksSvc.overview(this.projectId()))),
    { initialValue: null },
  );

  progress   = computed(() => this.overview()?.progress ?? 0);
  total      = computed(() => this.overview()?.totalTasks ?? 0);
  done       = computed(() => (this.overview()?.doneTasks ?? 0) + (this.overview()?.closedTasks ?? 0));
  active     = computed(() => this.overview()?.activeTasks ?? 0);
  notStarted = computed(() => this.overview()?.notStartedTasks ?? 0);
  remaining  = computed(() => this.total() - this.done());
  overdue    = computed(() => this.overview()?.overdueTasks ?? 0);
  members    = computed(() => this.overview()?.memberCount ?? 0);
  deadlines  = computed(() => this.overview()?.upcomingDueTasks ?? []);

  segs = computed<Seg[]>(() => {
    const o = this.overview();
    return [
      { l: 'À faire',   v: o?.notStartedTasks ?? 0, c: '#8E8AA0' },
      { l: 'En cours',  v: o?.activeTasks ?? 0,     c: '#5B8DEF' },
      { l: 'Terminées', v: o?.doneTasks ?? 0,       c: '#2BB673' },
      { l: 'Fermées',   v: o?.closedTasks ?? 0,     c: '#2B9E8E' },
    ];
  });

  goToLateTasks(): void {
    this.router.navigate(['/app/projets', this.projectId(), 'kanban'], { queryParams: { ech: 'retard' } });
  }
  goToTeam(): void {
    this.router.navigate(['/app/projets', this.projectId(), 'equipes']);
  }

  pct(v: number): number { const t = this.total(); return t ? Math.round((v / t) * 100) : 0; }

  ring(): { c: string; dash: string; off: number }[] {
    const C = 2 * Math.PI * 56;
    const total = this.total() || 1;
    let acc = 0;
    return this.segs().map(s => {
      const len = (s.v / total) * C;
      const seg = { c: s.c, dash: `${len} ${C - len}`, off: -acc };
      acc += len;
      return seg;
    });
  }

  private daysUntil(dueDate: string): number {
    const d = new Date(dueDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86_400_000);
  }
  isUrgent(dueDate: string): boolean { return this.daysUntil(dueDate) <= 1; }
  dueLabel(dueDate: string): string {
    const n = this.daysUntil(dueDate);
    if (n < 0) return 'En retard';
    if (n === 0) return "Aujourd'hui";
    if (n === 1) return 'Demain';
    if (n <= 7) return 'Dans ' + n + ' jours';
    return new Date(dueDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
}
