import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Indicateur de chargement réutilisable — spinner centré avec libellé optionnel.
 * Affiché pendant la récupération des données réelles (évite un écran vide qui
 * ressemblerait à une erreur).
 */
@Component({
  selector: 'app-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ldr" [style.min-height.px]="minHeight">
      <span class="ldr__spin"></span>
      @if (label) { <span class="ldr__l">{{ label }}</span> }
    </div>
  `,
  styles: [`
    .ldr { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 40px 16px; }
    .ldr__spin { width: 30px; height: 30px; border-radius: 50%; border: 3px solid var(--nx-border); border-top-color: var(--nx-indigo); animation: ldrsp .7s linear infinite; }
    .ldr__l { font-size: 13px; color: var(--nx-text-500); font-weight: 500; }
    @keyframes ldrsp { to { transform: rotate(360deg); } }
  `],
})
export class LoaderComponent {
  /** Libellé optionnel sous le spinner (ex. « Chargement des tâches… »). */
  @Input() label = '';
  /** Hauteur minimale de la zone de chargement (px). */
  @Input() minHeight = 200;
}
