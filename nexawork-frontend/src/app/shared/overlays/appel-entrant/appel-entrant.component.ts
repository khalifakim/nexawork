import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { IncomingCallService } from '@core/services/incoming-call.service';
import { ToastService } from '@core/services/toast.service';
import { openMeetingWindow } from '@core/util/meeting-window.util';
import { avatarColorFor, initials } from '@core/util/ui.util';

/**
 * Appel entrant — modal plein écran, façon Teams / WhatsApp. S'affiche dès qu'une
 * invitation `MEETING_INVITED` arrive sur la file STOMP personnelle : l'invité n'a
 * plus à repérer une pastille dans le header.
 *
 * « Décliner » ne met PAS fin à l'appel : il ferme seulement le modal. L'appel
 * continue, et la bannière « Appel en cours » du header reste disponible pour le
 * rejoindre plus tard.
 */
@Component({
  selector: 'app-appel-entrant',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (call(); as c) {
      <div class="ov">
        <div class="card">
          <span class="pulse" [style.background]="tint(c.caller)">{{ mono(c.caller) }}</span>

          <div class="who">{{ c.caller }}</div>
          <div class="what">vous invite à rejoindre</div>
          <div class="topic">{{ c.topic }}</div>

          <div class="acts">
            <button class="decline" (click)="decline()">
              <app-icon name="phoneOff" [size]="20" />
              Décliner
            </button>
            <button class="accept" (click)="accept()">
              <app-icon name="video" [size]="20" [stroke]="2" />
              Rejoindre
            </button>
          </div>

          <div class="hint">Décliner ne met pas fin à l'appel — vous pourrez le rejoindre depuis le header.</div>
        </div>
      </div>
    }
  `,
  styles: [`
    .ov { position: fixed; inset: 0; z-index: 400; background: rgba(22,19,31,.62); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 32px; }
    .card { width: 380px; max-width: 94vw; padding: 30px 26px 22px; border-radius: 20px; background: #fff; box-shadow: 0 28px 80px rgba(20,15,40,.45); text-align: center; animation: nxFadeIn .18s ease; }
    .pulse { width: 84px; height: 84px; margin: 0 auto 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 27px; font-weight: 700; animation: nxRing 1.6s ease-out infinite; }
    .who { font-size: 19px; font-weight: 700; color: var(--nx-text); }
    .what { font-size: 13px; color: var(--nx-text-500); margin-top: 3px; }
    .topic { margin-top: 10px; font-size: 15px; font-weight: 600; color: var(--nx-indigo); overflow-wrap: anywhere; }
    .acts { display: flex; gap: 12px; margin-top: 24px; }
    .acts button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 10px; border: none; border-radius: 12px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    .decline { background: rgba(245,86,78,.11); color: var(--nx-danger); }
    .decline:hover { background: rgba(245,86,78,.18); }
    .accept { background: var(--nx-indigo); color: #fff; }
    .accept:hover { filter: brightness(1.06); }
    .hint { margin-top: 14px; font-size: 11.5px; line-height: 1.45; color: var(--nx-text-500); }
    @keyframes nxRing {
      0%   { box-shadow: 0 0 0 0 rgba(91,95,233,.42); }
      70%  { box-shadow: 0 0 0 18px rgba(91,95,233,0); }
      100% { box-shadow: 0 0 0 0 rgba(91,95,233,0); }
    }
  `],
})
export class AppelEntrantComponent {
  private readonly incoming = inject(IncomingCallService);
  private readonly toast = inject(ToastService);

  readonly call = this.incoming.incoming;

  mono(name: string): string { return initials(name); }
  tint(name: string): string { return avatarColorFor(name); }

  accept(): void {
    const c = this.call();
    if (!c) return;
    const opened = openMeetingWindow(c.callId);
    this.incoming.accepted();
    if (!opened) {
      this.toast.show({
        message: 'Autorisez les fenêtres surgissantes pour rejoindre la salle.',
        icon: 'warning',
      });
    }
  }

  decline(): void { this.incoming.dismiss(); }
}
