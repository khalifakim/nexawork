import { ChangeDetectionStrategy, Component, EventEmitter, Output, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-creer-projet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent],
  template: `
    <app-modal-shell title="Créer un nouveau projet" subtitle="Définissez les informations, l'équipe et le planning de votre projet."
                     [width]="564" (closed)="closed.emit()">
      <label class="lbl">Nom du projet</label>
      <div class="namein">
        <span class="namein__ic" [style.background]="color()"><app-icon name="projects" [size]="17" /></span>
        <input autofocus placeholder="Ex. Refonte App Mobile" [value]="name()" (input)="name.set($any($event.target).value)" />
      </div>

      <label class="lbl">Couleur du projet</label>
      <div class="sw">
        @for (c of colors; track c) {
          <button class="swatch" [style.background]="c" [class.swatch--on]="color()===c" (click)="color.set(c)">
            @if (color()===c) { <app-icon name="check" [size]="15" /> }
          </button>
        }
      </div>

      <div class="section">Équipe</div>
      <label class="lbl">Membres <span class="opt">Optionnel</span></label>
      <div class="field"><app-icon name="search" [size]="16" /><span>Rechercher et ajouter des membres…</span></div>
      <label class="lbl" style="margin-top:16px">Chef de projet <span class="opt">Optionnel</span></label>
      <div class="field"><app-icon name="user" [size]="16" /><span>Désigner un chef de projet…</span></div>

      <div class="section">Planning</div>
      <div class="dates">
        <div><label class="lbl">Date de début <span class="opt">Optionnel</span></label><div class="field"><app-icon name="calendar" [size]="16" /><input type="date" /></div></div>
        <div><label class="lbl">Date de fin <span class="opt">Optionnel</span></label><div class="field"><app-icon name="calendar" [size]="16" /><input type="date" /></div></div>
      </div>

      <div footer>
        <div class="hint"><app-icon name="info" [size]="14" /><span>Le nom du projet est requis</span></div>
        <button class="ghost" (click)="closed.emit()">Annuler</button>
        <button class="primary" [disabled]="!name().trim()" (click)="create()"><app-icon name="plus" [size]="16" />Créer le projet</button>
      </div>
    </app-modal-shell>
  `,
  styleUrl: './creer-projet.component.scss',
})
export class CreerProjetComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<string>();
  name = signal('');
  color = signal('#5B5FE9');
  colors = ['#5B5FE9', '#6C70F0', '#3AA9E0', '#2BB673', '#E89A2C', '#F2693C', '#E0497B', '#9B59B6'];
  create(): void { const n = this.name().trim(); if (n) this.created.emit(n); }
}
