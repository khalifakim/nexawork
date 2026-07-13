import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MeetingsService } from '@core/services/meetings.service';
import { GuestAccess } from '@core/models/meeting.models';
import { openJitsiRoom, JitsiApi } from '@core/util/jitsi.util';

/**
 * Salle d'un **invité externe** (V5.1 §4.6) : page publique atteinte par le lien
 * reçu par email (`/guest/{token}`). L'invité n'a pas de compte — le token à
 * usage unique lui vaut un JWT JaaS non modérateur, résolu par le Meeting Service.
 */
@Component({
  selector: 'app-salle-invite',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="room">
      @if (error()) {
        <div class="state">
          <p class="state__t">Réunion inaccessible</p>
          <p>{{ error() }}</p>
        </div>
      } @else if (loading()) {
        <div class="state"><span class="spin"></span><p>Connexion à la salle…</p></div>
      }
      <div #stage class="stage" [class.stage--ready]="!loading() && !error()"></div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .room { position: relative; height: 100%; background: #12101a; }
    .stage { position: absolute; inset: 0; opacity: 0; transition: opacity .3s; }
    .stage--ready { opacity: 1; }
    .state { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #E9E7F2; text-align: center; padding: 24px; }
    .state p { margin: 0; font-size: 14px; max-width: 380px; }
    .state__t { font-size: 18px; font-weight: 700; }
    .spin { width: 34px; height: 34px; border: 3px solid rgba(255,255,255,.2); border-top-color: #6C70F0; border-radius: 50%; animation: nxspin .8s linear infinite; }
    @keyframes nxspin { to { transform: rotate(360deg); } }
  `],
})
export class SalleInviteComponent {
  @ViewChild('stage', { static: true }) private stage!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private meetings = inject(MeetingsService);

  loading = signal(true);
  error = signal<string | null>(null);
  private api?: JitsiApi;

  constructor() {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) { this.fail('Lien d\'invitation invalide.'); return; }
    this.meetings.guestAccess(token).subscribe({
      next: access => this.open(access),
      error: () => this.fail("Ce lien n'est plus valide, ou la réunion est terminée."),
    });
  }

  private async open(access: GuestAccess): Promise<void> {
    try {
      this.api = await openJitsiRoom(this.stage.nativeElement, access.jitsiUrl, access.jwt, access.displayName);
      this.loading.set(false);
      this.api.addListener('readyToClose', () => { this.api?.dispose(); window.close(); });
    } catch {
      this.fail("Le service de visioconférence n'a pas pu être chargé.");
    }
  }

  private fail(message: string): void {
    this.error.set(message);
    this.loading.set(false);
  }
}
