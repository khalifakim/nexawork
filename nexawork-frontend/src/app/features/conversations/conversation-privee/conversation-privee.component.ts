import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
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
import { Member } from '@core/models/member.models';
import { ConversationFile, ConversationMessage } from '@core/models/conversation.models';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { chipTabFor, RichPart } from '@core/util/mention.util';
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
            <span class="av__c" [style.background]="peer().color">{{ ini(peer().name) }}</span>
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
            <div class="line" [class.line--me]="m.me">
              <div class="bubble" [class.bubble--me]="m.me">
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
                <div class="t">
                  <span>{{ m.time }}</span>
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

      <div class="typing">{{ peer().name.split(' ')[0] }} est en train d'écrire…</div>

      <div class="composer">
        <app-comment-composer [placeholder]="'Votre message…'" (submitted)="onSend($event)" />
      </div>
    </div>
  `,
  styleUrl: './conversation-privee.component.scss',
})
export class ConversationPriveeComponent {
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

  @ViewChild('msgsEl') private msgsEl?: ElementRef<HTMLDivElement>;
  @ViewChild('sinput') private searchInput?: ElementRef<HTMLInputElement>;

  constructor() {
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
        // À l'ouverture, marquer la conversation comme lue (accusé de lecture).
        this.conversationsSvc.markRead(this.slug());
      });
    // Réception temps réel des messages du pair (mes propres messages sont déjà
    // affichés de façon optimiste à l'envoi).
    toObservable(this.slug)
      .pipe(switchMap(s => this.conversationsSvc.live(s)), takeUntilDestroyed())
      .subscribe(msg => {
        if (!msg.me) {
          this.msgs.update(list => [...list, msg]);
          this.conversationsSvc.markRead(this.slug());
        }
      });
    // Pin the scroll to the bottom whenever the thread changes (open a
    // conversation, switch peer, or send a new message).
    effect(() => {
      this.visible();
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
    this.msgs.update(list => [...list, { me: true, parts: payload.parts, time, read: false, files }]);
    const text = payload.text ?? payload.parts.map(p => p.val).join('');
    const rawFiles = payload.files.map(f => f.file).filter((f): f is File => !!f);
    this.conversationsSvc.sendMessage(this.slug(), text, rawFiles).subscribe();
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
