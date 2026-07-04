import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AccueilService } from '@core/services/accueil.service';
import { SessionService } from '@core/services/session.service';
import { Dashboard } from '@core/models/accueil.models';
import { workspaceSignal } from '@core/util/workspace-signal';

const EMPTY_DASHBOARD: Dashboard = {
  kpis: { projectsActive: 0, projectsLate: 0, projectsArchived: 0, tasksDone: 0, tasksTotal: 0, tasksOverdue: 0, tasksOverdueProjects: 0, members: 0, membersOnline: 0 },
  charge: [], alerts: [], overdueProjects: [], projects: [],
};

@Component({
  selector: 'app-tableau-de-bord',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <div class="top">
        <div>
          <h1>Tableau de bord</h1>
          <p>Vue globale de l'espace de travail : projets, activité et membres.</p>
        </div>
        <button class="report"><app-icon name="file" [size]="15" [stroke]="2" />Générer un rapport</button>
      </div>

      <div class="kpis">
        <div class="card kpi">
          <div class="kpi__l">Projets</div>
          <div class="kpi__row">
            <div class="ms"><span class="ms__v" style="color:var(--nx-indigo)">{{ k().projectsActive }}</span><span class="ms__l">actifs</span></div>
            <div class="ms"><span class="ms__v" style="color:var(--nx-danger)">{{ k().projectsLate }}</span><span class="ms__l">en retard</span></div>
            <div class="ms"><span class="ms__v" style="color:#8E8AA0">{{ k().projectsArchived }}</span><span class="ms__l">archivés</span></div>
          </div>
        </div>
        <div class="card kpi">
          <div class="kpi__l">Tâches terminées</div>
          <div class="kpi__big"><span class="v">{{ k().tasksDone }}</span><span class="t">/ {{ k().tasksTotal }}</span><span class="pct">{{ donePct() }} %</span></div>
          <div class="bar"><div class="bar__f" [style.width.%]="donePct()" style="background:var(--nx-success)"></div></div>
        </div>

        <!-- Carte cliquable : ouvre le modal des projets concernés -->
        <button type="button" class="card kpi kpi--btn" (click)="overdueOpen.set(true)">
          <div class="kpi__l">Tâches en retard</div>
          <div class="kpi__num" style="color:var(--nx-danger)">{{ k().tasksOverdue }}</div>
          <div class="kpi__sub">réparties sur {{ k().tasksOverdueProjects }} projets<app-icon class="kpi__go" name="chevronRight" [size]="15" [stroke]="2.2" /></div>
        </button>

        <!-- Carte cliquable : redirige vers Paramètres → Membres -->
        <button type="button" class="card kpi kpi--btn" (click)="goToMembers()">
          <div class="kpi__l">Membres du workspace</div>
          <div class="kpi__num">{{ k().members }}</div>
          <div class="kpi__sub">Voir tous les membres<app-icon class="kpi__go" name="chevronRight" [size]="15" [stroke]="2.2" /></div>
        </button>
      </div>

      <!-- Charge de travail : pleine largeur -->
      <div class="card charge">
        <div class="card__t">Charge de travail par projet</div>
        <div class="card__s">Nombre de tâches actives par projet dans le workspace.</div>
        <div class="charge__rows">
          @for (c of dash().charge; track c.id) {
            <button type="button" class="cb" (click)="goToProject(c.id)">
              <span class="cb__n">{{ c.n }}</span>
              <div class="cb__track"><div class="cb__f" [style.width.%]="c.v / 60 * 100" [style.background]="c.c"></div><span class="cb__v">{{ c.v }}</span></div>
            </button>
          }
        </div>
      </div>

      <!-- Projets en cours : en dessous -->
      <div class="card projs">
        <div class="projs__h"><span class="card__t">Projets en cours</span><span class="projs__c">{{ dash().projects.length }} projets</span></div>
        <div class="projs__body">
          @for (p of dash().projects; track p.id) {
            <button type="button" class="pr" (click)="goToProject(p.id)">
              <div class="pr__r1">
                <span class="pr__dot" [style.background]="p.c"></span>
                <span class="pr__n">{{ p.n }}</span>
                <span class="pr__e" [class]="'pr__e--' + p.e">{{ etat(p.e) }}</span>
              </div>
              <div class="pr__r2">
                <div class="bar"><div class="bar__f" [style.width.%]="p.p" [style.background]="p.c"></div></div>
                <span class="pr__p">{{ p.p }}%</span>
              </div>
              <div class="pr__r3">
                <app-icon name="calendar" [size]="14" /><span>Échéance {{ p.due }}</span><span class="sep">·</span>
                <span [style.color]="p.days <= 5 ? '#F5564E' : 'var(--nx-text-500)'" style="font-weight:600">{{ p.days }} j restants</span>
              </div>
            </button>
          }
        </div>
      </div>
    </div>

    <!-- Modal : projets concernés par les tâches en retard -->
    @if (overdueOpen()) {
      <div class="ov" (click)="overdueOpen.set(false)">
        <div class="ov__card" (click)="$event.stopPropagation()">
          <div class="ov__h">
            <div class="ov__hl">
              <span class="ov__ic"><app-icon name="alert" [size]="18" [stroke]="2" /></span>
              <div>
                <div class="ov__t">Tâches en retard</div>
                <div class="ov__s">{{ k().tasksOverdue }} tâches réparties sur {{ dash().overdueProjects.length }} projet{{ dash().overdueProjects.length > 1 ? 's' : '' }}</div>
              </div>
            </div>
            <button type="button" class="ov__x" (click)="overdueOpen.set(false)"><app-icon name="x" [size]="18" [stroke]="2" /></button>
          </div>
          <div class="ov__body">
            @for (o of dash().overdueProjects; track o.id) {
              <button type="button" class="op" (click)="goToOverdueProject(o.id)">
                <span class="op__dot" [style.background]="o.c"></span>
                <span class="op__n">{{ o.n }}</span>
                <span class="op__c">{{ o.count }} en retard</span>
                <app-icon name="chevronRight" [size]="16" [stroke]="2.2" />
              </button>
            } @empty {
              <div class="op__empty">Aucune tâche en retard 🎉</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './tableau-de-bord.component.scss',
})
export class TableauDeBordComponent {
  private router = inject(Router);
  private session = inject(SessionService);
  private accueil = inject(AccueilService);

  /** Dashboard of the active workspace (reload on workspace switch). */
  dash = workspaceSignal<Dashboard>(this.session, () => this.accueil.dashboard(), EMPTY_DASHBOARD);
  k = computed(() => this.dash().kpis);
  donePct = computed(() => { const t = this.k().tasksTotal; return t ? Math.round(this.k().tasksDone / t * 100) : 0; });

  overdueOpen = signal(false);

  etat(e: string): string { return e === 'bonne' ? 'En bonne voie' : e === 'surveiller' ? 'À surveiller' : 'Critique'; }

  /** Open a project on its kanban board. */
  goToProject(id: string): void {
    this.overdueOpen.set(false);
    this.router.navigate(['/app/projets', id, 'kanban']);
  }

  /** Open a project's kanban with the "en retard" échéance filter pre-applied. */
  goToOverdueProject(id: string): void {
    this.overdueOpen.set(false);
    this.router.navigate(['/app/projets', id, 'kanban'], { queryParams: { ech: 'retard' } });
  }

  /** Jump to Paramètres → Membres du workspace. */
  goToMembers(): void {
    this.router.navigate(['/app/parametres/membres']);
  }
}
