import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface Row { id: string; name: string; who: string; start: number; span: number; prog: number; c: string; }

@Component({
  selector: 'app-gantt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <div class="pbar">
        <button class="chip chip--on">Assigné à<app-icon name="chevronDown" [size]="13" [stroke]="2.4" /></button>
        <div class="seg">
          @for (p of periods; track p) { <button [class.seg--on]="period()===p" (click)="period.set(p)">{{ p }}</button> }
        </div>
      </div>
      <div class="chart">
        <div class="grid">
          <div class="tlh">
            <div class="tlh__name">Tâche</div>
            @for (c of cols; track c) { <div class="tlh__col">{{ c }}</div> }
          </div>
          @for (r of rows; track r.id; let i = $index) {
            <div class="gr" [class.gr--alt]="i % 2 === 1">
              <div class="gr__name">
                <span class="av" [style.background]="r.who"></span>
                <span class="id nx-mono">{{ r.id }}</span>
                <span class="nm">{{ r.name }}</span>
              </div>
              <div class="lane">
                @for (c of cols; track $index; let ci = $index) { <div class="gline" [style.left.px]="ci * colW"></div> }
                <div class="bar" [style.left.px]="r.start * colW + 6" [style.width.px]="r.span * colW - 12"
                     [style.background]="r.prog === 100 ? r.c : 'rgba(0,0,0,.06)'" [style.border-color]="r.prog === 100 ? r.c : 'rgba(0,0,0,.10)'">
                  <div class="fill" [style.width.%]="r.prog" [style.background]="r.c" [style.opacity]="r.prog === 100 ? 1 : .88"></div>
                  <span class="lbl" [style.color]="r.prog >= 50 ? '#fff' : '#56525c'">{{ r.prog }}%</span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './gantt.component.scss',
})
export class GanttComponent {
  periods = ['Aujourd’hui', 'Jour', 'Semaine', 'Mois', 'Trimestre', 'Année'];
  period = signal('Mois');
  cols = ['Sem. 36', 'Sem. 37', 'Sem. 38', 'Sem. 39', 'Sem. 40', 'Sem. 41'];
  colW = 132;
  rows: Row[] = [
    { id: 'MOB-101', name: 'Wireframes écran onboarding', who: '#F2693C', start: 0, span: 1.5, prog: 20, c: '#6C70F0' },
    { id: 'MOB-094', name: 'Intégration écran profil', who: '#6C70F0', start: 1, span: 2, prog: 55, c: '#5B8DEF' },
    { id: 'MOB-130', name: 'API auth — refresh token', who: '#3AA9E0', start: 1.5, span: 1.5, prog: 40, c: '#5B8DEF' },
    { id: 'MOB-077', name: 'Page paramètres — design final', who: '#E0497B', start: 2.5, span: 1, prog: 90, c: '#E89A2C' },
    { id: 'MOB-118', name: 'Audit accessibilité WCAG', who: '#2BB673', start: 3, span: 2, prog: 0, c: '#8E8AA0' },
    { id: 'MOB-061', name: 'Système de design tokens', who: '#6C70F0', start: 0.5, span: 2.5, prog: 100, c: '#2BB673' },
    { id: 'MOB-140', name: 'Tests E2E parcours achat', who: '#F2693C', start: 4, span: 2, prog: 10, c: '#5B8DEF' },
  ];
}
