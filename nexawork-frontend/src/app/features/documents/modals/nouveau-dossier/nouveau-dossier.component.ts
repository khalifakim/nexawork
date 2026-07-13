import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { GedShareOptionsComponent, GedShareValue } from '@features/documents/modals/_ged-share-options/ged-share-options.component';
import { GedOverlayBus } from '@core/services/ged-overlay.bus';
import { ME } from '@core/util/ui.util';

@Component({
  selector: 'app-nouveau-dossier',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent, GedShareOptionsComponent],
  template: `
    <app-modal-shell title="Nouveau dossier" subtitle="Créez un dossier dans l'espace courant." [width]="520" (closed)="closed.emit()">
      <label class="lbl">Nom du dossier</label>
      <input class="in" autofocus placeholder="ex. Livrables client" [value]="name()" (input)="name.set($any($event.target).value)" />
      <div class="ro" [class.ro--on]="restrict()">
        <span class="ro__ic"><app-icon name="lock" [size]="16" /></span>
        <div class="ro__t"><div class="ro__title">Restreindre l'accès</div><div class="ro__d">{{ restrict() ? 'Exception activée — réglez la visibilité ci-dessous.' : 'Par défaut, visible par tous les membres de votre espace.' }}</div></div>
        <button class="sw" [class.sw--on]="restrict()" (click)="restrict.set(!restrict())"><span class="knob"></span></button>
      </div>

      @if (restrict()) {
        <div class="opt-block">
          <app-ged-share-options [scope]="scope" (valueChange)="onShareChange($event)" />
        </div>
      }

      <div footer>
        <button class="ghost" (click)="closed.emit()">Annuler</button>
        <button class="primary" [disabled]="!name().trim()" (click)="create()">Créer le dossier</button>
      </div>
    </app-modal-shell>
  `,
  styleUrl: '../_ged-modal.shared.scss',
})
export class NouveauDossierComponent {
  /** R16 — scope propagated to the share picker (workspace vs project members). */
  @Input() scope: 'org' | 'project' = 'org';
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<{ name: string; restricted: boolean }>();

  private gedOverlay = inject(GedOverlayBus);

  name = signal('');
  restrict = signal(false);
  private shareValue: GedShareValue = { mode: 'private', grants: [] };

  onShareChange(v: GedShareValue): void { this.shareValue = v; }

  create(): void {
    const n = this.name().trim();
    if (!n) return;
    if (this.restrict()) {
      // Persist the freshly-set restriction, marking the current user as owner.
      this.gedOverlay.setRestriction(n, {
        mode: this.shareValue.mode,
        grants: this.shareValue.grants,
        owner: ME,
      });
    }
    this.created.emit({ name: n, restricted: this.restrict() });
  }
}
