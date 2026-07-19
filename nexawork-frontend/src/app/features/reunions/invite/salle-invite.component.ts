import {
  ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, inject, signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MeetingsService } from '@core/services/meetings.service';
import { MeetingChatService, MeetingFileResponse } from '@core/services/meeting-chat.service';
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
  imports: [IconComponent],
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

      <!-- Fichiers partagés — l'invité voit et fait EXACTEMENT comme un membre.
           Il n'a pas de JWT : son token d'invitation l'authentifie, et le Meeting
           Service relaie les octets vers/depuis le File Service (→ MinIO). -->
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
export class SalleInviteComponent implements OnDestroy {
  @ViewChild('stage', { static: true }) private stage!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private meetings = inject(MeetingsService);
  private chat = inject(MeetingChatService);

  loading = signal(true);
  error = signal<string | null>(null);
  panelOpen = signal(false);
  sharing = signal(false);
  files = signal<MeetingFileResponse[]>([]);

  private api?: JitsiApi;
  private token = '';
  /** Le Meeting Service n'a pas de WebSocket : sans sondage, l'invité ne verrait
   *  jamais un fichier partagé par quelqu'un d'autre. */
  private filesPoll?: ReturnType<typeof setInterval>;

  constructor() {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) { this.fail('Lien d\'invitation invalide.'); return; }
    this.token = token;
    this.meetings.guestAccess(token).subscribe({
      next: access => this.open(access),
      error: () => this.fail("Ce lien n'est plus valide, ou la réunion est terminée."),
    });
  }

  private async open(access: GuestAccess): Promise<void> {
    try {
      // L'invité externe n'a pas de compte : son nom vient du lien d'invitation.
      // Il reste soumis à la salle d'attente (JWT sans `lobby_bypass`) — le
      // modérateur l'admet.
      this.api = await openJitsiRoom(
        this.stage.nativeElement, access.jitsiUrl, access.jwt,
        { displayName: access.displayName },
        message => this.fail(message),
      );
      this.loading.set(false);
      this.api.addListener('readyToClose', () => { this.api?.dispose(); window.close(); });

      this.refreshFiles();
      this.filesPoll = setInterval(() => this.refreshFiles(), 6000);
    } catch {
      this.fail("Le service de visioconférence n'a pas pu être chargé.");
    }
  }

  ngOnDestroy(): void { clearInterval(this.filesPoll); }

  togglePanel(): void {
    const open = !this.panelOpen();
    this.panelOpen.set(open);
    if (open) this.refreshFiles();
  }

  onFilePicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.sharing()) return;

    this.sharing.set(true);
    this.chat.guestShareFile(this.token, file).subscribe({
      next: shared => {
        this.sharing.set(false);
        this.panelOpen.set(true);
        this.refreshFiles();
        try {
          this.api?.executeCommand('sendChatMessage', 'a partagé un fichier : ' + shared.fileName);
        } catch { /* le partage est enregistré : l'annonce n'est qu'un confort */ }
      },
      error: () => this.sharing.set(false),
    });
  }

  /** Le téléchargement passe par le Meeting Service (l'invité n'a pas de JWT). */
  download(f: MeetingFileResponse): void {
    this.chat.guestDownload(this.token, f.id).subscribe(blob => {
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

  private refreshFiles(): void {
    this.chat.guestFiles(this.token).subscribe({
      next: list => this.files.set(list),
      error: () => { /* réseau : le prochain cycle réessaiera */ },
    });
  }

  private fail(message: string): void {
    this.error.set(message);
    this.loading.set(false);
  }
}
