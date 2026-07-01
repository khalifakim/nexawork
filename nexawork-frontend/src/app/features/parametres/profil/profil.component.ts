import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';

@Component({
  selector: 'app-param-profil',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent],
  template: `
    <div class="set-page"><div class="set-inner">
      <h1 class="set-h1">Profil</h1>
      <p class="set-desc">Vos informations personnelles.</p>
      <div class="set-card">
        <div class="set-row set-row--first set-row--top">
          <div class="set-rlabel"><b>Photo de profil</b></div>
          <div class="set-rctrl" style="display:flex;align-items:center;gap:14px">
            <app-avatar name="Akim Koné" color="#F5A623" [size]="54" [online]="true" />
            <button class="set-btn set-btn--ghost">Changer la photo</button>
            <button class="set-btn set-btn--ghost">Retirer</button>
          </div>
        </div>
        <div class="set-row"><div class="set-rlabel"><b>Prénom</b></div><div class="set-rctrl"><div class="set-input">Akim</div></div></div>
        <div class="set-row"><div class="set-rlabel"><b>Nom</b></div><div class="set-rctrl"><div class="set-input">Koné</div></div></div>
        <div class="set-row set-row--top"><div class="set-rlabel"><b>Fonction</b><small>Affichée sur votre profil et dans les équipes.</small></div><div class="set-rctrl"><div class="set-input">Lead Designer</div></div></div>
        <div class="set-row"><div class="set-rlabel"></div><div class="set-rctrl"><button class="set-btn set-btn--primary">Enregistrer les modifications</button></div></div>
      </div>
    </div></div>
  `,
})
export class ParamProfilComponent {}
