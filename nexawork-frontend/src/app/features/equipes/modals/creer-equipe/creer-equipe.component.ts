import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@core/services/toast.service';

export interface CreatedTeam { name: string; color: string; }

/**
 * « Créer une équipe » — adaptation du prototype `teamCreateModal`.
 * Contrairement au prototype, on retire la section « Membres » : la création
 * ne fait qu'enregistrer l'équipe. Les membres seront ajoutés depuis l'équipe
 * une fois ouverte via son propre bouton « Ajouter » (multi-sélection).
 */
@Component({
  selector: 'app-creer-equipe',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent],
  template: `
    <app-modal-shell title="Créer une équipe"
                     subtitle="Regroupez des membres du projet dans une équipe."
                     [width]="520" (closed)="closed.emit()">
      <div class="hd">
        <span class="hd__ic" [style.background]="color()"><app-icon name="teams" [size]="20" /></span>
      </div>

      <label class="lbl">Nom de l'équipe</label>
      <input class="in" autofocus placeholder="ex. Design produit"
             [value]="name()" (input)="name.set($any($event.target).value)"
             (keydown.enter)="create()" />

      <label class="lbl" style="margin-top:18px">Couleur</label>
      <div class="sw">
        @for (c of palette; track c) {
          <button type="button" class="swatch" [style.background]="c" [class.swatch--on]="color()===c" (click)="color.set(c)">
            @if (color()===c) { <app-icon name="check" [size]="15" [stroke]="2.6" /> }
          </button>
        }
      </div>

      <div footer>
        <button class="ghost" (click)="closed.emit()">Annuler</button>
        <button class="primary" [disabled]="!canCreate()" (click)="create()">
          <app-icon name="plus" [size]="16" />Créer l'équipe
        </button>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .hd { display: flex; margin-bottom: 14px; }
    .hd__ic { width: 42px; height: 42px; border-radius: 12px; color: #fff; display: flex; align-items: center; justify-content: center; transition: background .15s; }
    .lbl { display: block; font-size: 11.5px; font-weight: 600; color: var(--nx-text-400); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .05em; }
    .in { width: 100%; box-sizing: border-box; height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid #D9D6CE; font-family: inherit; font-size: 14px; color: var(--nx-text); outline: none; background: var(--nx-surface-3); }
    .in:focus { border-color: var(--nx-indigo); box-shadow: 0 0 0 3px rgba(91,95,233,.14); background: #fff; }
    .sw { display: flex; gap: 10px; flex-wrap: wrap; }
    .swatch { width: 34px; height: 34px; border-radius: 10px; border: 2px solid transparent; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .swatch--on { border-color: var(--nx-text); box-shadow: 0 0 0 2px #fff inset; }
    .swatch app-icon { color: #fff; }

    .ghost { height: 40px; padding: 0 18px; border: 1px solid var(--nx-border); border-radius: 9px; background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
    .primary { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border: none; border-radius: 9px; background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; box-shadow: var(--nx-shadow-primary); }
    .primary:disabled { background: #C9C5BD; cursor: not-allowed; box-shadow: none; }
  `],
})
export class CreerEquipeComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<CreatedTeam>();

  private toast = inject(ToastService);

  readonly palette = ['#6C70F0', '#2BB673', '#E89A2C', '#E0497B', '#3AA9E0', '#8E8AA0'];

  name = signal('');
  color = signal(this.palette[0]);
  canCreate = computed(() => !!this.name().trim());

  create(): void {
    const n = this.name().trim();
    if (!n) return;
    this.created.emit({ name: n, color: this.color() });
    this.toast.show({ message: 'Équipe « ' + n + ' » créée' });
  }
}
