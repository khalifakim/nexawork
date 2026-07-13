import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MeetingsService } from '@core/services/meetings.service';
import { MeetingChatService } from '@core/services/meeting-chat.service';
import { CallRoom } from '@core/models/meeting.models';
import { JitsiApi, openJitsiRoom } from '@core/util/jitsi.util';

/**
 * Salle de réunion (M4) — ouverte dans une **fenêtre dédiée**, au-dessus de
 * l'application qui reste utilisable en arrière-plan. Embarque l'IFrame API JaaS
 * et relie ses événements au cycle de vie de l'appel NexaWork :
 * - `readyToClose` (ou fermeture de la fenêtre) → `leave` : sans quoi l'appel
 *   reste ACTIVE et REF A refuse toute nouvelle réunion (409 ALREADY_IN_CALL) ;
 * - `incoming/outgoingMessage` → chat persistant (M2).
 */
@Component({
  selector: 'app-salle-reunion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="room">
      @if (error()) {
        <div class="state">
          <app-icon name="warning" [size]="34" />
          <p>{{ error() }}</p>
          <button (click)="close()">Fermer</button>
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
    .state p { margin: 0; font-size: 14px; max-width: 360px; }
    .state button { padding: 9px 18px; border: 1px solid #4B3FD6; border-radius: 9px; background: #5B5FE9; color: #fff; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .spin { width: 34px; height: 34px; border: 3px solid rgba(255,255,255,.2); border-top-color: #6C70F0; border-radius: 50%; animation: nxspin .8s linear infinite; }
    @keyframes nxspin { to { transform: rotate(360deg); } }
  `],
})
export class SalleReunionComponent implements OnDestroy {
  @ViewChild('stage', { static: true }) private stage!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private meetings = inject(MeetingsService);
  private chat = inject(MeetingChatService);

  loading = signal(true);
  error = signal<string | null>(null);

  private api?: JitsiApi;
  private callId = '';
  private left = false;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.fail('Réunion introuvable.'); return; }
    this.callId = id;
    // `join` marque l'entrée réelle dans l'appel et rend un JWT à jour
    // (droits + lobby_bypass).
    this.meetings.join(id).subscribe({
      next: room => this.openRoom(room),
      error: () => this.fail('Impossible de rejoindre la réunion.'),
    });
  }

  private async openRoom(room: CallRoom): Promise<void> {
    try {
      this.api = await openJitsiRoom(this.stage.nativeElement, room.jitsiUrl, room.jwt);
    } catch (e) {
      this.fail(e instanceof Error ? e.message : "Le service de visioconférence n'a pas pu être chargé.");
      return;
    }
    // L'iframe est révélée dès qu'elle est montée. Attendre `videoConferenceJoined`
    // laissait l'utilisateur sur « Connexion à la salle… » indéfiniment dès que
    // JaaS affichait quoi que ce soit (autorisation caméra, salle d'attente,
    // jeton refusé) : notre voile masquait l'écran.
    this.loading.set(false);

    this.api.addListener('readyToClose', () => this.close());
    // M2 — persistance du chat de réunion.
    this.api.addListener('incomingMessage', (p: unknown) => this.chat.capture(this.callId, p, false));
    this.api.addListener('outgoingMessage', (p: unknown) => this.chat.capture(this.callId, p, true));
  }

  /** Fermeture de l'onglet/fenêtre : on quitte l'appel, sinon il reste ACTIVE. */
  @HostListener('window:pagehide')
  onPageHide(): void { this.leave(); }

  ngOnDestroy(): void { this.leave(); }

  private leave(): void {
    if (this.left || !this.callId) return;
    this.left = true;
    this.meetings.leaveOnUnload(this.callId);
  }

  close(): void {
    this.leave();
    this.api?.dispose();
    this.api = undefined;
    window.close();
  }

  private fail(message: string): void {
    this.error.set(message);
    this.loading.set(false);
  }
}
