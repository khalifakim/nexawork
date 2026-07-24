import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, tap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoaderComponent } from '@shared/ui/loader/loader.component';
import { CommentComposerComponent } from '@shared/ui/comment-composer/comment-composer.component';
import { MentionChipComponent, MentionChipEvent } from '@shared/ui/mention-chip/mention-chip.component';
import { HighlightComponent } from '@shared/ui/highlight/highlight.component';
import { ThreadMediaPanelComponent, SharedMediaItem } from '@shared/overlays/thread-media-panel/thread-media-panel.component';
import { ThreadMentionsPanelComponent, ThreadMention, MentionKind } from '@shared/overlays/thread-mentions-panel/thread-mentions-panel.component';
import { MembersService } from '@core/services/members.service';
import { ConversationsService } from '@core/services/conversations.service';
import { ProjectCatalogService } from '@core/services/project-catalog.service';
import { Member } from '@core/models/member.models';
import { ConversationFile, ConversationMessage } from '@core/models/conversation.models';
import { MessageReply, toggleLocalReaction } from '@core/models/channel.models';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { chipTabFor, parseRichText, RichPart } from '@core/util/mention.util';
import { downloadAttachedFile, saveBlob } from '@core/util/download.util';
import { FilesHttpService } from '@core/http/files.http.service';

const EMPTY_MEMBER: Member = { name: '', color: '#86828E', role: '', email: '', online: false, projects: [] };

interface AttachedFile { id: number; name: string; size: number; file?: File; }
type Msg = ConversationMessage;

