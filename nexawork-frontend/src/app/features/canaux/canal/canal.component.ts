import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, tap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CommentComposerComponent } from '@shared/ui/comment-composer/comment-composer.component';
import { MentionChipComponent, MentionChipEvent } from '@shared/ui/mention-chip/mention-chip.component';
import { HighlightComponent } from '@shared/ui/highlight/highlight.component';
import { ThreadMediaPanelComponent, SharedMediaItem } from '@shared/overlays/thread-media-panel/thread-media-panel.component';
import { ThreadMentionsPanelComponent, ThreadMention, MentionKind } from '@shared/overlays/thread-mentions-panel/thread-mentions-panel.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { ChannelsService } from '@core/services/channels.service';
import { ProjectCatalogService } from '@core/services/project-catalog.service';
import { ArchivedProjectsService } from '@core/services/archived-projects.service';
import { ChannelFile, ChannelMessage } from '@core/models/channel.models';
import { chipTabFor, RichPart } from '@core/util/mention.util';
import { downloadAttachedFile, saveBlob } from '@core/util/download.util';
import { FilesHttpService } from '@core/http/files.http.service';

interface AttachedFile { id: number; name: string; size: number; file?: File; }
type ChMsg = ChannelMessage;

@Component({
  selector: 'app-canal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent,
    CommentComposerComponent,
    MentionChipComponent,
    HighlightComponent,
    ThreadMediaPanelComponent,
    ThreadMentionsPanelComponent,
  ],
  template: `
    <div class="chat">
      <div class="ch">
        @if (kind() === 'bell') {
          <app-icon class="ch__i ch__i--bell" name="bell" [size]="20" />
        } @else {
          <span class="hash">#</span>
        }
        <span class="ch__n">{{ displayName() }}</span>
        @if (isPrivate()) {
          <span class="pill pill--priv"><app-icon name="lock" [size]="12" />Privé</span>
        }
        @if (archived()) {
          <span class="pill pill--arch"><app-icon name="lock" [size]="12" />archivé</span>
        }
        @if (readonly()) {
          <span class="ch__s">· Lecture seule · écriture réservée aux admins et chef de projet</span>
        }
        <span class="ch__sp"></span>

        @if (searchOpen()) {
          <div class="sfield">
            <app-icon name="search" [size]="14" />
            <input #sinput [value]="searchQ()" (input)="searchQ.set($any($event.target).value)"
                   (keydown.escape)="closeSearch()"
                   placeholder="Rechercher dans le canal…" />
            <button class="sfield__x" (click)="closeSearch()" title="Fermer">
              <app-icon name="x" [size]="14" />
            </button>
          </div>
        }
        <button class="hbtn" [class.hbtn--on]="searchOpen()" title="Rechercher"
                (click)="toggleSearch()">
          <app-icon name="search" [size]="17" />
        </button>
        <button class="hbtn" [class.hbtn--on]="mentionsOpen()" title="Éléments mentionnés"
                (click)="toggleMentions()">
          <app-icon name="at" [size]="17" />
        </button>
        <button class="hbtn" [class.hbtn--on]="mediaOpen()" title="Fichiers joints"
                (click)="toggleMedia()">
          <app-icon name="file" [size]="17" />
        </button>
      </div>

      <div class="body">
        <div class="msgs" #msgsEl>
          <div class="day"><div class="day__l"></div><span>Aujourd'hui</span><div class="day__l"></div></div>
          @for (m of visible(); track $index) {
            <div class="msg" [class.msg--me]="m.mine"
                 [class.msg--focus]="m.id && m.id === focusMessageId()"
                 [attr.data-mid]="m.id">
              @if (!m.mine) {
                <!-- Photo si l'annuaire en connaît une, initiales sinon. La forme
                     (carré arrondi) est celle du design : on n'y touche pas. -->
                <span class="av" [style.background]="m.authorPhotoUrl ? 'transparent' : m.color"
                      style="cursor:pointer" (click)="bus.openProfile(m.author)">
                  @if (m.authorPhotoUrl) {
                    <img class="av__i" [src]="m.authorPhotoUrl" alt="" />
                  } @else { {{ ini(m.author) }} }
                </span>
              }
              <div class="b" [class.b--me]="m.mine">
                <div class="h">
                  @if (!m.mine) {
                    <span class="n" style="cursor:pointer" (click)="bus.openProfile(m.author)">
                      <app-highlight [text]="m.author" [query]="searchQ()" />
                    </span>
                  }
                  <span class="t">{{ m.time }}</span>
                </div>
                @if (m.parts.length > 0) {
                  <div class="x">
                    @for (p of m.parts; track $index) {
                      @if (p.type === 't') {
                        <app-highlight [text]="p.val" [query]="searchQ()" />
                      } @else {
                        <app-mention-chip [tab]="chipTabFor(p.type)" [value]="p.val" (opened)="onChipOpen($event)" />
                      }
                    }
                  </div>
                }
                @if (m.files?.length) {
                  <div class="cm__files">
                    @for (f of m.files!; track f.id) {
                      <button class="cm__file" title="Télécharger" (click)="downloadFile(f)">
                        <app-icon name="file" [size]="13" />
                        <span class="cm__fn"><app-highlight [text]="f.name" [query]="searchQ()" /></span>
                        <span class="cm__fs">{{ sizeOf(f.size) }}</span>
                        <app-icon class="cm__dl" name="download" [size]="13" />
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>

        @if (mediaOpen()) {
          <app-thread-media-panel [items]="sharedMedia()" (closed)="mediaOpen.set(false)" />
        }
        @if (mentionsOpen()) {
          <app-thread-mentions-panel
            [mentions]="threadMentions()"
            (closed)="mentionsOpen.set(false)"
            (picked)="onMentionPicked($event)" />
        }
      </div>

      @if (peerTyping()) {
        <div class="typing">En train d'écrire…</div>
      }

      @if (canWrite()) {
        <div class="composer">
          <app-comment-composer
            [placeholder]="'Écrire dans #' + displayName() + '…'"
            (submitted)="onSend($event)"
            (typing)="onTyping()" />
        </div>
      } @else {
        <div class="ro"><app-icon name="lock" [size]="16" /><span>{{ archived() ? 'Projet archivé — canal en lecture seule.' : 'Canal en lecture seule — écriture réservée aux administrateurs.' }}</span></div>
      }
    </div>
  `,
  styleUrl: './canal.component.scss',
})
export class CanalComponent {
  private catalog = inject(ProjectCatalogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  bus = inject(ShellBus);

  /**
   * Optional channel id passed by a parent (e.g. `CanauxProjetComponent`) that
   * embeds this component inline. When set, it takes precedence over the route
   * `:id` param — this is how the archived-project Canaux tab opens a channel
   * under the project header without navigating away.
   */
  @Input() set channelId(v: string | null | undefined) { this._embeddedId.set(v ?? null); }
  private _embeddedId = signal<string | null>(null);
  private routeName = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? 'annonces')), { initialValue: 'annonces' });
  /**
   * ⚠️ `name()` est en réalité l'**identifiant d'URL** du canal (`annonces-e2d7cff8`
   * pour un canal de projet), pas son libellé. Tout le reste du composant s'en sert
   * comme clé (résolution, droits, envoi de message) — on ne le renomme pas pour
   * ne pas tout casser, mais **il ne doit JAMAIS être affiché** : voir `displayName`.
   */
  name = computed<string>(() => this._embeddedId() ?? this.routeName());

  private channelsSvc = inject(ChannelsService);
  private filesSvc = inject(FilesHttpService);

  private channels = toSignal(this.channelsSvc.list(), { initialValue: [] });

  /**
   * Libellé affiché — le **vrai** nom du canal, résolu depuis la liste (« annonces »),
   * jamais l'identifiant technique. Avant chargement de la liste, on retire le suffixe
   * `-xxxxxxxx` (8 hex du projet) pour ne pas laisser fuiter l'id à l'écran.
   */
  displayName = computed<string>(() => {
    const id = this.name();
    return this.channels().find(c => c.id === id)?.name ?? id.replace(/-[0-9a-f]{8}$/, '');
  });
  private archivedSvc = inject(ArchivedProjectsService);
  kind = computed<'bell' | 'hash'>(() => this.channels().find(c => c.id === this.name())?.kind ?? 'hash');
  /**
   * True when the channel belongs to an archived project (REF E). Deriving
   * this from the channel's owning project + `ArchivedProjectsService` means
   * archiving a project instantly flips its channels to read-only mode without
   * having to touch each channel.
   */
  archived = computed<boolean>(() => {
    const c = this.channels().find(x => x.id === this.name());
    if (!c || c.scope !== 'project' || !c.project) return false;
    return this.archivedSvc.isArchived(this.slugifyProject(c.project));
  });
  /** Readonly = intrinsic channel flag OR belongs to an archived project. */
  readonly = computed(() => this.channelsSvc.isReadonly(this.name()) || this.archived());
  isPrivate = computed(() => this.channelsSvc.isPrivate(this.name()));
  /**
   * Droit d'écrire : `canWrite` calculé par le backend (REF D — l'admin peut
   * écrire même dans un canal en lecture seule), sauf projet archivé (REF E).
   */
  canWrite = computed(() => this.channelsSvc.canWriteInReadonly(this.name(), false) && !this.archived());

  private slugifyProject(name: string): string {
    return name.trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  chipTabFor = chipTabFor;

  /** Message thread of the active channel (reloads when the channel changes). */
  msgs = signal<ChMsg[]>([]);

  /** Header search — open flag and query text. */
  searchOpen = signal(false);
  searchQ = signal('');
  /** Right-side panels — only one can be open at a time (mutually exclusive). */
  mediaOpen = signal(false);
  mentionsOpen = signal(false);

  /** Messages filtered by the header search query (case-insensitive). */
  visible = computed<ChMsg[]>(() => {
    const q = this.searchQ().toLowerCase().trim();
    const all = this.msgs();
    if (!q) return all;
    return all.filter(m =>
      m.author.toLowerCase().includes(q) ||
      m.parts.some(p => p.type === 't' && p.val.toLowerCase().includes(q)) ||
      (m.files ?? []).some(f => f.name.toLowerCase().includes(q)),
    );
  });

  /** Attached files from every message = shared documents / media. */
  sharedMedia = computed<SharedMediaItem[]>(() =>
    this.msgs()
      .flatMap(m => (m.files ?? []).map(f => ({
        id: `${m.time}-${f.id}`,
        name: f.name,
        size: f.size,
        meta: m.author,
      })))
      .reverse(),
  );

  /** Mentions detected in the thread — feeds the 4-tab mentions panel. */
  threadMentions = computed<ThreadMention[]>(() => {
    const out: ThreadMention[] = [];
    for (const m of this.msgs()) {
      for (const p of m.parts) {
        if (p.type === 'person')  out.push({ kind: 'person',  value: p.val });
        else if (p.type === 'task')    out.push({ kind: 'task',    value: p.val });
        else if (p.type === 'doc')     out.push({ kind: 'doc',     value: p.val });
        else if (p.type === 'channel') out.push({ kind: 'channel', value: p.val });
      }
    }
    return out;
  });

  /**
   * Message ciblé par une notification de mention (`?message=<uuid>`) : on le
   * fait défiler dans la vue et on l'encadre, pour que l'utilisateur voie
   * **exactement** où il a été mentionné.
   */
  protected focusMessageId = toSignal(
    this.route.queryParamMap.pipe(map(q => q.get('message'))),
    { initialValue: null },
  );

  @ViewChild('msgsEl') private msgsEl?: ElementRef<HTMLDivElement>;
  @ViewChild('sinput') private searchInput?: ElementRef<HTMLInputElement>;

  // ── Indicateur « en train d'écrire » (canal) — miroir des conversations ──────
  private typingRaw = signal(false);
  /** Vrai dès que quelqu'un (autre que moi) écrit dans le canal. Sans le nom (§#3). */
  peerTyping = computed(() => this.typingRaw());
  private typingTimer?: ReturnType<typeof setTimeout>;
  private lastTypingSentAt = 0;
  private stopTypingTimer?: ReturnType<typeof setTimeout>;

  /** Frappe locale → publie « je tape » (throttlé) puis « j'ai arrêté » après 3 s. */
  onTyping(): void {
    const now = Date.now();
    if (now - this.lastTypingSentAt > 2000) {
      this.lastTypingSentAt = now;
      this.channelsSvc.sendTyping(this.name(), true);
    }
    clearTimeout(this.stopTypingTimer);
    this.stopTypingTimer = setTimeout(() => {
      this.lastTypingSentAt = 0;
      this.channelsSvc.sendTyping(this.name(), false);
    }, 3000);
  }

  constructor() {
    toObservable(this.name)
      .pipe(switchMap(id => this.channelsSvc.thread(id)), takeUntilDestroyed())
      .subscribe(thread => {
        this.msgs.set(thread);
        this.searchQ.set('');
      });
    // Indicateur de saisie d'un autre membre (STOMP). Retombe seul après 4 s.
    toObservable(this.name)
      .pipe(tap(() => this.typingRaw.set(false)), switchMap(id => this.channelsSvc.typing(id)), takeUntilDestroyed())
      .subscribe(isTyping => {
        this.typingRaw.set(isTyping);
        clearTimeout(this.typingTimer);
        if (isTyping) this.typingTimer = setTimeout(() => this.typingRaw.set(false), 4000);
      });
    // Réception temps réel : on n'ajoute que les messages des autres (mon propre
    // message est déjà affiché de façon optimiste à l'envoi, évitant un doublon).
    toObservable(this.name)
      .pipe(switchMap(id => this.channelsSvc.live(id)), takeUntilDestroyed())
      .subscribe(msg => { if (!msg.mine) this.msgs.update(list => [...list, msg]); });
    // Défilement vers le message mentionné, une fois le fil peint.
    effect(() => {
      const id = this.focusMessageId();
      const painted = this.visible().length;
      if (!id || !painted) return;
      requestAnimationFrame(() => {
        const el = this.msgsEl?.nativeElement.querySelector(`[data-mid="${id}"]`);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });

    // Pin the scroll to the bottom whenever the visible thread changes
    // (open a channel, switch channel, or send a new message).
    effect(() => {
      this.visible();
      // Sauf si un message est ciblé (mention) : le ramener en bas l'effacerait.
      if (this.focusMessageId()) return;
      // Wait one frame so the newly-appended DOM node is measurable.
      requestAnimationFrame(() => this.scrollToBottom());
    });
    // Autofocus the header search field as soon as it opens.
    effect(() => {
      if (this.searchOpen()) {
        queueMicrotask(() => this.searchInput?.nativeElement.focus());
      }
    });
  }
  private scrollToBottom(): void {
    const el = this.msgsEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }

  /** Human-readable file size (Ko / Mo) — mirrors the fiche tâche formatter. */
  sizeOf(bytes: number): string {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  /**
   * Téléchargement direct d'une pièce jointe (pas l'aperçu GED). Utilise l'URL
   * réelle du File Service dès que le message est persisté ; repli sur le
   * placeholder pour un message à peine envoyé (pas encore d'URL).
   */
  downloadFile(f: ChannelFile): void {
    if (f.url) this.filesSvc.download(f.url).subscribe(blob => saveBlob(blob, f.name));
    else downloadAttachedFile(f.name, f.size);
  }

  toggleSearch(): void {
    this.searchOpen.update(v => !v);
    if (!this.searchOpen()) this.searchQ.set('');
  }
  closeSearch(): void { this.searchOpen.set(false); this.searchQ.set(''); }

  toggleMedia(): void {
    this.mentionsOpen.set(false);
    this.mediaOpen.update(v => !v);
  }
  toggleMentions(): void {
    this.mediaOpen.set(false);
    this.mentionsOpen.update(v => !v);
  }

  onSend(payload: { parts: RichPart[]; files: AttachedFile[]; text?: string }): void {
    if (!payload.parts.length && !payload.files.length) return;
    const now = new Date();
    const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const files: ChannelFile[] | undefined = payload.files.length ? payload.files.map(f => ({ id: f.id, name: f.name, size: f.size })) : undefined;
    // Affichage optimiste immédiat, puis persistance réelle (texte + fichiers).
    this.msgs.update(list => [...list, { author: 'Akim Koné', color: '#F5A623', time, parts: payload.parts, mine: true, files }]);
    const text = payload.text ?? payload.parts.map(p => p.val).join('');
    const rawFiles = payload.files.map(f => f.file).filter((f): f is File => !!f);
    // Mentions résolues en cibles réelles : sans elles, le backend ne peut
    // rattacher la mention à personne (« Mentions reçues » resterait vide).
    const mentions = this.catalog.resolveMentions(payload.parts);
    this.channelsSvc.sendMessage(this.name(), text, rawFiles, mentions).subscribe();
  }

  onChipOpen(ev: MentionChipEvent): void {
    switch (ev.type) {
      case 'person':   this.bus.openProfile(ev.name); break;
      case 'document': this.bus.openDocument(ev.name); break;
      case 'task':     this.bus.openTask(ev.id); break;
      case 'channel':  this.router.navigate(['/app/canaux', ev.slug]); break;
    }
  }

  /** A pick from the mentions side panel — routed exactly like an inline chip. */
  onMentionPicked(ev: { kind: MentionKind; value: string }): void {
    switch (ev.kind) {
      case 'person':  this.bus.openProfile(ev.value); break;
      case 'task':    this.bus.openTask(ev.value); break;
      case 'doc':     this.bus.openDocument(ev.value); break;
      case 'channel': this.router.navigate(['/app/canaux', ev.value]); break;
    }
  }
}
