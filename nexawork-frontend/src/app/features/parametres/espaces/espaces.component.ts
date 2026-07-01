import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface Ws { name: string; color: string; role: string; members: string; mine: boolean; current?: boolean; }

@Component({
  selector: 'app-param-espaces',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgTemplateOutlet],
  template: `
    <div class="set-page"><div class="set-inner">
      <h1 class="set-h1">Mes espaces de travail</h1>
      <p class="set-desc">Consultez et gérez vos espaces de travail.</p>

      <div class="grp"><b>Créés par moi</b><span>{{ mine.length }} espaces</span></div>
      <div class="set-card">
        @for (w of mine; track w.name; let i = $index) { <ng-container *ngTemplateOutlet="row; context: { w: w, i: i, list: mine }"></ng-container> }
      </div>

      <div class="grp"><b>Espaces rejoints</b><span>{{ joined.length }} espaces</span></div>
      <div class="set-card">
        @for (w of joined; track w.name; let i = $index) { <ng-container *ngTemplateOutlet="row; context: { w: w, i: i, list: joined }"></ng-container> }
      </div>
    </div></div>

    <ng-template #row let-w="w" let-i="i" let-list="list">
      <div class="wrow" [class.wrow--first]="i===0">
        <span class="wlogo" [style.background]="w.color">{{ w.name[0] }}</span>
        <div class="b">
          <div class="n">{{ w.name }} @if (w.current) { <span class="cur"><span class="cur__d"></span>Actuel</span> }</div>
          <div class="s">{{ w.members }}</div>
        </div>
        @if (w.mine) { <span class="set-badge set-badge--owner">Propriétaire</span> }
        @else { <span class="set-badge" [class.set-badge--admin]="w.role==='Administrateur'" [class.set-badge--member]="w.role==='Membre'">{{ w.role }}</span> }
        @if (w.mine) { <button class="gear"><app-icon name="gear" [size]="17" /></button> }
        @else { <button class="set-btn set-btn--danger">Quitter</button> }
      </div>
    </ng-template>
  `,
  styleUrl: './espaces.component.scss',
})
export class ParamEspacesComponent {
  mine: Ws[] = [
    { name: 'Atelier Nexa', color: '#6C70F0', role: 'Propriétaire', members: '12 membres', mine: true, current: true },
    { name: 'Projets Perso', color: '#E0497B', role: 'Propriétaire', members: '3 membres', mine: true },
  ];
  joined: Ws[] = [
    { name: 'Studio Lumen', color: '#2BB673', role: 'Membre', members: '8 membres', mine: false },
    { name: 'Collectif Sahel', color: '#3AA9E0', role: 'Administrateur', members: '24 membres', mine: false },
  ];
}
