import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SessionService } from '@core/services/session.service';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-rejoindre-invitation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <span style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--nx-indigo)">Invitation</span>
    <div class="card">
      <div class="card__av">SD</div>
      <div>
        <div style="font-size:14px;color:var(--nx-text-700);line-height:1.4"><span style="color:var(--nx-text);font-weight:700">Sarah Diallo</span> vous invite à rejoindre</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:7px">
          <div class="ws">N</div>
          <span style="font-size:14.5px;font-weight:600">Atelier Nexa</span>
          <span style="font-size:12.5px;color:var(--nx-text-500)">· 12 membres</span>
        </div>
      </div>
    </div>
    <div class="role-line">
      <app-icon name="lock" [size]="15" [stroke]="2" />
      Vous rejoindrez en tant que <span class="role-badge">Membre</span>
    </div>
    <div style="display:flex;gap:12px" class="nxf-field">
      <div style="flex:1"><label class="nxf-label">Prénom</label><input class="nxf-input" placeholder="Prénom" /></div>
      <div style="flex:1"><label class="nxf-label">Nom</label><input class="nxf-input" placeholder="Nom" /></div>
    </div>
    <div class="nxf-field"><label class="nxf-label">Mot de passe</label><input class="nxf-input" type="password" placeholder="8 caractères minimum" /></div>
    <div class="nxf-field--last"><label class="nxf-label">Fonction</label><input class="nxf-input" placeholder="Designer, Développeur, Chef de produit…" /></div>
    <button class="nxf-primary" (click)="enter()">Rejoindre l'espace</button>
  `,
  styles: [`
    .card { display: flex; align-items: center; gap: 12px; margin: 14px 0 18px; padding: 16px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-card); background: #fff; }
    .card__av { width: 42px; height: 42px; flex: none; border-radius: 50%; background: linear-gradient(135deg,#F5A623,#F2693C); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
    .ws { width: 24px; height: 24px; border-radius: 7px; background: linear-gradient(135deg,#6C70F0,#4B3FD6); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
    .role-line { display: flex; align-items: center; gap: 8px; margin-bottom: 22px; font-size: 13px; color: var(--nx-text-500); }
    .role-badge { color: var(--nx-indigo-text); font-weight: 600; background: var(--nx-indigo-50); padding: 2px 9px; border-radius: var(--nx-r-pill); }
  `],
})
export class RejoindreInvitationComponent {
  private session = inject(SessionService);
  enter(): void { this.session.enterWorkspace(); }
}
