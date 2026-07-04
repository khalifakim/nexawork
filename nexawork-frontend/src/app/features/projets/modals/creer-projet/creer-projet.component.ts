import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@core/services/toast.service';

/**
 * « Créer un nouveau projet » — reprend fidèlement l'ordre du prototype
 * `projectCreateModal` mais en version épurée : uniquement Nom, Couleur,
 * Planning (début / fin). Les membres et le chef sont ajoutés ensuite depuis
 * la page du projet.
 */
@Component({
  selector: 'app-creer-projet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent],
  template: `
    <app-modal-shell title="Créer un nouveau projet"
                     subtitle="Définissez les informations et le planning de votre projet."
                     [width]="564" (closed)="closed.emit()">
      <!-- Nom du projet — input avec pastille couleur en tête -->
      <label class="lbl">Nom du projet</label>
      <div class="namein">
        <span class="namein__ic" [style.background]="color()"><app-icon name="projects" [size]="17" /></span>
        <input autofocus placeholder="Ex. Refonte App Mobile"
               [value]="name()" (input)="name.set($any($event.target).value)" />
      </div>

      <!-- Couleur du projet — palette 8 -->
      <label class="lbl">Couleur du projet</label>
      <div class="sw">
        @for (c of colors; track c) {
          <button type="button" class="swatch" [style.background]="c"
                  [class.swatch--on]="color()===c" [style.--sw-c]="c" (click)="color.set(c)">
            @if (color()===c) { <app-icon name="check" [size]="15" /> }
          </button>
        }
      </div>

      <!-- Planning -->
      <div class="section"><span>Planning</span></div>
      <div class="dates">
        <div>
          <label class="lbl">Date de début <span class="opt">Optionnel</span></label>
          <div class="field">
            <app-icon name="calendar" [size]="16" />
            <input type="date" [value]="dateStart()" (input)="dateStart.set($any($event.target).value)" />
          </div>
        </div>
        <div>
          <label class="lbl">Date de fin <span class="opt">Optionnel</span></label>
          <div class="field">
            <app-icon name="calendar" [size]="16" />
            <input type="date" [value]="dateEnd()" (input)="dateEnd.set($any($event.target).value)" />
          </div>
        </div>
      </div>
      @if (dateError()) {
        <div class="err">La date de fin doit être postérieure ou égale à la date de début.</div>
      }

      <!-- Footer : chaque enfant est projeté individuellement dans le slot [footer] du
           ModalShellComponent (flex row + justify-content flex-end). La classe .hint a
           flex:1, ce qui pousse les boutons à droite comme dans le prototype (l.5135-5142). -->
      <div footer class="hint">
        <app-icon name="info" [size]="14" />
        <span>Le nom du projet est requis</span>
      </div>
      <button footer type="button" class="ghost" (click)="closed.emit()">Annuler</button>
      <button footer type="button" class="primary" [disabled]="!canCreate()" (click)="create()">
        <app-icon name="plus" [size]="16" />Créer le projet
      </button>
    </app-modal-shell>
  `,
  styleUrl: './creer-projet.component.scss',
})
export class CreerProjetComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<string>();

  private toast = inject(ToastService);

  readonly colors = ['#5B5FE9', '#6C70F0', '#3AA9E0', '#2BB673', '#E89A2C', '#F2693C', '#E0497B', '#9B59B6'];

  name = signal('');
  color = signal(this.colors[0]);
  dateStart = signal<string>('');
  dateEnd = signal<string>('');

  dateError = computed(() => {
    const a = this.dateStart(), b = this.dateEnd();
    return !!a && !!b && a > b;
  });

  canCreate = computed(() => !!this.name().trim() && !this.dateError());

  create(): void {
    const n = this.name().trim();
    if (!n) return;
    if (this.dateError()) return;
    this.toast.show({ message: 'Projet « ' + n + ' » créé' });
    this.created.emit(n);
  }
}
