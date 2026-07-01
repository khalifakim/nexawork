import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface Charge { n: string; v: number; c: string; }
interface Proj { n: string; c: string; p: number; due: string; days: number; e: 'bonne' | 'surveiller' | 'critique'; }
interface Alert { icon: string; t: string; s: string; danger: boolean; }

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
            <div class="ms"><span class="ms__v" style="color:var(--nx-indigo)">5</span><span class="ms__l">actifs</span></div>
            <div class="ms"><span class="ms__v" style="color:var(--nx-danger)">2</span><span class="ms__l">en retard</span></div>
            <div class="ms"><span class="ms__v" style="color:#8E8AA0">3</span><span class="ms__l">archivés</span></div>
          </div>
        </div>
        <div class="card kpi">
          <div class="kpi__l">Tâches terminées</div>
          <div class="kpi__big"><span class="v">142</span><span class="t">/ 220</span><span class="pct">64 %</span></div>
          <div class="bar"><div class="bar__f" style="width:64%;background:var(--nx-success)"></div></div>
        </div>
        <div class="card kpi">
          <div class="kpi__l">Tâches en retard</div>
          <div class="kpi__num" style="color:var(--nx-danger)">4</div>
          <div class="kpi__sub">réparties sur 2 projets</div>
        </div>
        <div class="card kpi">
          <div class="kpi__l">Membres du workspace</div>
          <div class="kpi__num">12</div>
          <div class="kpi__sub"><span class="dot"></span>6 en ligne</div>
        </div>
      </div>

      <div class="mid">
        <div class="card charge">
          <div class="card__t">Charge de travail par projet</div>
          <div class="card__s">Nombre de tâches actives par projet dans le workspace.</div>
          <div class="charge__rows">
            @for (c of charge; track c.n) {
              <div class="cb">
                <span class="cb__n">{{ c.n }}</span>
                <div class="cb__track"><div class="cb__f" [style.width.%]="c.v / 60 * 100" [style.background]="c.c"></div><span class="cb__v">{{ c.v }}</span></div>
              </div>
            }
          </div>
        </div>
        <div class="card alerts">
          <div class="card__t">Alertes</div>
          <div class="alerts__l">
            @for (a of alerts; track a.t) {
              <div class="al" [class.al--d]="a.danger">
                <span class="al__i"><app-icon [name]="a.icon" [size]="17" [stroke]="2" /></span>
                <div class="al__b"><div class="al__t">{{ a.t }}</div><div class="al__s">{{ a.s }}</div></div>
                <app-icon name="chevronRight" [size]="16" [stroke]="2.2" />
              </div>
            }
          </div>
        </div>
      </div>

      <div class="card projs">
        <div class="projs__h"><span class="card__t">Projets en cours</span><span class="projs__c">{{ projs.length }} projets</span></div>
        <div class="projs__body">
          @for (p of projs; track p.n) {
            <div class="pr">
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
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './tableau-de-bord.component.scss',
})
export class TableauDeBordComponent {
  charge: Charge[] = [
    { n: 'Migration Backend', v: 52, c: '#E0497B' },
    { n: 'Refonte App Mobile', v: 38, c: '#6C70F0' },
    { n: 'Design System', v: 24, c: '#3AA9E0' },
    { n: 'Campagne Q3', v: 16, c: '#2BB673' },
    { n: 'Site Vitrine', v: 9, c: '#F2693C' },
  ];
  alerts: Alert[] = [
    { icon: 'alert',    t: '4 tâches en retard',        s: 'Migration Backend · Site Vitrine 2025',       danger: true  },
    { icon: 'calendar', t: '3 échéances cette semaine', s: 'Campagne Q3, Migration Backend, Site Vitrine', danger: false },
    { icon: 'shield',   t: '1 projet critique',         s: 'Migration Backend — 24 % à J-3',              danger: true  },
    { icon: 'alert',    t: '2 tâches bloquées',         s: 'En attente de validation',                    danger: false },
    { icon: 'calendar', t: 'Backend API sans activité', s: 'Depuis 5 jours',                              danger: false },
  ];
  projs: Proj[] = [
    { n: 'Refonte App Mobile', c: '#6C70F0', p: 62, due: '30 sept.', days: 12, e: 'bonne' },
    { n: 'Campagne Q3 Marketing', c: '#2BB673', p: 80, due: '12 août', days: 5, e: 'surveiller' },
    { n: 'Migration Backend', c: '#E0497B', p: 24, due: '5 août', days: 3, e: 'critique' },
    { n: 'Design System Nexa', c: '#3AA9E0', p: 55, due: '20 sept.', days: 18, e: 'bonne' },
    { n: 'Site Vitrine 2025', c: '#F2693C', p: 38, due: '28 août', days: 9, e: 'surveiller' },
  ];
  etat(e: string): string { return e === 'bonne' ? 'En bonne voie' : e === 'surveiller' ? 'À surveiller' : 'Critique'; }
}
