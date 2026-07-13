import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ChannelsService } from '@core/services/channels.service';
import { SessionService } from '@core/services/session.service';
import { ShellBus } from '@layouts/app-shell/shell.bus';

/**
 * Page d'entrée de la section Canaux (`/app/canaux`). Charge les canaux réels du
 * workspace : ouvre le premier canal d'organisation **accessible** (REF F) ; s'il
 * n'y en a aucun, affiche un état vide.
 *
 * Remplace l'ancienne redirection statique vers `canaux/annonces` — qui déclenchait
 * un toast « canal privé » quand aucun canal d'organisation « annonces » n'existait.
 */
@Component({
  selector: 'app-canaux-index',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @switch (state()) {
      @case ('empty') {
        <div class="wrap">
          <div class="card">
            <span class="ic"><app-icon name="channels" [size]="30" /></span>
            <h1>Aucun canal pour le moment</h1>
            @if (isAdmin()) {
              <p>Créez un canal d'organisation pour discuter avec les membres de votre espace de travail.</p>
              <button class="cta" (click)="createChannel()"><app-icon name="plus" [size]="17" [stroke]="2.2" />Créer un canal</button>
            } @else {
              <p>Aucun canal d'organisation n'a encore été créé dans cet espace de travail.</p>
            }
          </div>
        </div>
      }
      @default { <div class="wrap"><div class="loading"><span class="spin"></span></div></div> }
    }
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .wrap { height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 420px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .ic { width: 68px; height: 68px; border-radius: 20px; background: rgba(91,95,233,0.10); color: var(--nx-indigo);
      display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
    h1 { font-size: 19px; font-weight: 700; color: var(--nx-text); margin: 0; }
    p { font-size: 13.5px; line-height: 1.55; color: var(--nx-text-500); margin: 2px 0 14px; }
    .cta { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border: none; border-radius: 9px;
      background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; box-shadow: var(--nx-shadow-primary); }
    .cta:hover { filter: brightness(1.04); }
    .loading { display: flex; align-items: center; justify-content: center; }
    .spin { width: 26px; height: 26px; border-radius: 50%; border: 3px solid var(--nx-border); border-top-color: var(--nx-indigo); animation: sp .7s linear infinite; }
    @keyframes sp { to { transform: rotate(360deg); } }
  `],
})
export class CanauxIndexComponent {
  private router = inject(Router);
  private channelsSvc = inject(ChannelsService);
  private session = inject(SessionService);
  private bus = inject(ShellBus);

  state = signal<'loading' | 'empty'>('loading');
  isAdmin = this.session.isAdmin;

  constructor() {
    this.channelsSvc.list().pipe(takeUntilDestroyed()).subscribe({
      next: channels => {
        // Premier canal d'organisation accessible (la liste backend ne renvoie
        // déjà que les canaux visibles — REF F).
        const first = channels.find(c => c.scope === 'org') ?? channels[0];
        if (first) {
          this.router.navigate(['/app/canaux', first.id], { replaceUrl: true });
        } else {
          this.state.set('empty');
        }
      },
      error: () => this.state.set('empty'),
    });
  }

  createChannel(): void { this.bus.openNewChannel('org'); }
}
