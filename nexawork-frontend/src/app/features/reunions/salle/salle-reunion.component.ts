import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MeetingsService } from '@core/services/meetings.service';
import { MeetingChatService } from '@core/services/meeting-chat.service';
import { SessionService } from '@core/services/session.service';
import { ToastService } from '@core/services/toast.service';
import { CallRoom } from '@core/models/meeting.models';
import { JitsiApi, openJitsiRoom } from '@core/util/jitsi.util';
import { CreerReunionComponent } from '@features/reunions/modals/creer-reunion/creer-reunion.component';

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
  imports: [IconComponent, CreerReunionComponent],
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
      <!-- Aucun bouton NexaWork par-dessus l'iframe : il recouvrait la liste des
           participants de Jitsi. On s'en remet au « raccrocher » natif — quitter la
           salle suffit, l'appel se clôt tout seul au départ du DERNIER participant
           (leave() côté serveur, CallSweeper en filet). Le modérateur peut donc
           partir et revenir sans terminer la réunion pour les autres. -->
      <div #stage class="stage" [class.stage--ready]="!loading() && !error()"></div>
    </div>

    <!-- Invitation en cours de réunion : ouverte par le bouton « Inviter » de Jitsi,
         dont l'action native est supprimée (elle ignore nos membres et nos emails). -->
    @if (inviteOpen()) {
      <app-creer-reunion mode="invite" [busy]="inviting()"
                         (created)="onInvite($event)" (closed)="inviteOpen.set(false)" />
    }
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .room { position: relative; height: 100%; background: #12101a; }
    .stage { position: absolute; inset: 0; opacity: 0; transition: opacity .3s; }
    .stage--ready { opacity: 1; }
    .state { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #E9E7F2; text-align: center; padding: 24px; }
    .state p { margin: 0; font-size: 14px; max-width: 420px; line-height: 1.5; }
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
  private session = inject(SessionService);
  private toast = inject(ToastService);

  loading = signal(true);
  error = signal<string | null>(null);
  /** Le créateur de l'appel est modérateur (il arme le lobby, il peut inviter). */
  isHost = signal(false);
  inviteOpen = signal(false);
  inviting = signal(false);

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
    const host = !!room.hostUserId && room.hostUserId === this.session.user()?.id;
    this.isHost.set(host);
    const me = this.session.user();
    try {
      this.api = await openJitsiRoom(
        this.stage.nativeElement, room.jitsiUrl, room.jwt,
        // L'utilisateur est déjà authentifié : son nom est transmis, il ne le
        // ressaisit pas.
        { displayName: me?.displayName, email: me?.email },
        message => this.fail(message),
        {
          // Seul le modérateur arme la salle d'attente. Elle ne concerne QUE les
          // invités externes : les membres conviés portent `lobby_bypass` et la
          // traversent sans rien demander (§14.5).
          enableLobby: host,
          // Le bouton « Inviter » de Jitsi ouvre NOTRE modal (membres du workspace
          // + emails externes) : l'invitation reste gérée par NexaWork.
          onInviteClicked: () => this.inviteOpen.set(true),
        },
      );
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
    // M5 — trace des fichiers partagés (le binaire reste hébergé par JaaS).
    this.api.addListener('fileUploaded', (p: unknown) => this.chat.captureFile(this.callId, p));
  }

  /**
   * Convie de nouveaux participants à la réunion EN COURS : membres du workspace
   * (notifiés → modal d'appel entrant) et invités externes (lien à usage unique
   * envoyé par email). Les deux appels sont indépendants — l'échec de l'un ne doit
   * pas annuler l'autre.
   */
  onInvite(sel: { memberIds: string[]; emails: string[] }): void {
    if (this.inviting()) return;
    this.inviting.set(true);

    const calls: Observable<unknown>[] = [];
    if (sel.memberIds.length) {
      calls.push(this.meetings.inviteParticipants(this.callId, sel.memberIds));
    }
    for (const email of sel.emails) {
      // Le nom affiché de l'invité n'est pas connu ici : la partie locale de son
      // adresse en tient lieu (il pourra le corriger dans la salle).
      calls.push(this.meetings.inviteGuest(this.callId, email, email.split('@')[0]));
    }
    if (!calls.length) { this.inviting.set(false); this.inviteOpen.set(false); return; }

    forkJoin(calls).subscribe({
      next: () => {
        this.inviting.set(false);
        this.inviteOpen.set(false);
        const n = sel.memberIds.length + sel.emails.length;
        this.toast.show({ message: n > 1 ? n + ' invitations envoyées' : 'Invitation envoyée' });
      },
      error: () => {
        this.inviting.set(false);
        this.toast.show({ message: "L'invitation n'a pas pu être envoyée.", icon: 'warning' });
      },
    });
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
