import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LogoComponent } from '@shared/ui/logo/logo.component';
import { FilePreviewComponent, isPreviewableFile } from '@shared/ui/file-preview/file-preview.component';
import { PublicShareService } from '@core/services/public-share.service';
import { PublicShareFileLine, PublicShareInfo } from '@core/models/ged.models';

/**
 * Page PUBLIQUE d'un lien de partage externe (Brique 4). Hors application
 * authentifiée : aucun compte requis, le token de l'URL vaut l'accès. Trois cas
 * selon le lien : consultation d'un fichier, consultation d'un dossier, ou boîte
 * de dépôt. Le mot de passe éventuel est demandé avant tout accès.
 */
@Component({
  selector: 'app-partage-public',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LogoComponent, FilePreviewComponent],
  template: `
    <div class="page">
      <header class="top"><app-logo [markSize]="24" [fontSize]="12" /></header>

      <main class="card" [class.card--wide]="viewing()">
        @if (loading()) {
          <div class="state"><span class="spin"></span><p>Chargement du lien…</p></div>
        } @else if (!info()) {
          <div class="state">
            <span class="badge badge--err"><app-icon name="x" [size]="22" /></span>
            <h1>Lien introuvable</h1>
            <p>Ce lien de partage n'existe pas ou a été supprimé.</p>
          </div>
        } @else if (!info()!.active) {
          <div class="state">
            <span class="badge badge--warn"><app-icon name="clock" [size]="22" /></span>
            <h1>{{ inactiveTitle() }}</h1>
            <p>{{ inactiveText() }}</p>
          </div>
        } @else if (info()!.passwordRequired && !info()!.unlocked) {
          <!-- Verrouillé : demande du mot de passe -->
          <div class="state">
            <span class="badge"><app-icon name="lock" [size]="22" /></span>
            <h1>Contenu protégé</h1>
            <p>Ce lien est protégé par un mot de passe.</p>
          </div>
          <form class="pwd" (submit)="submitPassword($event)">
            <input type="password" placeholder="Mot de passe" [value]="password()" (input)="password.set($any($event.target).value)" autocomplete="off" autofocus />
            <button type="submit" class="primary" [disabled]="busy()">{{ busy() ? '…' : 'Déverrouiller' }}</button>
          </form>
          @if (error()) { <div class="err">{{ error() }}</div> }
        } @else if (viewing(); as v) {
          <!-- Prévisualisation d'un fichier (vidéo, image, PDF, archive ZIP navigable) -->
          <div class="pvhead">
            <button class="back" (click)="viewing.set(null)"><app-icon name="chevronLeft" [size]="15" />Retour</button>
            <span class="pvhead__n" [title]="v.name">{{ v.name }}</span>
          </div>
          <div class="pvbox"><app-file-preview [blob]="v.blob" [name]="v.name" /></div>
        } @else {
          <!-- Déverrouillé -->
          @let i = info()!;

          @if (i.mode === 'DROP') {
            <!-- Boîte de dépôt -->
            <div class="hd">
              <span class="badge badge--drop"><app-icon name="upload" [size]="22" /></span>
              <h1>Déposer des fichiers</h1>
              <p>Vos fichiers seront transmis en privé au propriétaire du dossier « {{ i.targetName }} ».</p>
            </div>

            <div class="field"><label>Votre nom</label><input type="text" [value]="name()" (input)="name.set($any($event.target).value)" placeholder="ex. Jean Dupont" /></div>
            <div class="field"><label>Votre email</label><input type="email" [value]="email()" (input)="email.set($any($event.target).value)" placeholder="ex. jean@exemple.com" /></div>

            <label class="dropzone">
              <app-icon name="upload" [size]="26" />
              <span class="dropzone__t">{{ picked() ? picked()!.name : 'Choisir un fichier à déposer' }}</span>
              <span class="dropzone__s">{{ constraintsLabel(i) }}</span>
              <input type="file" hidden (change)="onPick($event)" />
            </label>

            <button class="primary primary--full" [disabled]="!picked() || busy()" (click)="doUpload()">
              {{ busy() ? 'Envoi…' : 'Déposer le fichier' }}
            </button>
            @if (uploaded().length) {
              <div class="ok"><app-icon name="check" [size]="16" /> {{ uploaded().length }} fichier(s) déposé(s) : {{ uploadedNames() }}</div>
            }
            @if (error()) { <div class="err">{{ error() }}</div> }

          } @else if (i.targetType === 'FILE') {
            <!-- Consultation d'un fichier -->
            <div class="hd">
              <span class="badge"><app-icon name="file" [size]="22" /></span>
              <h1>{{ i.fileName }}</h1>
              <p>{{ sizeLabel(i.fileSize) }}{{ i.remainingAccess != null ? ' · ' + i.remainingAccess + ' téléchargement(s) restant(s)' : '' }}</p>
            </div>
            <div class="btns">
              @if (canPreview(i.fileName)) {
                <button class="ghostbtn" [disabled]="busy()" (click)="previewTarget()"><app-icon name="eye" [size]="17" />Aperçu</button>
              }
              <button class="primary primary--full" [disabled]="busy()" (click)="downloadFile()">
                <app-icon name="download" [size]="17" />{{ busy() ? 'Téléchargement…' : 'Télécharger' }}
              </button>
            </div>
            @if (error()) { <div class="err">{{ error() }}</div> }

          } @else {
            <!-- Consultation d'un dossier -->
            <div class="hd">
              <span class="badge"><app-icon name="folder" [size]="22" /></span>
              <h1>{{ i.targetName }}</h1>
              <p>{{ (i.files?.length || 0) }} fichier(s) partagé(s)</p>
            </div>
            @for (f of i.files || []; track f.id) {
              <div class="frow">
                <app-icon class="frow__i" name="file" [size]="18" />
                <span class="frow__n" [title]="f.name">{{ f.name }}</span>
                <span class="frow__s">{{ sizeLabel(f.fileSize) }}</span>
                @if (canPreview(f.name)) {
                  <button class="ic" title="Aperçu" [disabled]="busy()" (click)="previewFolderFile(f)"><app-icon name="eye" [size]="16" /></button>
                }
                <button class="ic" title="Télécharger" [disabled]="busy()" (click)="downloadFolderFile(f)"><app-icon name="download" [size]="16" /></button>
              </div>
            } @empty {
              <div class="muted">Ce dossier ne contient aucun fichier partageable.</div>
            }
            @if (error()) { <div class="err">{{ error() }}</div> }
          }
        }
      </main>

      <footer class="foot">Partage sécurisé NexaWork · Ne partagez ce lien qu'avec les personnes concernées.</footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { min-height: 100vh; background: var(--nx-surface, #F5F3EE); display: flex; flex-direction: column; align-items: center; padding: 22px 16px 40px; box-sizing: border-box; }
    .top { width: 100%; max-width: 560px; margin-bottom: 22px; }
    .card { width: 100%; max-width: 560px; background: #fff; border: 1px solid var(--nx-border, #E6E3DC); border-radius: 16px; box-shadow: 0 12px 40px rgba(20,15,40,.10); padding: 30px 30px 28px; transition: max-width .18s; }
    .card--wide { max-width: 880px; }
    .btns { display: flex; gap: 10px; }
    .ghostbtn { height: 42px; padding: 0 18px; border: 1px solid var(--nx-border, #E6E3DC); border-radius: 10px; background: #fff; color: var(--nx-text-700, #3a3644); font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .ghostbtn:hover { background: var(--nx-surface-2, #F0EEE8); }
    .ghostbtn:disabled { opacity: .5; cursor: not-allowed; }
    .pvhead { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .pvhead__n { flex: 1; min-width: 0; font-size: 14px; font-weight: 700; color: var(--nx-text, #211d2b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .back { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border: 1px solid var(--nx-border, #E6E3DC); border-radius: 8px; background: #fff; color: var(--nx-text-700, #3a3644); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .back:hover { background: var(--nx-surface-2, #F0EEE8); }
    .pvbox { display: flex; height: 64vh; min-height: 0; }
    .state { text-align: center; padding: 8px 0 4px; }
    .state h1 { font-size: 19px; font-weight: 700; color: var(--nx-text, #211d2b); margin: 12px 0 6px; }
    .state p, .hd p { font-size: 13.5px; color: var(--nx-text-500, #6b6675); line-height: 1.5; margin: 0; }
    .hd { text-align: center; margin-bottom: 22px; }
    .hd h1 { font-size: 19px; font-weight: 700; color: var(--nx-text, #211d2b); margin: 12px 0 6px; word-break: break-word; }
    .badge { width: 52px; height: 52px; border-radius: 14px; background: rgba(91,95,233,.10); color: var(--nx-indigo, #5b5fe9); display: inline-flex; align-items: center; justify-content: center; }
    .badge--err { background: #FDECEB; color: var(--nx-danger, #e0554d); }
    .badge--warn { background: #FBF1E2; color: var(--nx-warning, #c98a2c); }
    .badge--drop { background: #FEEEDC; color: #C2410C; }
    .field { margin-bottom: 14px; }
    .field label { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: var(--nx-text-400, #8b8794); margin-bottom: 6px; }
    .field input, .pwd input { width: 100%; box-sizing: border-box; height: 42px; padding: 0 13px; border-radius: 10px; border: 1px solid #DDD9D1; font-family: inherit; font-size: 14px; color: var(--nx-text); outline: none; background: #fff; }
    .field input:focus, .pwd input:focus { border-color: var(--nx-indigo); box-shadow: 0 0 0 3px rgba(91,95,233,.14); }
    .dropzone { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 26px; border-radius: 12px; border: 2px dashed #D9D6CE; background: var(--nx-surface-3, #FAF9F6); color: var(--nx-text-500); cursor: pointer; margin-bottom: 16px; text-align: center; }
    .dropzone app-icon { color: var(--nx-text-300); }
    .dropzone__t { font-size: 13.5px; font-weight: 600; color: var(--nx-text-700); word-break: break-word; }
    .dropzone__s { font-size: 12px; }
    .pwd { display: flex; gap: 8px; margin-top: 16px; }
    .pwd input { flex: 1; }
    .primary { height: 42px; padding: 0 18px; border: none; border-radius: 10px; background: var(--nx-indigo, #5b5fe9); color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .primary:disabled { background: #cfccc4; cursor: not-allowed; }
    .primary--full { width: 100%; }
    .frow { display: flex; align-items: center; gap: 11px; padding: 11px 12px; border: 1px solid #ECEAE4; border-radius: 10px; margin-bottom: 8px; }
    .frow__i { color: var(--nx-text-400); flex: none; }
    .frow__n { flex: 1; min-width: 0; font-size: 13.5px; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .frow__s { flex: none; font-size: 12px; color: var(--nx-text-400); }
    .ic { width: 34px; height: 34px; flex: none; border: 1px solid #E2DFD8; border-radius: 9px; background: #fff; color: var(--nx-indigo); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .ic:hover { background: rgba(91,95,233,.08); }
    .ic:disabled { opacity: .5; cursor: not-allowed; }
    .ok { margin-top: 14px; display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--nx-success, #2b9d6a); background: rgba(43,182,115,.10); border-radius: 9px; padding: 9px 12px; }
    .ok app-icon { flex: none; }
    .muted { text-align: center; color: var(--nx-text-400); font-size: 13px; padding: 12px 0; }
    .err { margin-top: 12px; font-size: 13px; color: var(--nx-danger, #e0554d); text-align: center; }
    .foot { max-width: 560px; margin-top: 20px; font-size: 12px; color: var(--nx-text-400, #8b8794); text-align: center; }
    .spin { width: 26px; height: 26px; border-radius: 50%; border: 3px solid var(--nx-border, #E6E3DC); border-top-color: var(--nx-indigo, #5b5fe9); animation: sp .6s linear infinite; display: inline-block; }
    @keyframes sp { to { transform: rotate(360deg); } }
  `],
})
export class PartagePublicComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(PublicShareService);

  private token = '';
  loading = signal(true);
  info = signal<PublicShareInfo | null>(null);
  password = signal('');
  busy = signal(false);
  error = signal('');

  // Dépôt (DROP)
  name = signal('');
  email = signal('');
  picked = signal<File | null>(null);
  uploaded = signal<PublicShareFileLine[]>([]);

  // Prévisualisation en ligne (vidéo, image, PDF, archive ZIP navigable)
  viewing = signal<{ name: string; blob: Blob } | null>(null);

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.load();
  }

  private load(): void {
    this.api.resolve(this.token).subscribe({
      next: info => { this.info.set(info); this.loading.set(false); },
      error: () => { this.info.set(null); this.loading.set(false); },
    });
  }

  submitPassword(ev: Event): void {
    ev.preventDefault();
    if (!this.password().trim()) return;
    this.error.set('');
    this.busy.set(true);
    this.api.resolve(this.token, this.password()).subscribe({
      next: info => {
        this.busy.set(false);
        this.info.set(info);
        if (info.passwordRequired && !info.unlocked) this.error.set('Mot de passe incorrect.');
      },
      error: () => { this.busy.set(false); this.error.set('Mot de passe incorrect.'); },
    });
  }

  downloadFile(): void {
    this.error.set('');
    this.busy.set(true);
    this.api.downloadTarget(this.token, this.password() || undefined).subscribe({
      next: blob => { this.busy.set(false); this.save(blob, this.info()?.fileName ?? 'fichier'); this.refreshCounts(); },
      error: () => { this.busy.set(false); this.error.set('Téléchargement impossible. Le lien a peut-être expiré.'); },
    });
  }

  downloadFolderFile(f: PublicShareFileLine): void {
    this.error.set('');
    this.busy.set(true);
    this.api.downloadFolderFile(this.token, f.id, this.password() || undefined).subscribe({
      next: blob => { this.busy.set(false); this.save(blob, f.name); this.refreshCounts(); },
      error: () => { this.busy.set(false); this.error.set('Téléchargement impossible. Le lien a peut-être expiré.'); },
    });
  }

  /** Extensions affichables en ligne (source unique : FilePreviewComponent). */
  canPreview(name?: string): boolean { return isPreviewableFile(name); }

  previewTarget(): void {
    this.error.set('');
    this.busy.set(true);
    this.api.downloadTarget(this.token, this.password() || undefined).subscribe({
      next: blob => { this.busy.set(false); this.viewing.set({ name: this.info()?.fileName ?? 'fichier', blob }); this.refreshCounts(); },
      error: () => { this.busy.set(false); this.error.set('Aperçu impossible. Le lien a peut-être expiré.'); },
    });
  }

  previewFolderFile(f: PublicShareFileLine): void {
    this.error.set('');
    this.busy.set(true);
    this.api.downloadFolderFile(this.token, f.id, this.password() || undefined).subscribe({
      next: blob => { this.busy.set(false); this.viewing.set({ name: f.name, blob }); this.refreshCounts(); },
      error: () => { this.busy.set(false); this.error.set('Aperçu impossible. Le lien a peut-être expiré.'); },
    });
  }

  onPick(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.picked.set(input.files?.[0] ?? null);
    this.error.set('');
  }

  doUpload(): void {
    const file = this.picked();
    if (!file) return;
    this.error.set('');
    this.busy.set(true);
    this.api.upload(this.token, file, this.name().trim(), this.email().trim(), this.password() || undefined).subscribe({
      next: line => {
        this.busy.set(false);
        this.uploaded.update(l => [...l, line]);
        this.picked.set(null);
        this.refreshCounts();
      },
      error: () => { this.busy.set(false); this.error.set('Le dépôt a échoué (type de fichier ou taille non autorisés, ou lien expiré).'); },
    });
  }

  /** Recharge l'état (accès restants, expiration éventuelle) après une action. */
  private refreshCounts(): void {
    this.api.resolve(this.token, this.password() || undefined).subscribe({
      next: info => this.info.set(info), error: () => {},
    });
  }

  inactiveTitle(): string {
    switch (this.info()?.reason) {
      case 'REVOKED': return 'Lien révoqué';
      case 'EXHAUSTED': return "Nombre d'accès atteint";
      default: return 'Lien expiré';
    }
  }

  inactiveText(): string {
    switch (this.info()?.reason) {
      case 'REVOKED': return "Le propriétaire a désactivé ce lien de partage.";
      case 'EXHAUSTED': return "Ce lien a atteint son nombre maximal d'accès.";
      default: return "La date de validité de ce lien est dépassée.";
    }
  }

  constraintsLabel(i: PublicShareInfo): string {
    const bits: string[] = [];
    const mb = i.maxUploadBytes ? Math.round(i.maxUploadBytes / (1024 * 1024)) : 25;
    bits.push('max ' + mb + ' Mo');
    if (i.allowedExtensions) bits.push('types : ' + i.allowedExtensions);
    return bits.join(' · ');
  }

  uploadedNames(): string { return this.uploaded().map(u => u.name).join(', '); }

  sizeLabel(bytes?: number): string {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  private save(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
