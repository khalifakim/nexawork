import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { FicheTacheComponent } from '@features/projets/modals/fiche-tache/fiche-tache.component';
import { AccueilService } from '@core/services/accueil.service';
import { SessionService } from '@core/services/session.service';
import { TasksService } from '@core/services/tasks.service';
import { MyTaskRow as Row, MyTaskSection as Section } from '@core/models/accueil.models';
import { TaskCard } from '@core/models/task.models';
import { workspaceQuery } from '@core/util/workspace-signal';
import { LoaderComponent } from '@shared/ui/loader/loader.component';

@Component({
  selector: 'app-mes-taches',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, FicheTacheComponent, LoaderComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <h1>Mes tâches prioritaires et toutes mes tâches</h1>
        <p>Vos tâches prioritaires (échéance aujourd'hui ou en retard) et, en dessous, toutes vos tâches — tous projets confondus.</p>
      </div>

      @if (loading()) {
        <app-loader label="Chargement de vos tâches…" />
      } @else {
      @for (s of sections(); track s.cat) {
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
                <div class="trow" [class.trow--first]="i===0" (click)="open(t)">
                  <button class="cb" [class.cb--on]="done().includes(t.id)"
                    (click)="toggleDone(t.id); $event.stopPropagation()">
                    @if (done().includes(t.id)) { <app-icon name="check" [size]="12" [stroke]="2.6" /> }
                  </button>
                  <span class="id nx-mono">{{ t.key }}</span>
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
      } @empty {
        <div class="empty">
          <span class="empty__ic"><app-icon name="taskCheck" [size]="26" /></span>
          <div class="empty__t">Aucune tâche ne vous a été assignée</div>
          <div class="empty__s">Vous n'avez aucune tâche à échéance aujourd'hui ou en retard. Profitez-en !</div>
        </div>
      }
      }
    </div>

    @if (openTask(); as card) {
      <app-fiche-tache [task]="card" (closed)="openTask.set(null)" (openTask)="onChipOpenTask($event)" />
    }
  `,
  styleUrl: './mes-taches.component.scss',
})
export class MesTachesComponent {
  private session = inject(SessionService);
  private accueil = inject(AccueilService);
  private tasksSvc = inject(TasksService);

  collapsed = signal<string[]>([]);
  showAll   = signal<string[]>([]);
  done      = signal<string[]>([]);
  openTask  = signal<TaskCard | null>(null);

  /** Tâches de l'espace actif (rechargées au switch) + état de chargement. */
  private query = workspaceQuery<Section[]>(this.session, () => this.accueil.myTasks(), []);
  sections = this.query.value;
  loading = this.query.loading;

  visible(s: Section): Row[] { return this.showAll().includes(s.cat) ? s.tasks : s.tasks.slice(0, 3); }
  toggle(c: string): void    { this.collapsed.update(l => l.includes(c) ? l.filter(x => x !== c) : [...l, c]); }
  toggleAll(c: string): void { this.showAll.update(l => l.includes(c) ? l.filter(x => x !== c) : [...l, c]); }
  toggleDone(id: string): void { this.done.update(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id]); }

  /**
   * Ouvre la **vraie** fiche de tâche : la ligne ne porte que de l'affichage, or
   * la fiche a besoin de la carte complète (projet, statut, dates…). Sans elle,
   * elle appelait `/projects/undefined/statuses`.
   */
  open(r: Row): void {
    this.tasksSvc.cardById(r.id).subscribe(card => { if (card) this.openTask.set(card); });
  }

  /** Mention `@@tâche` cliquée dans un commentaire de la fiche (clé lisible ou UUID). */
  onChipOpenTask(ref: string): void {
    this.tasksSvc.cardByRef(ref).subscribe(card => { if (card) this.openTask.set(card); });
  }
}
