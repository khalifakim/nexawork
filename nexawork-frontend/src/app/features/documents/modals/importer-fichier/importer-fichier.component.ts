import { ChangeDetectionStrategy, Component, EventEmitter, Output, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-importer-fichier',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent],
  template: `
    <app-modal-shell title="Importer un fichier" subtitle="Ajoutez un fichier à l'espace courant." [width]="520" (closed)="closed.emit()">
      <div class="drop">
        <app-icon name="upload" [size]="30" />
        <span class="drop__t">Glissez un fichier ici ou parcourez</span>
        <span class="drop__s">PDF, images, documents — 50 Mo max.</span>
      </div>
      <label class="lbl">Nom du fichier</label>
      <input class="in" placeholder="ex. Brief client.pdf" [value]="name()" (input)="name.set($any($event.target).value)" />
      <div class="ro" [class.ro--on]="restrict()">
        <span class="ro__ic"><app-icon name="lock" [size]="16" /></span>
        <div class="ro__t"><div class="ro__title">Restreindre l'accès</div><div class="ro__d">{{ restrict() ? 'Exception activée — réglez la visibilité.' : 'Par défaut, visible par tous les membres de votre espace.' }}</div></div>
        <button class="sw" [class.sw--on]="restrict()" (click)="restrict.set(!restrict())"><span class="knob"></span></button>
      </div>
      <div footer>
        <button class="ghost" (click)="closed.emit()">Annuler</button>
        <button class="primary" (click)="imported.emit()">Importer</button>
      </div>
    </app-modal-shell>
  `,
  styleUrl: '../_ged-modal.shared.scss',
})
export class ImporterFichierComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() imported = new EventEmitter<void>();
  name = signal('');
  restrict = signal(false);
}
