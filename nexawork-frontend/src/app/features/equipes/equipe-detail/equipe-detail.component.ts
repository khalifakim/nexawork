import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface TeamDef { name: string; color: string; members: { n: string; role: string; c: string }[]; }

@Component({
  selector: 'app-equipe-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <button class="back" (click)="back()"><app-icon name="chevronLeft" [size]="18" [stroke]="2.2" /></button>
        <span class="dot" [style.background]="team().color"><app-icon name="teams" [size]="14" /></span>
        <div class="tx"><div class="n">{{ team().name }}</div><div class="c">{{ team().members.length }} membres · Refonte App Mobile</div></div>
        <button class="add"><app-icon name="plus" [size]="14" [stroke]="2" />Ajouter</button>
      </div>
      <div class="body">
        <div class="tbl">
          @for (m of team().members; track $index; let i = $index) {
            <div class="row" [class.row--first]="i===0">
              <span class="av" [style.background]="m.c">{{ ini(m.n) }}</span>
              <div class="b"><div class="mn">{{ m.n }}</div><div class="mr">{{ m.role }}</div></div>
              <button class="rm" title="Retirer de l'équipe"><app-icon name="x" [size]="15" /></button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './equipe-detail.component.scss',
})
export class EquipeDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private id = toSignal(this.route.paramMap.pipe(map(p => p.get('teamId') ?? 'design-produit')), { initialValue: 'design-produit' });

  private defs: Record<string, TeamDef> = {
    'design-produit': { name: 'Design produit', color: '#6C70F0', members: [
      { n: 'Sarah Diallo', role: 'Lead Design', c: '#F2693C' }, { n: 'Aïda Ndiaye', role: 'Designer UI', c: '#2BB673' }, { n: 'Yacine Sow', role: 'Designer UX', c: '#3AA9E0' },
    ] },
    'developpement': { name: 'Développement', color: '#2BB673', members: [
      { n: 'Moussa Bâ', role: 'Dev Frontend', c: '#6C70F0' }, { n: 'Akim Koné', role: 'Dev Backend', c: '#F5A623' }, { n: 'Fatou Traoré', role: 'Dev Fullstack', c: '#3AA9E0' }, { n: 'Yacine Sow', role: 'Dev Mobile', c: '#3AA9E0' },
    ] },
    'qa-tests': { name: 'QA & Tests', color: '#E89A2C', members: [
      { n: 'Aïda Ndiaye', role: 'QA Lead', c: '#2BB673' }, { n: 'Moussa Bâ', role: 'QA Engineer', c: '#6C70F0' },
    ] },
  };
  team = computed(() => this.defs[this.id()] ?? this.defs['design-produit']);
  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }
  back(): void { this.router.navigate(['/app/equipes']); }
}
