import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MeetingsService } from '@core/services/meetings.service';
import { MeetingChatService, MeetingFileResponse } from '@core/services/meeting-chat.service';
import { FilesHttpService } from '@core/http/files.http.service';
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

      <!-- Partage de fichiers NexaWork (M5). Celui de JaaS est désactivé : il
           téléverse chez 8x8 et ne nous rend jamais le binaire — le fichier ne
           pourrait ni entrer dans MinIO, ni être retéléchargé après la réunion.
           Ici : File Service → MinIO, et le fichier reste dans l'historique.
           Placé en BAS À GAUCHE, hors de la liste des participants (à droite). -->
      @if (!loading() && !error()) {
        <input #fileInput type="file" hidden (change)="onFilePicked($event)" />

        <div class="files">
          <button class="files__tab" [class.files__tab--on]="panelOpen()" (click)="togglePanel()"
                  title="Fichiers partagés pendant la réunion">
            <app-icon name="paperclip" [size]="17" />
            Fichiers
            @if (files().length) { <span class="files__n">{{ files().length }}</span> }
          </button>

          @if (panelOpen()) {
            <div class="panel">
              <div class="panel__hd">
                <span>Fichiers partagés</span>
                <button class="panel__x" (click)="panelOpen.set(false)"><app-icon name="x" [size]="15" /></button>
              </div>

              <div class="panel__list">
                @for (f of files(); track f.id) {
                  <button class="fitem" (click)="download(f)" [title]="'Télécharger ' + f.fileName">
                    <span class="fitem__ic"><app-icon name="file" [size]="16" /></span>
                    <span class="fitem__tx">
                      <span class="fitem__n">{{ f.fileName }}</span>
                      <!-- Qui a partagé, et quand : l'information demandée. -->
                      <span class="fitem__m">{{ f.sharedByName }} · {{ size(f.fileSize) }}</span>
                    </span>
                    <span class="fitem__dl"><app-icon name="download" [size]="15" /></span>
                  </button>
                } @empty {
                  <div class="panel__empty">Aucun fichier partagé pour l'instant.</div>
                }
              </div>

              <button class="panel__add" [disabled]="sharing()" (click)="fileInput.click()">
                @if (sharing()) { <span class="spin spin--s"></span>Envoi… }
                @else { <app-icon name="upload" [size]="16" />Partager un fichier }
              </button>
            </div>
          }
        </div>
      }
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
    /* Fichiers partagés — en bas à GAUCHE, hors de la liste des participants (à droite). */
    .files { position: absolute; z-index: 3; left: 14px; bottom: 88px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .files__tab { display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px; border: none; border-radius: 999px; background: rgba(28,25,40,.82); color: #fff; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; backdrop-filter: blur(6px); box-shadow: 0 4px 14px rgba(0,0,0,.3); }
    .files__tab:hover, .files__tab--on { background: rgba(91,95,233,.92); }
    .files__n { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #fff; color: #4B3FD6; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .panel { order: -1; width: 310px; max-height: 46vh; display: flex; flex-direction: column; border-radius: 14px; background: rgba(24,21,34,.94); backdrop-filter: blur(10px); box-shadow: 0 16px 44px rgba(0,0,0,.45); overflow: hidden; }
    .panel__hd { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 10px 15px; color: #fff; font-size: 13px; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,.09); }
    .panel__x { width: 24px; height: 24px; border: none; border-radius: 7px; background: transparent; color: rgba(255,255,255,.6); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .panel__x:hover { background: rgba(255,255,255,.1); color: #fff; }
    .panel__list { flex: 1; overflow-y: auto; padding: 6px; }
    .panel__empty { padding: 20px 12px; text-align: center; font-size: 12.5px; color: rgba(255,255,255,.45); }
    .fitem { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: none; border-radius: 9px; background: transparent; color: #fff; font-family: inherit; text-align: left; cursor: pointer; }
    .fitem:hover { background: rgba(255,255,255,.08); }
    .fitem__ic { width: 30px; height: 30px; flex: none; border-radius: 8px; background: rgba(108,112,240,.24); color: #A9ACFF; display: flex; align-items: center; justify-content: center; }
    .fitem__tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .fitem__n { font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fitem__m { font-size: 11px; color: rgba(255,255,255,.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fitem__dl { flex: none; color: rgba(255,255,255,.5); display: flex; }
    .panel__add { flex: none; display: flex; align-items: center; justify-content: center; gap: 8px; margin: 6px; padding: 10px; border: none; border-radius: 10px; background: #5B5FE9; color: #fff; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .panel__add:hover:not(:disabled) { background: #4B3FD6; }
    .panel__add:disabled { opacity: .6; cursor: default; }
    .spin--s { width: 15px; height: 15px; border-width: 2px; }
  `],
})
export class SalleReunionComponent implements OnDestroy {
  @ViewChild('stage', { static: true }) private stage!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private meetings = inject(MeetingsService);
  private chat = inject(MeetingChatService);
  private filesApi = inject(FilesHttpService);
  private session = inject(SessionService);
  private toast = inject(ToastService);

  loading = signal(true);
  error = signal<string | null>(null);
  /** Le créateur de l'appel est modérateur (il arme le lobby, il peut inviter). */
  isHost = signal(false);
  inviteOpen = signal(false);
  inviting = signal(false);
  sharing = signal(false);
  panelOpen = signal(false);
  /** Fichiers partagés dans l'appel — vus par TOUS les participants. */
  files = signal<MeetingFileResponse[]>([]);
  /**
   * Le Meeting Service n'a pas de WebSocket : sans sondage, un participant ne
   * verrait jamais le fichier qu'un AUTRE vient de partager (seul l'expéditeur
   * rafraîchit sa propre liste). 6 s — la salle est un contexte court.
   */
  private filesPoll?: ReturnType<typeof setInterval>;

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

    // 🔴 Fin d'appel fiable. `videoConferenceLeft` est émis par JaaS quand on quitte
    // la conférence, l'onglet **encore vivant** : on fait alors un VRAI appel HTTP
    // `leave()` (au lieu du `fetch keepalive` de la fermeture, qui n'aboutit pas
    // toujours). C'est ce qui garantit que le serveur clôt l'appel dès que le
    // DERNIER participant part — sinon il restait ACTIVE et la bannière persistait.
    this.api.addListener('videoConferenceLeft', () => this.leaveReliably());
    this.api.addListener('readyToClose', () => this.close());
    // M2 — persistance du chat de réunion.
    this.api.addListener('incomingMessage', (p: unknown) => this.chat.capture(this.callId, p, false));
    this.api.addListener('outgoingMessage', (p: unknown) => this.chat.capture(this.callId, p, true));

    // M5 — les fichiers partagés par les AUTRES doivent apparaître sans recharger.
    // 12 s (et non 6) pour ménager une machine modeste, et jamais pendant un envoi
    // en cours (l'upload sature déjà le File Service — inutile d'ajouter des GET).
    this.refreshFiles();
    this.filesPoll = setInterval(() => { if (!this.sharing()) this.refreshFiles(); }, 12000);
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

  /**
   * Partage un fichier avec les participants (M5). Le binaire part au File Service
   * (→ MinIO, bucket `documents`), puis sa référence est rattachée à l'appel : le
   * fichier reste **téléchargeable depuis l'historique**, bien après la réunion.
   *
   * Le nom est aussi annoncé dans le chat de la salle — sans quoi personne ne
   * saurait, pendant l'appel, qu'un fichier vient d'être partagé.
   */
  /** Au-delà, l'upload sature la VM (surtout sur une machine modeste) — voir point 3. */
  private static readonly MAX_FILE_MB = 25;

  onFilePicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permet de repartager le même fichier
    if (!file || this.sharing()) return;

    if (file.size > SalleReunionComponent.MAX_FILE_MB * 1024 * 1024) {
      this.toast.show({
        message: 'Fichier trop volumineux — ' + SalleReunionComponent.MAX_FILE_MB + ' Mo maximum.',
        icon: 'warning',
      });
      return;
    }

    const workspaceId = this.session.activeWorkspaceId();
    if (!workspaceId) return;

    this.sharing.set(true);
    this.chat.shareFile(this.callId, workspaceId, file).subscribe({
      next: shared => {
        this.sharing.set(false);
        this.panelOpen.set(true);
        this.refreshFiles(); // affichage immédiat, sans attendre le prochain sondage
        this.toast.show({ message: '« ' + shared.fileName + ' » partagé avec les participants' });
        try {
          // Annonce dans le chat : les autres sont prévenus tout de suite, sans
          // avoir à ouvrir le panneau.
          this.api?.executeCommand('sendChatMessage',
            'a partagé un fichier : ' + shared.fileName);
        } catch {
          /* Le partage est enregistré : l'annonce dans le chat n'est qu'un confort. */
        }
      },
      error: () => {
        this.sharing.set(false);
        this.toast.show({ message: "Le fichier n'a pas pu être partagé.", icon: 'warning' });
      },
    });
  }

  togglePanel(): void {
    const open = !this.panelOpen();
    this.panelOpen.set(open);
    if (open) this.refreshFiles();
  }

  /** Recharge la liste (un autre participant a pu partager entre-temps). */
  private refreshFiles(): void {
    this.chat.files(this.callId).subscribe({
      next: list => this.files.set(list),
      error: () => { /* réseau : le prochain cycle réessaiera */ },
    });
  }

  /**
   * Télécharge le fichier. Passage par un blob : l'URL du File Service exige le
   * jeton, qu'un `<a href>` ne porte pas (401).
   */
  download(f: MeetingFileResponse): void {
    if (!f.downloadUrl) return;
    this.filesApi.download(f.downloadUrl).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.fileName;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  size(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  /** Fermeture de l'onglet/fenêtre : on quitte l'appel, sinon il reste ACTIVE. */
  @HostListener('window:pagehide')
  onPageHide(): void { this.leave(); }

  ngOnDestroy(): void {
    clearInterval(this.filesPoll); // sinon le sondage survit à la fermeture de la salle
    this.leave();
  }

  /**
   * Départ à la FERMETURE de l'onglet (`pagehide`/`ngOnDestroy`) : une requête
   * Angular serait annulée avec le document, on part donc en `fetch keepalive`.
   * Moins fiable qu'un appel normal — d'où `leaveReliably()` sur `videoConferenceLeft`.
   */
  private leave(): void {
    if (this.left || !this.callId) return;
    this.left = true;
    this.meetings.leaveOnUnload(this.callId);
  }

  /**
   * Départ pendant que l'onglet est ENCORE vivant (l'utilisateur a raccroché dans
   * Jitsi) : appel HTTP normal, qui aboutit. Le serveur clôt l'appel si c'était le
   * dernier participant. Le flag `left` empêche le `readyToClose` suivant de
   * renvoyer un second `leave`.
   */
  private leaveReliably(): void {
    if (this.left || !this.callId) return;
    this.left = true;
    this.meetings.leave(this.callId).subscribe({ error: () => { /* filet keepalive au pagehide */ } });
  }

  close(): void {
    this.leave();
    this.api?.dispose();
    this.api = undefined;
    window.close();
    // `window.close()` ne ferme que les fenêtres ouvertes par script. Si la salle a
    // été ouverte dans l'onglet courant (popup bloqué → repli same-tab), il ne fait
    // rien : on ramène alors l'utilisateur à l'application. Dans un vrai popup, ce
    // code ne s'exécute pas (la fenêtre est déjà fermée).
    window.location.assign('/app/reunions/lancer');
  }

  private fail(message: string): void {
    this.error.set(message);
    this.loading.set(false);
  }
}
