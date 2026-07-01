import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-param-general',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="set-page"><div class="set-inner">
      <h1 class="set-h1">Général</h1>
      <p class="set-desc">Informations et configuration de l'espace de travail.</p>

      <div class="set-card">
        <div class="set-row set-row--first set-row--top">
          <div class="set-rlabel"><b>Logo</b></div>
          <div class="set-rctrl" style="display:flex;align-items:center;gap:14px">
            <span class="ws">N</span>
            <button class="set-btn set-btn--ghost">Changer le logo</button>
          </div>
        </div>
        <div class="set-row set-row--top"><div class="set-rlabel"><b>Nom du workspace</b><small>Visible par tous les membres.</small></div><div class="set-rctrl"><div class="set-input">Atelier Nexa</div></div></div>
        <div class="set-row set-row--top"><div class="set-rlabel"><b>Identifiant</b><small>Lié à l'URL de l'espace, non modifiable.</small></div><div class="set-rctrl"><div class="set-input set-input--locked nx-mono">atelier-nexa</div></div></div>
        <div class="set-row"><div class="set-rlabel"></div><div class="set-rctrl"><button class="set-btn set-btn--primary">Enregistrer les modifications</button></div></div>
      </div>

      <div class="set-card set-card--danger">
        <div class="set-row set-row--first set-row--top">
          <div class="set-rlabel"><b>Supprimer le workspace</b></div>
          <div class="set-rctrl">
            <div class="muted">La suppression est définitive : tous les projets, documents, canaux et messages seront effacés pour l'ensemble des membres. Cette action est irréversible.</div>
            <button class="set-btn set-btn--danger"><app-icon name="trash" [size]="16" />Supprimer définitivement</button>
          </div>
        </div>
      </div>
    </div></div>
  `,
  styles: [`
    .ws { width: 54px; height: 54px; border-radius: 13px; background: linear-gradient(135deg,#6C70F0,#4B3FD6); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 21px; }
    .muted { font-size: 13px; color: var(--nx-text-500); line-height: 1.5; margin-bottom: 12px; max-width: 440px; }
  `],
})
export class ParamGeneralComponent {}
