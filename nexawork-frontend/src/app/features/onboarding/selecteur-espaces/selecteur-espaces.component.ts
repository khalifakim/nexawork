import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '@core/services/session.service';
import { WorkspaceLoaderService } from '@core/services/workspace-loader.service';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface WsItem { name: string; sub: string; mono: string; grad: string; }

@Component({
  selector: 'app-selecteur-espaces',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <h1 class="nxf-h1">Vos espaces de travail</h1>
    <p class="nxf-sub">Choisissez un espace à ouvrir ou créez-en un nouveau.</p>

    <div class="grp">Créés par moi</div>
    @for (w of mine; track w.name) {
      <div class="ws">
        <div class="ws__logo" [style.background]="w.grad">{{ w.mono }}</div>
        <div style="flex:1;min-width:0">
          <div class="ws__name">{{ w.name }}</div>
          <div class="ws__sub">{{ w.sub }}</div>
        </div>
        <button class="ws__open ws__open--primary" (click)="enter()">Ouvrir</button>
      </div>
    }

    <div class="grp" style="margin-top:22px">Espaces rejoints</div>
    @for (w of joined; track w.name) {
      <div class="ws">
        <div class="ws__logo" [style.background]="w.grad">{{ w.mono }}</div>
        <div style="flex:1;min-width:0">
          <div class="ws__name">{{ w.name }}</div>
          <div class="ws__sub">{{ w.sub }}</div>
        </div>
        <button class="ws__open" (click)="enter()">Ouvrir</button>
      </div>
    }

    <button class="create" routerLink="/auth/workspace/name">
      <app-icon name="plus" [size]="16" [stroke]="2" />Créer un espace de travail
    </button>
  `,
  styles: [`
    .grp { font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--nx-text-400); margin-bottom: 12px; }
    .ws { display: flex; align-items: center; gap: 13px; padding: 14px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-card); background: #fff; margin-bottom: 10px; }
    .ws__logo { width: 42px; height: 42px; flex: none; border-radius: 11px; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 700; }
    .ws__name { font-size: 14.5px; font-weight: 600; }
    .ws__sub { font-size: 12.5px; color: var(--nx-text-500); }
    .ws__open { flex: none; height: 38px; padding: 0 16px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn); background: #fff; color: var(--nx-text); font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
    .ws__open:hover { background: var(--nx-surface-2); }
    .ws__open--primary { border: none; background: var(--nx-indigo); color: #fff; }
    .ws__open--primary:hover { background: var(--nx-indigo-hover); }
    .create { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 46px; margin-top: 12px;
      border: 1.5px dashed #D4D0C7; border-radius: var(--nx-r-btn); background: transparent; color: #7A7682; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    .create:hover { border-color: var(--nx-indigo); color: var(--nx-indigo); }
  `],
})
export class SelecteurEspacesComponent {
  private session = inject(SessionService);
  private loader = inject(WorkspaceLoaderService);

  mine: WsItem[] = [{ name: 'Atelier Nexa', sub: '12 membres · Propriétaire', mono: 'N', grad: 'linear-gradient(135deg,#6C70F0,#4B3FD6)' }];
  joined: WsItem[] = [
    { name: 'Studio Marbre', sub: '8 membres · Membre', mono: 'S', grad: 'linear-gradient(135deg,#3AA9E0,#2E7BC4)' },
    { name: 'Coop Verte', sub: '5 membres · Membre', mono: 'C', grad: 'linear-gradient(135deg,#2BB673,#1E8F57)' },
  ];

  enter(): void {
    this.loader.show();
    this.session.enterWorkspace();
  }
}
