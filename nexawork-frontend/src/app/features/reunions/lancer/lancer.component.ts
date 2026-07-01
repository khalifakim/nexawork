import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-lancer-reunion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <div class="ico"><app-icon name="video" [size]="40" [stroke]="1.8" /></div>
      <h1>Lancer une réunion</h1>
      <p>Démarrez un appel instantané et invitez les membres du workspace ou des participants externes.</p>
      <button class="cta"><app-icon name="plus" [size]="18" [stroke]="2" />Créer une réunion</button>
    </div>
  `,
  styles: [`
    .wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; }
    .ico { width: 88px; height: 88px; border-radius: 24px; background: linear-gradient(135deg,#6C70F0,#4B3FD6); color: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 12px 32px rgba(75,63,214,.32); }
    h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -.02em; }
    p { margin: 10px 0 28px; font-size: 15px; color: var(--nx-text-500); max-width: 420px; line-height: 1.5; }
    .cta { display: flex; align-items: center; gap: 9px; padding: 14px 26px; border: none; border-radius: 12px; background: var(--nx-indigo); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; box-shadow: var(--nx-shadow-primary); }
    .cta:hover { background: var(--nx-indigo-hover); }
  `],
})
export class LancerReunionComponent {}
