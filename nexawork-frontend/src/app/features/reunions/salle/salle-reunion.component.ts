import {
  ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MeetingsService } from '@core/services/meetings.service';
import { MeetingChatService } from '@core/services/meeting-chat.service';
import { SessionService } from '@core/services/session.service';
import { CallRoom } from '@core/models/meeting.models';

/** Interface minimale de l'IFrame API JaaS (chargée dynamiquement). */
interface JitsiApi {
  addListener(event: string, handler: (payload: unknown) => void): void;
  executeCommand(command: string, ...args: unknown[]): void;
  dispose(): void;
}
declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

/**
 * Salle de réunion plein écran (M4) : embarque l'IFrame API JaaS et relie ses
 * événements au cycle de vie de l'appel NexaWork.
 * - `videoConferenceJoined` → `startCall` (pastille header active) ;
 * - `readyToClose` → `endCall` + retour à l'historique ;
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
          <button (click)="back()">Retour aux réunions</button>
        </div>
      } @else if (loading()) {
        <div class="state"><span class="spin"></span><p>Connexion à la salle…</p></div>
      }
      <div #stage class="stage" [class.stage--ready]="!loading() && !error()"></div>
    </div>
  `,
  styles: [`
    :host { display: block; flex: 1; min-height: 0; }
    .room { position: relative; height: 100%; min-height: 70vh; background: #12101a; }
    .stage { position: absolute; inset: 0; opacity: 0; transition: opacity .3s; }
    .stage--ready { opacity: 1; }
    .stage :global(iframe) { width: 100%; height: 100%; border: 0; }
    .state { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #E9E7F2; text-align: center; padding: 24px; }
    .state p { margin: 0; font-size: 14px; max-width: 360px; }
    .state button { padding: 9px 18px; border: 1px solid #4B3FD6; border-radius: 9px; background: #5B5FE9; color: #fff; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .spin { width: 34px; height: 34px; border: 3px solid rgba(255,255,255,.2); border-top-color: #6C70F0; border-radius: 50%; animation: nxspin .8s linear infinite; }
    @keyframes nxspin { to { transform: rotate(360deg); } }
  `],
})
export class SalleReunionComponent {
  @ViewChild('stage', { static: true }) private stage!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private meetings = inject(MeetingsService);
  private chat = inject(MeetingChatService);
  private session = inject(SessionService);

  loading = signal(true);
  error = signal<string | null>(null);

  private api?: JitsiApi;
  private callId = '';

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('Réunion introuvable.'); this.loading.set(false); return; }
    this.callId = id;
    // On rejoint l'appel pour obtenir un JWT à jour (droits + lobby_bypass).
    this.meetings.join(id).subscribe({
      next: room => this.openRoom(room),
      error: () => { this.error.set("Impossible de rejoindre la réunion."); this.loading.set(false); },
    });
  }

  private async openRoom(room: CallRoom): Promise<void> {
    if (!room.jitsiUrl || !room.jwt) {
      this.error.set('Salle vidéo indisponible (configuration JaaS manquante).');
      this.loading.set(false);
      return;
    }
    let domain: string, roomName: string;
    try {
      const url = new URL(room.jitsiUrl);
      domain = url.host;                       // ex. 8x8.vc
      roomName = url.pathname.replace(/^\//, ''); // {appId}/{roomName}
    } catch {
      this.error.set('URL de salle invalide.');
      this.loading.set(false);
      return;
    }

    try {
      await this.loadExternalApi(domain, roomName);
    } catch {
      this.error.set("Le service de visioconférence n'a pas pu être chargé.");
      this.loading.set(false);
      return;
    }
    if (!window.JitsiMeetExternalAPI) {
      this.error.set('IFrame API JaaS indisponible.');
      this.loading.set(false);
      return;
    }

    this.api = new window.JitsiMeetExternalAPI(domain, {
      roomName,
      jwt: room.jwt,
      parentNode: this.stage.nativeElement,
      configOverwrite: { prejoinPageEnabled: false },
    });

    this.api.addListener('videoConferenceJoined', () => {
      this.loading.set(false);
      this.session.startCall({ id: this.callId, meetingTitle: room.topic, context: 'Réunion en cours' });
    });
    this.api.addListener('readyToClose', () => this.finish());
    // M2 — persistance du chat : chaque message échangé est envoyé au backend.
    this.api.addListener('incomingMessage', (p: unknown) => this.chat.capture(this.callId, p, false));
    this.api.addListener('outgoingMessage', (p: unknown) => this.chat.capture(this.callId, p, true));
  }

  /** Charge dynamiquement le script `external_api.js` du tenant JaaS (une fois). */
  private loadExternalApi(domain: string, roomName: string): Promise<void> {
    if (window.JitsiMeetExternalAPI) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const appId = roomName.split('/')[0];
      const script = document.createElement('script');
      script.src = `https://${domain}/${appId}/external_api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('external_api load failed'));
      document.body.appendChild(script);
    });
  }

  private finish(): void {
    this.meetings.leave(this.callId).subscribe({ error: () => {} });
    this.session.endCall();
    this.api?.dispose();
    this.api = undefined;
    this.router.navigate(['/app/reunions/historique']);
  }

  back(): void { this.router.navigate(['/app/reunions/historique']); }
}
