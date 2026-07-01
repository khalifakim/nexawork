import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { FicheTacheComponent } from '@features/projets/modals/fiche-tache/fiche-tache.component';

interface Row { id: string; t: string; proj: string; prio: [string, string]; due: string; }
interface Section { cat: string; color: string; tasks: Row[]; }

const PRIO_BG: Record<string, string> = { 'Haute': '#FDECEB', 'Moyenne': '#FBF1E2', 'Basse': '#E6F6EE' };

@Component({
  selector: 'app-mes-taches',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, FicheTacheComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <h1>Aujourd'hui et en retard</h1>
        <p>Vos tâches prioritaires dont l'échéance est aujourd'hui ou déjà dépassée, tous projets confondus.</p>
      </div>

      @for (s of sections; track s.cat) {
        <div class="sec">
          <button class="sec__h" (click)="toggle(s.cat)">
            <span class="sec__cv" [style.transform]="collapsed().includes(s.cat) ? 'rotate(-90deg)' : ''"><app-icon name="chevronDown" [size]="16" /></span>
            <span class="sec__sq" [style.background]="s.color"></span>
            <span class="sec__l">{{ s.cat }}</span>
            <span class="sec__c">{{ s.tasks.length }}</span>
          </button>

          @if (!collapsed().includes(s.cat)) {
            <div class="tk">
              @for (t of visible(s); track t.id; let i = $index) {
                <div class="trow" [class.trow--first]="i===0" (click)="openTask.set(toCard(t))">
                  <button class="cb" [class.cb--on]="done().includes(t.id)"
                    (click)="toggleDone(t.id); $event.stopPropagation()">
                    @if (done().includes(t.id)) { <app-icon name="check" [size]="12" [stroke]="2.6" /> }
                  </button>
                  <span class="id nx-mono">{{ t.id }}</span>
                  <span class="ttl" [class.ttl--done]="done().includes(t.id)">{{ t.t }}</span>
                  <span class="proj">{{ t.proj }}</span>
                  <span class="prio" [style.color]="t.prio[1]">{{ t.prio[0] }}</span>
                  <span class="due" [class.due--late]="s.cat==='En retard'">{{ t.due }}</span>
                </div>
              }
            </div>
            @if (s.tasks.length > 3) {
              <button class="more" (click)="toggleAll(s.cat)">
                <span class="more__cv" [style.transform]="showAll().includes(s.cat) ? 'rotate(180deg)' : ''"><app-icon name="chevronDown" [size]="15" /></span>
                {{ showAll().includes(s.cat) ? 'Réduire' : 'Tout voir (' + s.tasks.length + ')' }}
              </button>
            }
          }
        </div>
      }
    </div>

    @if (openTask()) {
      <app-fiche-tache [task]="openTask()!" (closed)="openTask.set(null)" />
    }
  `,
  styleUrl: './mes-taches.component.scss',
})
export class MesTachesComponent {
  collapsed = signal<string[]>([]);
  showAll   = signal<string[]>([]);
  done      = signal<string[]>([]);
  openTask  = signal<any>(null);

  sections: Section[] = [
    { cat: "Aujourd'hui", color: '#5B8DEF', tasks: [
      { id: 'MOB-094', t: 'Intégration écran profil utilisateur',  proj: 'Refonte App Mobile',    prio: ['Haute',   '#F5564E'], due: "Aujourd'hui" },
      { id: 'MKT-210', t: 'Valider le brief créatif',              proj: 'Campagne Q3 Marketing', prio: ['Moyenne', '#E89A2C'], due: "Aujourd'hui" },
      { id: 'DS-014',  t: 'Revue des composants boutons',          proj: 'Design System Nexa',    prio: ['Basse',   '#2BB673'], due: "Aujourd'hui" },
      { id: 'MOB-088', t: 'Préparer la démo client',               proj: 'Refonte App Mobile',    prio: ['Haute',   '#F5564E'], due: "Aujourd'hui" },
      { id: 'WEB-061', t: 'Relire les textes de la page tarifs',   proj: 'Site Vitrine 2025',     prio: ['Basse',   '#2BB673'], due: "Aujourd'hui" },
      { id: 'DS-022',  t: 'Exporter les icônes en SVG',            proj: 'Design System Nexa',    prio: ['Moyenne', '#E89A2C'], due: "Aujourd'hui" },
    ]},
    { cat: 'En retard', color: '#F5564E', tasks: [
      { id: 'BCK-030', t: 'Migration table utilisateurs',   proj: 'Migration Backend', prio: ['Haute',   '#F5564E'], due: 'Il y a 2 j' },
      { id: 'WEB-077', t: 'Optimiser images page accueil', proj: 'Site Vitrine 2025', prio: ['Moyenne', '#E89A2C'], due: 'Hier' },
    ]},
  ];

  visible(s: Section): Row[] { return this.showAll().includes(s.cat) ? s.tasks : s.tasks.slice(0, 3); }
  toggle(c: string): void    { this.collapsed.update(l => l.includes(c) ? l.filter(x => x !== c) : [...l, c]); }
  toggleAll(c: string): void { this.showAll.update(l => l.includes(c) ? l.filter(x => x !== c) : [...l, c]); }
  toggleDone(id: string): void { this.done.update(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id]); }

  toCard(r: Row): any {
    return {
      id: r.id, title: r.t, proj: r.proj, due: r.due,
      desc: 'Tâche assignée au projet ' + r.proj + '.',
      prio: [r.prio[0], r.prio[1], PRIO_BG[r.prio[0]] ?? 'rgba(0,0,0,.06)'],
      tag: ['Feature', '#6C70F0'], prog: [0, ''], team: ['#F2693C', '#6C70F0'], links: 2, comments: 3,
    };
  }
}
