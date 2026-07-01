import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface Seg { l: string; v: number; c: string; }
interface Alert { t: string; s: string; sev: 'critique' | 'surveiller' | 'normal'; }
interface Deadline { t: string; who: string; due: string; urgent: boolean; }

@Component({
  selector: 'app-vue-d-ensemble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      @if (!readonly) {
        <div class="topbar">
          <button class="report"><app-icon name="file" [size]="15" [stroke]="2" />Générer un rapport</button>
        </div>
      }

      <!-- KPI -->
      <div class="kpis">
        <div class="card kpi">
          <div class="kpi__l">Avancement global</div>
          <div class="kpi__pct"><span class="v">62</span><span class="u">%</span></div>
          <div class="bar"><div class="bar__f" style="width:62%;background:var(--nx-indigo)"></div></div>
        </div>
        <div class="card kpi">
          <div class="kpi__l">Tâches terminées</div>
          <div class="kpi__big"><span class="v" style="color:var(--nx-success)">28</span><span class="t">/ 45</span></div>
          <div class="kpi__sub">17 tâches restantes</div>
        </div>
        <div class="card kpi">
          <div class="kpi__l">Tâches en retard</div>
          <div class="kpi__num" style="color:var(--nx-danger)">4</div>
          <div class="kpi__sub">à traiter en priorité</div>
        </div>
        <div class="card kpi">
          <div class="kpi__l">Membres du projet</div>
          <div class="kpi__big"><span class="v">8</span><span class="t">membres</span></div>
          <div class="kpi__sub">répartis dans 3 équipes</div>
        </div>
      </div>

      <!-- donut + alertes -->
      <div class="row2">
        <div class="card pad rowfix">
          <div class="card__t">Répartition des tâches par statut</div>
          <div class="donut">
            <div class="donut__g">
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="56" fill="none" stroke="#F0EEE8" stroke-width="22"></circle>
                @for (s of ring(); track $index) {
                  <circle cx="80" cy="80" r="56" fill="none" [attr.stroke]="s.c" stroke-width="22"
                          [attr.stroke-dasharray]="s.dash" [attr.stroke-dashoffset]="s.off" transform="rotate(-90 80 80)"></circle>
                }
              </svg>
              <div class="donut__c"><span class="n">{{ total }}</span><span class="l">tâches</span></div>
            </div>
            <div class="legend">
              @for (s of segs; track s.l) {
                <div class="lg"><span class="lg__d" [style.background]="s.c"></span><span class="lg__l">{{ s.l }}</span><span class="lg__v">{{ s.v }}</span></div>
              }
            </div>
          </div>
        </div>

        <div class="card pad rowfix">
          <div class="card__t">Alertes</div>
          <div class="alerts">
            @for (a of alerts; track a.t) {
              <div class="al" [class]="'al--' + a.sev">
                <span class="al__d"></span>
                <div class="al__b"><div class="al__t">{{ a.t }}</div><div class="al__s">{{ a.s }}</div></div>
                <app-icon name="chevronRight" [size]="16" [stroke]="2.2" />
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
        @for (d of deadlines; track d.t; let i = $index) {
          <div class="dl__row" [class.dl__row--first]="i===0">
            <div class="dl__t"><span class="dl__dot" [style.background]="d.urgent ? 'var(--nx-danger)' : '#C9C5BC'"></span><span>{{ d.t }}</span></div>
            <span class="dl__w">{{ d.who }}</span>
            <span class="dl__d" [style.color]="d.urgent ? 'var(--nx-danger)' : 'var(--nx-text-500)'">{{ d.due }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './vue-d-ensemble.component.scss',
})
export class VueDEnsembleComponent {
  @Input() readonly = false;

  segs: Seg[] = [
    { l: 'À faire', v: 8, c: '#8E8AA0' },
    { l: 'En cours', v: 7, c: '#5B8DEF' },
    { l: 'En revue', v: 2, c: '#E89A2C' },
    { l: 'Terminé', v: 28, c: '#2BB673' },
  ];
  total = this.segs.reduce((a, s) => a + s.v, 0);

  alerts: Alert[] = [
    { t: '4 tâches en retard', s: 'réparties sur le projet', sev: 'critique' },
    { t: '2 tâches bloquées', s: 'en attente de validation', sev: 'critique' },
    { t: 'Backend API — aucune activité', s: 'depuis 5 jours', sev: 'surveiller' },
    { t: 'Échéance principale à J-3', s: '30 sept. 2025', sev: 'surveiller' },
    { t: '2 commentaires sans réponse', s: 'depuis hier', sev: 'normal' },
  ];
  deadlines: Deadline[] = [
    { t: 'Valider les maquettes UI', who: 'Aïda Ndiaye', due: 'Demain', urgent: true },
    { t: 'API Login', who: 'Moussa Bâ', due: 'Demain', urgent: true },
    { t: 'Dashboard Admin', who: 'Fatou Sarr', due: 'Dans 2 jours', urgent: false },
    { t: 'Documentation API', who: 'Moussa Bâ', due: 'Dans 3 jours', urgent: false },
    { t: 'Tests finaux', who: 'Yacine Sow', due: 'Dans 5 jours', urgent: false },
  ];

  ring(): { c: string; dash: string; off: number }[] {
    const C = 2 * Math.PI * 56;
    let acc = 0;
    return this.segs.map(s => {
      const len = (s.v / this.total) * C;
      const seg = { c: s.c, dash: `${len} ${C - len}`, off: -acc };
      acc += len;
      return seg;
    });
  }
}
