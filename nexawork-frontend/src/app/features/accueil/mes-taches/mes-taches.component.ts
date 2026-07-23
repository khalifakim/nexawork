import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
        <h1>Mes tâches</h1>
        <p>Toutes vos tâches, tous projets confondus.</p>
      </div>

      @if (loading()) {
        <app-loader label="Chargement de vos tâches…" />
      } @else {

      <!-- ── Bandeau « Alertes » : ce qui presse (personnel) ─────────────────── -->
      @if (overdue().length || dueSoon().length) {
        <div class="al">
          <div class="al__h"><app-icon name="alert" [size]="15" [stroke]="2" /><span>Alertes</span></div>
          <div class="al__chips">
            @if (overdue().length) {
              <button class="al__chip al__chip--late" [class.al__chip--on]="panel()==='late'" (click)="togglePanel('late')">
                En retard <b>{{ overdue().length }}</b>
              </button>
            }
            @if (dueSoon().length) {
              <button class="al__chip al__chip--soon" [class.al__chip--on]="panel()==='soon'" (click)="togglePanel('soon')">
                Échéances proches <b>{{ dueSoon().length }}</b>
              </button>
            }
          </div>
          @if (panel()) {
            <div class="al__list">
              @for (t of panelRows(); track t.id) {
                <button type="button" class="al__row" (click)="open(t)">
                  <span class="id nx-mono">{{ t.key }}</span>
                  <span class="al__ttl">{{ t.t }}</span>
                  <span class="al__proj">{{ t.proj }}</span>
                  <span class="al__due" [class.al__due--late]="t.urg==='overdue'">{{ t.due }}</span>
                </button>
              }
            </div>
          }
        </div>
      }

      <!-- ── Liste plate de toutes mes tâches ────────────────────────────────── -->
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
                  <span class="due" [class.due--late]="t.urg==='overdue'">{{ t.due }}</span>
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
          <div class="empty__t">Aucune tâche ne vous est assignée</div>
          <div class="empty__s">Vous êtes à jour. Profitez-en !</div>
        </div>
      }
      }
    </div>

    @if (openTask(); as card) {
      <app-fiche-tache [task]="card" (closed)="openTask.set(null)" (openTask)="onChipOpenTask($event)" />
    }
  `,
  styleUrl: './mes-taches.component.scss',
  styles: [`
    .al { border: 1px solid var(--nx-border-card); border-radius: 12px; padding: 12px 14px; margin-bottom: 18px; background: rgba(245,86,78,.035); }
    .al__h { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 800; color: var(--nx-text-700); margin-bottom: 9px; }
    .al__h app-icon { color: var(--nx-danger, #e11d48); }
    .al__chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .al__chip { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--nx-border-card); background: var(--nx-surface, #fff); font-size: 13px; font-weight: 600; cursor: pointer; color: var(--nx-text-700); }
    .al__chip b { font-weight: 800; }
    .al__chip--late b { color: var(--nx-danger, #e11d48); }
    .al__chip--soon b { color: #E89A2C; }
    .al__chip--on { border-color: var(--nx-indigo); box-shadow: 0 0 0 1px var(--nx-indigo) inset; }
    .al__list { margin-top: 10px; display: flex; flex-direction: column; gap: 2px; }
    .al__row { display: grid; grid-template-columns: 76px minmax(0,1fr) minmax(0,140px) 110px; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 8px; border: none; background: none; border-radius: 8px; cursor: pointer; font: inherit; }
    .al__row:hover { background: rgba(0,0,0,.03); }
    .al__ttl { font-size: 13.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .al__proj { font-size: 12.5px; color: var(--nx-text-500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .al__due { font-size: 12.5px; color: var(--nx-text-500); text-align: right; }
    .al__due--late { color: var(--nx-danger, #e11d48); font-weight: 600; }
    .al__row .id { font-size: 12px; color: var(--nx-text-500); }
  `],
})
export class MesTachesComponent {
  private session = inject(SessionService);
  private accueil = inject(AccueilService);
  private tasksSvc = inject(TasksService);

  collapsed = signal<string[]>([]);
  showAll   = signal<string[]>([]);
  done      = signal<string[]>([]);
  openTask  = signal<TaskCard | null>(null);
  /** Panneau d'alerte ouvert (liste dépliée sous les pastilles). */
  panel = signal<'late' | 'soon' | null>(null);

  /** Tâches de l'espace actif (rechargées au switch) + état de chargement. */
  private query = workspaceQuery<Section[]>(this.session, () => this.accueil.myTasks(), []);
  sections = this.query.value;
  loading = this.query.loading;

  /** Toutes mes tâches (liste plate), et les sous-ensembles alimentant le bandeau « Alertes ». */
  private allRows = computed<Row[]>(() => this.sections().flatMap(s => s.tasks));
  overdue = computed<Row[]>(() => this.allRows().filter(t => t.urg === 'overdue'));
  dueSoon = computed<Row[]>(() => this.allRows().filter(t => t.urg === 'soon'));
  panelRows = computed<Row[]>(() =>
    this.panel() === 'late' ? this.overdue() : this.panel() === 'soon' ? this.dueSoon() : []);
  togglePanel(p: 'late' | 'soon'): void { this.panel.update(v => v === p ? null : p); }

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