@Component({
  selector: 'app-conversation-privee',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent,
    LoaderComponent,
    CommentComposerComponent,
    MentionChipComponent,
    HighlightComponent,
    ThreadMediaPanelComponent,
    ThreadMentionsPanelComponent,
  ],
  template: `
    <div class="chat">
      <div class="ch">
        <div class="ch__peer" (click)="bus.openProfile(peer().name)" style="cursor:pointer">
          <div class="av">
            @if (peer().photoUrl) {
              <img class="av__c av__c--img" [src]="peer().photoUrl" alt="" />
            } @else {
              <span class="av__c" [style.background]="peer().color">{{ ini(peer().name) }}</span>
            }
            @if (peer().online) { <span class="av__d"></span> }
          </div>
          <div>
            <div class="ch__n">{{ peer().name }}</div>
            <div class="ch__s" [style.color]="peer().online ? 'var(--nx-success)' : 'var(--nx-text-300)'">{{ peer().online ? 'En ligne' : 'Hors ligne' }}</div>
          </div>
        </div>
        <span class="ch__sp"></span>

        @if (searchOpen()) {
          <div class="sfield">
            <app-icon name="search" [size]="14" />
            <input #sinput [value]="searchQ()" (input)="searchQ.set($any($event.target).value)"
                   (keydown.escape)="closeSearch()"
                   placeholder="Rechercher dans la conversation…" />
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
          @if (loading()) {
            <app-loader label="Chargement de la conversation…" [minHeight]="160" />
          } @else {
          @for (m of visible(); track $index) {
            @if (m.day) {
              <div class="day"><div class="day__l"></div><span>{{ m.day }}</span><div class="day__l"></div></div>
            }
            @if (m.id && m.id === unreadSeparatorId()) {
              <div class="unreadsep"><span>Messages non lus</span></div>
            }
            <div class="line" [class.line--me]="m.me"
                 [class.line--focus]="m.id && m.id === focusMessageId()"
                 [attr.data-mid]="m.id">
              <div class="bubble" [class.bubble--me]="m.me">
                @if (m.id && editingId() !== m.id && !m.isDeleted) {
                  <div class="act">
                    @if (m.me && canModify(m)) {
                      <div class="mm">
                        <button class="mm__b" title="Options" (click)="toggleMenu(m); $event.stopPropagation()">
                          <app-icon name="dots" [size]="15" [stroke]="2" />
                        </button>
                        @if (menuId() === m.id) {
                          <div class="mm__bd" (click)="menuId.set(null)"></div>
                          <div class="mm__menu" (click)="$event.stopPropagation()">
                            @if (m.parts.length > 0) {
                              <button class="mm__i" (click)="startEdit(m)"><app-icon name="edit" [size]="14" />Modifier</button>
                            }
                            <button class="mm__i mm__i--danger" (click)="removeMessage(m)"><app-icon name="trash" [size]="14" />Supprimer</button>
                          </div>
                        }
                      </div>
                    }
                    <div class="ra">
                      <button class="act__b" title="Réagir" (click)="toggleReactBar(m); $event.stopPropagation()">
                        <app-icon name="smile" [size]="15" />
                      </button>
                      @if (reactFor() === m.id) {
                        <div class="ra__bd" (click)="reactFor.set(null)"></div>
                        <div class="ra__bar" (click)="$event.stopPropagation()">
                          @for (e of QUICK_EMOJIS; track e) {
                            <button class="ra__e" (click)="react(m, e)">{{ e }}</button>
                          }
                        </div>
                      }
                    </div>
                    <button class="act__b" title="Répondre" (click)="startReply(m); $event.stopPropagation()">↩</button>
                  </div>
                }
                @if (m.isDeleted) {
                  <div class="deleted">{{ m.me ? 'Vous avez' : peer().name + ' a' }} supprimé ce message</div>
                } @else if (editingId() === m.id) {
                  <div class="edit">
                    <textarea class="edit__ta" [value]="editDraft()"
                              (input)="editDraft.set($any($event.target).value)"
                              (keydown.enter)="$event.preventDefault(); saveEdit(m)"
                              (keydown.escape)="cancelEdit()"></textarea>
                    <div class="edit__a">
                      <button class="edit__x" (click)="cancelEdit()">Annuler</button>
                      <button class="edit__ok" (click)="saveEdit(m)">Enregistrer</button>
                    </div>
                  </div>
                } @else {
                  @if (m.replyTo; as r) {
                    <div class="rq" [class.rq--del]="r.deleted" [class.rq--link]="!r.deleted"
                         (click)="!r.deleted && scrollToMessage(r.id); $event.stopPropagation()">
                      <span class="rq__a">{{ r.author }}</span>
                      <span class="rq__x">{{ r.excerpt }}</span>
                    </div>
                  }
                  @if (m.parts.length > 0) {
                    <div>
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
                  @if (m.reactions?.length) {
                    <div class="rx">
                      @for (r of m.reactions!; track r.emoji) {
                        <button class="rx__c" [class.rx__c--mine]="r.mine" (click)="react(m, r.emoji)">
                          <span>{{ r.emoji }}</span><span class="rx__n">{{ r.count }}</span>
                        </button>
                      }
                    </div>
                  }
                }
                <div class="t">
                  <span>{{ m.time }}</span>
                  @if (m.edited && !m.isDeleted) { <span class="ed">· modifié</span> }
                  @if (m.me) {
                    <span class="rr" [class.rr--read]="m.read" [title]="m.read ? 'Lu' : 'Envoyé'">
                      <app-icon [name]="m.read ? 'checkDouble' : 'check'" [size]="13" [stroke]="2.2" />
                    </span>
                  }
                </div>
              </div>
            </div>
          }
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

      <div class="composer">
        @if (replyingTo(); as r) {
          <div class="reply-bar">
            <span class="reply-bar__i">↩</span>
            <div class="reply-bar__c">
              <span class="reply-bar__a">Réponse à {{ r.author }}</span>
              <span class="reply-bar__x">{{ r.excerpt }}</span>
            </div>
            <button class="reply-bar__x2" title="Annuler" (click)="cancelReply()"><app-icon name="x" [size]="15" /></button>
          </div>
        }
        <app-comment-composer [placeholder]="'Votre message…'" (submitted)="onSend($event)" (typing)="onTyping()" />
      </div>
    </div>
  `,
  styleUrl: './conversation-privee.component.scss',
})
export class ConversationPriveeComponent {
  private catalog = inject(ProjectCatalogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  bus = inject(ShellBus);
  private members = inject(MembersService);
  private conversationsSvc = inject(ConversationsService);
  private filesSvc = inject(FilesHttpService);
  private slug = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? 'sarah-diallo')), { initialValue: 'sarah-diallo' });
  peer = toSignal(toObservable(this.slug).pipe(switchMap(s => this.members.bySlug(s))), { initialValue: EMPTY_MEMBER });

  chipTabFor = chipTabFor;

  /** Message thread of the active conversation (reloads when the slug changes). */
  msgs = signal<Msg[]>([]);
  /** Vrai tant que l'historique de la conversation n'est pas chargé. */
  loading = signal(true);
  /** Id du 1ᵉʳ message non lu au chargement — place la séparation « Messages non lus ». */
  unreadSeparatorId = signal<string | null>(null);

  // ── Indicateur « est en train d'écrire » ────────────────────────────────────
  /** Vrai uniquement quand le pair est EN LIGNE et tape réellement (STOMP). */
  private typingRaw = signal(false);
  // 🔴 Le « en train d'écrire » NE dépend PLUS de la présence. Un événement typing
  // reçu prouve à lui seul que la personne est là (elle tape) ; le coupler à
  // `peer().online` le masquait dès que la présence était en retard ou indisponible.
  // L'expiration est déjà gérée par `typingTimer` (4 s sans nouvel événement).
  peerTyping = computed(() => this.typingRaw());
  /** Timer d'expiration : l'indicateur retombe si plus rien n'arrive. */
  private typingTimer?: ReturnType<typeof setTimeout>;
  /** Messages déjà signalés « lus » au serveur — évite de re-PATCHer à chaque ré-ouverture. */
  private readonly markedRead = new Set<string>();
  /** Anti-spam : on ne republie « je tape » qu'une fois par fenêtre. */
  private lastTypingSentAt = 0;
  private stopTypingTimer?: ReturnType<typeof setTimeout>;

  /** Frappe locale → publie « je tape » (throttlé) puis « j'ai arrêté » après 3 s. */
  onTyping(): void {
    const now = Date.now();
    if (now - this.lastTypingSentAt > 2000) {
      this.lastTypingSentAt = now;
      this.conversationsSvc.sendTyping(this.slug(), true);
    }
    clearTimeout(this.stopTypingTimer);
    this.stopTypingTimer = setTimeout(() => {
      this.lastTypingSentAt = 0;
      this.conversationsSvc.sendTyping(this.slug(), false);
    }, 3000);
  }

  /** Header search — open flag and query text. */
  searchOpen = signal(false);
  searchQ = signal('');
  /** Right-side panels — only one can be open at a time. */
  mediaOpen = signal(false);
  mentionsOpen = signal(false);

  visible = computed<Msg[]>(() => {
    const q = this.searchQ().toLowerCase().trim();
    const all = this.msgs();
    if (!q) return all;
    return all.filter(m =>
      m.parts.some(p => p.type === 't' && p.val.toLowerCase().includes(q)) ||
      (m.files ?? []).some(f => f.name.toLowerCase().includes(q)),
    );
  });

  sharedMedia = computed<SharedMediaItem[]>(() =>
    this.msgs()
      .flatMap(m => (m.files ?? []).map(f => ({
        id: `${m.time}-${f.id}`,
        name: f.name,
        size: f.size,
        meta: m.me ? 'Vous' : this.peer().name,
      })))
      .reverse(),
  );

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

  /** Message ciblé par une notification de mention (`?message=<uuid>`) — cf. canal. */
  protected focusMessageId = toSignal(
    this.route.queryParamMap.pipe(map(q => q.get('message'))),
    { initialValue: null },
  );

  @ViewChild('msgsEl') private msgsEl?: ElementRef<HTMLDivElement>;
  @ViewChild('sinput') private searchInput?: ElementRef<HTMLInputElement>;

  constructor() {
    // Quitter les conversations libère le « fil actif » (plus d'anti-bruit associé).
    inject(DestroyRef).onDestroy(() => this.bus.activeThreadId.set(null));
    toObservable(this.slug)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(s => this.conversationsSvc.thread(s)),
        takeUntilDestroyed(),
      )
      .subscribe(thread => {
        this.msgs.set(thread);
        this.searchQ.set('');
        this.loading.set(false);
        this.typingRaw.set(false); // jamais affiché par défaut à l'ouverture
        // Séparation « Messages non lus » : 1ᵉʳ message reçu non lu, AVANT de marquer lu.
        this.unreadSeparatorId.set(thread.find(m => m.unreadByMe && m.id)?.id ?? null);
        // Fil actif → anti-bruit des notifs + effacement des notifs « nouveau message ».
        this.bus.activeThreadId.set(
          this.conversationsSvc.items().find(c => c.id === this.slug())?.uuid ?? null);
        // À l'ouverture, effacer le badge « non lu » et émettre l'accusé de lecture
        // serveur pour chaque message du pair reçu pendant mon absence → l'expéditeur
        // les voit passer « lu » en temps réel. Dédupliqué pour ne pas re-PATCHer à
        // chaque ré-ouverture (le serveur est idempotent, mais autant lui épargner).
        this.conversationsSvc.markRead(this.slug());
        for (const m of thread) {
          if (!m.me && m.id && !this.markedRead.has(m.id)) {
            this.markedRead.add(m.id);
            this.conversationsSvc.markMessageRead(m.id);
          }
        }
      });

    // Indicateur de saisie du pair (STOMP). Retombe seul après 4 s sans signal.
    toObservable(this.slug)
      .pipe(
        tap(() => this.typingRaw.set(false)),
        switchMap(s => this.conversationsSvc.typing(s)),
        takeUntilDestroyed(),
      )
      .subscribe(isTyping => {
        this.typingRaw.set(isTyping);
        clearTimeout(this.typingTimer);
        if (isTyping) {
          this.typingTimer = setTimeout(() => this.typingRaw.set(false), 4000);
        }
      });
    // Réception temps réel. Le serveur diffuse un message sur DEUX occasions :
    // à l'envoi, et à sa LECTURE (accusé de lecture — il revient avec `read=true`).
    toObservable(this.slug)
      .pipe(switchMap(s => this.conversationsSvc.live(s)), takeUntilDestroyed())
      .subscribe(msg => {
        this.msgs.update(list => {
          // 1. Message déjà connu (même id) → mise à jour : accusé de lecture,
          //    édition (nouveau contenu + « modifié »), réaction, OU suppression
          //    (marqueur « supprimé » conservé, façon WhatsApp).
          const known = list.findIndex(m => m.id && m.id === msg.id);
          if (known >= 0) {
            const next = [...list];
            next[known] = { ...next[known], read: msg.read ?? next[known].read, isDeleted: msg.isDeleted, parts: msg.parts, files: msg.files, edited: msg.edited, reactions: msg.reactions, replyTo: msg.replyTo };
            return next;
          }
          // 2. MON propre message qui revient du serveur → remplace l'optimiste
          //    (affiché sans id à l'envoi) pour récupérer son id, cible du reçu de lecture.
          if (msg.me) {
            const optimistic = list.findIndex(m => m.me && !m.id);
            if (optimistic >= 0) { const next = [...list]; next[optimistic] = msg; return next; }
            return list; // déjà présent
          }
          // 3. Nouveau message du pair.
          return [...list, msg];
        });
        // À la réception d'un message du pair, j'émets l'accusé de lecture serveur
        // (`PATCH /messages/{id}/read`) → le serveur en informe l'expéditeur en
        // temps réel (cas 1 chez lui). J'efface aussi le badge « non lu » local.
        if (!msg.me) {
          if (msg.id && !this.markedRead.has(msg.id)) {
            this.markedRead.add(msg.id);
            this.conversationsSvc.markMessageRead(msg.id);
          }
          this.conversationsSvc.markRead(this.slug());
        }
      });
    // Pin the scroll to the bottom whenever the thread changes (open a
    // conversation, switch peer, or send a new message).
    effect(() => {
      this.visible();
      // Sauf si un message est ciblé (mention) : le ramener en bas l'effacerait.
      if (this.focusMessageId()) return;
      requestAnimationFrame(() => this.scrollToBottom());
    });

    // Défilement vers le message mentionné, une fois le fil peint.
    effect(() => {
      const id = this.focusMessageId();
      if (!id || !this.visible().length) return;
      requestAnimationFrame(() => {
        this.msgsEl?.nativeElement.querySelector(`[data-mid="${id}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
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

  /** Human-readable file size — mirrors canaux / fiche tâche formatter. */
  sizeOf(bytes: number): string {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  /**
   * Téléchargement direct d'une pièce jointe. Utilise l'URL réelle du File
   * Service dès que le message est persisté ; repli sur le placeholder pour un
   * message à peine envoyé (pas encore d'URL).
   */
  downloadFile(f: ConversationFile): void {
    if (f.url) this.filesSvc.download(f.url).subscribe(blob => saveBlob(blob, f.name));
    else downloadAttachedFile(f.name, f.size);
  }

  // ── Modification / suppression de message (§13.5) ────────────────────────────
  menuId    = signal<string | null>(null);
  editingId = signal<string | null>(null);
  editDraft = signal('');

  toggleMenu(m: Msg): void { this.menuId.set(this.menuId() === m.id ? null : (m.id ?? null)); }

  /** Modifier/supprimer permis seulement dans les 15 min suivant l'envoi (aligné backend). */
  canModify(m: Msg): boolean {
    if (!m.sentAt) return true;
    return Date.now() - new Date(m.sentAt).getTime() < 15 * 60 * 1000;
  }

  startEdit(m: Msg): void {
    this.menuId.set(null);
    if (!m.id) return;
    this.editingId.set(m.id);
    this.editDraft.set(m.parts.map(p => p.val).join(''));
  }
  cancelEdit(): void { this.editingId.set(null); this.editDraft.set(''); }

  saveEdit(m: Msg): void {
    const id = m.id;
    const text = this.editDraft().trim();
    if (!id) { this.cancelEdit(); return; }
    if (!text || text === m.parts.map(p => p.val).join('')) { this.cancelEdit(); return; }
    const snapshot = this.msgs();
    // Optimiste : re-parse + « modifié » ; rétabli si le backend refuse (fenêtre).
    this.msgs.update(l => l.map(x => x.id === id ? { ...x, parts: parseRichText(text), edited: true } : x));
    this.cancelEdit();
    this.conversationsSvc.editMessage(id, text).subscribe({ error: () => this.msgs.set(snapshot) });
  }

  removeMessage(m: Msg): void {
    this.menuId.set(null);
    const id = m.id;
    if (!id) return;
    const snapshot = this.msgs();
    // Optimiste : marqueur « supprimé » (trace conservée) ; rétabli si le backend refuse.
    this.msgs.update(l => l.map(x => x.id === id ? { ...x, isDeleted: true, parts: [], files: undefined, reactions: undefined, replyTo: undefined } : x));
    this.conversationsSvc.deleteMessage(id).subscribe({ error: () => this.msgs.set(snapshot) });
  }

  // ── Réponse ciblée (reply) + réactions emoji ─────────────────────────────────
  readonly QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '✅', '👀'];
  replyingTo = signal<MessageReply | null>(null);
  reactFor = signal<string | null>(null);

  startReply(m: Msg): void {
    this.menuId.set(null);
    if (!m.id) return;
    this.replyingTo.set({
      id: m.id,
      author: m.me ? 'Vous' : this.peer().name,
      excerpt: m.parts.map(p => p.val).join('').slice(0, 140) || (m.files?.length ? 'Pièce jointe' : ''),
      deleted: false,
    });
  }
  cancelReply(): void { this.replyingTo.set(null); }

  toggleReactBar(m: Msg): void { this.reactFor.set(this.reactFor() === m.id ? null : (m.id ?? null)); }

  /** Clic sur une citation → défile jusqu'au message d'origine et l'encadre. */
  scrollToMessage(id: string): void {
    const el = this.msgsEl?.nativeElement.querySelector(`[data-mid="${id}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('line--focus');
    setTimeout(() => el.classList.remove('line--focus'), 2000);
  }

  react(m: Msg, emoji: string): void {
    this.reactFor.set(null);
    const id = m.id;
    if (!id) return;
    const snapshot = this.msgs();
    this.msgs.update(l => l.map(x => x.id === id ? { ...x, reactions: toggleLocalReaction(x.reactions, emoji) } : x));
    this.conversationsSvc.toggleReaction(id, emoji).subscribe({ error: () => this.msgs.set(snapshot) });
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
    const files: ConversationFile[] | undefined = payload.files.length
      ? payload.files.map(f => ({ id: f.id, name: f.name, size: f.size }))
      : undefined;
    // Affichage optimiste immédiat, puis persistance réelle (texte + fichiers).
    const reply = this.replyingTo();
    this.msgs.update(list => [...list, { me: true, parts: payload.parts, time, read: false, files, replyTo: reply ?? undefined }]);
    const text = payload.text ?? payload.parts.map(p => p.val).join('');
    const rawFiles = payload.files.map(f => f.file).filter((f): f is File => !!f);
    // Mentions résolues en cibles réelles (cf. canal.component).
    const mentions = this.catalog.resolveMentions(payload.parts);
    this.cancelReply();
    this.conversationsSvc.sendMessage(this.slug(), text, rawFiles, mentions, reply?.id).subscribe();
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
