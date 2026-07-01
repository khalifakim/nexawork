import { ChangeDetectionStrategy, Component, EventEmitter, Output, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-nouveau-dossier',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent],
  template: `
    <app-modal-shell title="Nouveau dossier" subtitle="Créez un dossier dans l'espace courant." [width]="520" (closed)="closed.emit()">
      <label class="lbl">Nom du dossier</label>
      <input class="in" autofocus placeholder="ex. Livrables client" [value]="name()" (input)="name.set($any($event.target).value)" />
      <div class="ro" [class.ro--on]="restrict()">
        <span class="ro__ic"><app-icon name="lock" [size]="16" /></span>
        <div class="ro__t"><div class="ro__title">Restreindre l'accès</div><div class="ro__d">{{ restrict() ? 'Exception activée — réglez la visibilité.' : 'Par défaut, visible par tous les membres de votre espace.' }}</div></div>
        <button class="sw" [class.sw--on]="restrict()" (click)="restrict.set(!restrict())"><span class="knob"></span></button>
      </div>
      <div footer>
        <button class="ghost" (click)="closed.emit()">Annuler</button>
        <button class="primary" [disabled]="!name().trim()" (click)="create()">Créer le dossier</button>
      </div>
    </app-modal-shell>
  `,
  styleUrl: '../_ged-modal.shared.scss',
})
export class NouveauDossierComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<string>();
  name = signal('');
  restrict = signal(false);
  create(): void { const n = this.name().trim(); if (n) this.created.emit(n); }
}
