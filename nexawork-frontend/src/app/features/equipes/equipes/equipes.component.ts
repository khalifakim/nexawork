import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface Team { id: string; name: string; members: number; color: string; people: string[]; }
interface Loose { name: string; email: string; role: string; color: string; }

@Component({
  selector: 'app-equipes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <div class="phead">
        <span class="pdot"><app-icon name="projects" [size]="14" /></span>
        <div><div class="pn">Refonte App Mobile</div><div class="pc">8 membres · 3 équipes</div></div>
      </div>

      <div class="toolbar">
        <div class="search"><app-icon name="search" [size]="16" /><span>Rechercher une équipe ou un membre…</span></div>
        <span class="spacer"></span>
        @if (!readonly) {
          <button class="chef"><app-icon name="user" [size]="17" /><span class="chef__t">Aucun chef de projet</span><span class="chef__a">Assigner</span></button>
          <button class="add" title="Ajouter"><app-icon name="plus" [size]="18" /></button>
        }
      </div>

      <div class="cards">
        @for (t of teams; track t.id) {
          <div class="card" (click)="open(t.id)">
            <div class="card__top">
              <span class="card__ic" [style.background]="t.color"><app-icon name="teams" [size]="19" /></span>
              <div class="card__m"><div class="card__n">{{ t.name }}</div><div class="card__s">{{ t.members }} membres</div></div>
              @if (!readonly) { <button class="dots" (click)="$event.stopPropagation()"><app-icon name="dots" [size]="16" /></button> }
            </div>
            <div class="avs">
              @for (p of t.people; track $index; let i = $index) {
                <span class="av" [style.background]="palette[i % palette.length]" [style.margin-left.px]="i ? -8 : 0">{{ p }}</span>
              }
            </div>
          </div>
        }
      </div>

      <div class="loose-h">Membres du projet sans équipe</div>
      <div class="loose">
        @for (m of loose; track m.email; let i = $index) {
          <div class="lrow" [class.lrow--first]="i===0">
            <span class="lav" [style.background]="m.color">{{ ini(m.name) }}</span>
            <div class="b"><div class="ln">{{ m.name }}</div><div class="le">{{ m.email }} · {{ m.role }}</div></div>
            @if (!readonly) { <button class="assign">Assigner à une équipe</button> }
            @if (!readonly) { <button class="rm" title="Retirer du projet"><app-icon name="x" [size]="15" /></button> }
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './equipes.component.scss',
})
export class EquipesComponent {
  @Input() readonly = false;
  private router = inject(Router);
  palette = ['#F2693C', '#6C70F0', '#2BB673', '#E0497B', '#3AA9E0'];
  teams: Team[] = [
    { id: 'design-produit', name: 'Design produit', members: 3, color: '#6C70F0', people: ['SD', 'AN', 'YS'] },
    { id: 'developpement', name: 'Développement', members: 4, color: '#2BB673', people: ['MB', 'AK', 'FT', 'YS'] },
    { id: 'qa-tests', name: 'QA & Tests', members: 2, color: '#E89A2C', people: ['AN', 'MB'] },
  ];
  loose: Loose[] = [
    { name: 'Khadija Fall', email: 'khadija.fall@nexa.io', role: 'Designer', color: '#E0497B' },
    { name: 'Omar Cissé', email: 'omar.cisse@nexa.io', role: 'Développeur', color: '#3AA9E0' },
  ];
  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }
  open(id: string): void { this.router.navigate(['/app/equipes', id]); }
}
