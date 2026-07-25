import {
  ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener,
  Input, Output, ViewChild, signal,
} from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MentionPickerComponent } from '@shared/ui/mention-picker/mention-picker.component';
import { EmojiPickerComponent } from '@shared/ui/emoji-picker/emoji-picker.component';
import { BrowseMentionsModalComponent } from '@shared/overlays/browse-mentions/browse-mentions-modal.component';
import { MentionTab } from '@core/models/mention.models';
import { RichPart, parseRichText, tokenizeRich } from '@core/util/mention.util';

interface AttachedFile { id: number; name: string; size: number; file?: File; }

/** Inline SVG for the chip icons (matches <app-mention-chip>, fixed at 12px). */
const CHIP_ICON: Record<'task' | 'doc' | 'channel', string> = {
  task: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  doc:  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M13 3v6h6"/></svg>',
  channel: '',
};

/** Chip palette — identical to <app-mention-chip>. */
const CHIP_COLORS: Record<'task' | 'doc' | 'channel', { bg: string; fg: string }> = {
  task:    { bg: 'rgba(91,95,233,.10)', fg: '#4B3FD6' },
  doc:     { bg: 'rgba(58,169,224,.12)', fg: '#1f7fb0' },
  channel: { bg: 'rgba(43,182,115,.12)', fg: '#1f8a55' },
};

function pickPrefixToken(word: string): { tab: MentionTab; query: string } | null {
  if (word.startsWith('@@@')) return { tab: 'documents', query: word.slice(3) };
  if (word.startsWith('@@'))  return { tab: 'taches',    query: word.slice(2) };
  if (word.startsWith('@'))   return { tab: 'personnes', query: word.slice(1) };
  if (word.startsWith('#'))   return { tab: 'canaux',    query: word.slice(1) };
  return null;
}

/**
 * Comment composer — rich inline editor (comments, canaux, conversations).
 *
 * - contenteditable that renders mentions as live chips *at the caret*, exactly
 *   as they will look once sent (blue name for @person, boxed chip for
 *   @@task / @@@doc / #channel). The token being typed stays plain so the
 *   picker can filter it; it becomes a chip as soon as the caret leaves it.
 * - Entrée = envoyer ; Maj+Entrée = retour à la ligne (le bouton Envoyer marche aussi).
 * - Emits the parsed RichPart[] (+ attached files) so consumers render mentions
 *   without re-parsing.
 */
@Component({
  selector: 'app-comment-composer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, MentionPickerComponent, EmojiPickerComponent, BrowseMentionsModalComponent],
  template: `
    <div class="cc">
      <div class="cc__box">
        <input #fileInput type="file" multiple hidden (change)="onFilePicked($event)" />

        @if (files().length > 0) {
          <div class="cc__files">
            @for (f of files(); track f.id) {
              <span class="cc__file">
                <app-icon name="file" [size]="13" />
                <span class="cc__fn">{{ f.name }}</span>
                <button class="cc__fx" (click)="removeFile(f.id)" aria-label="Retirer">
                  <app-icon name="x" [size]="12" [stroke]="2.5" />
                </button>
              </span>
            }
          </div>
        }

        <div
          #editable
          class="cc__ed"
          [attr.data-ph]="placeholder"
          contenteditable="true"
          (input)="onInput()"
          (keydown)="onKey($event)"
          (click)="onCaretMove()"
          (keyup)="onCaretMove()"
        ></div>

        <div class="cc__bar">
          <button class="cc__tb" title="Joindre un fichier" (click)="fileInput.click()">
            <app-icon name="paperclip" [size]="18" />
          </button>
          <button class="cc__tb" [class.cc__tb--on]="mentionOpen()" title="Mentionner (@ @@ @@@ #)" (click)="toggleMention()">
            <app-icon name="at" [size]="18" />
          </button>
          <button class="cc__tb" [class.cc__tb--on]="emojiOpen()" title="Emoji" (click)="toggleEmoji()">
            <app-icon name="smile" [size]="18" />
          </button>
          <span class="cc__sp"></span>
          <button class="cc__send" title="Envoyer" [disabled]="sending" (click)="send()">
            @if (sending) { <span class="cc__spin"></span> } @else { <app-icon name="send" [size]="17" /> }
          </button>
        </div>

        @if (mentionOpen()) {
          <div class="cc__pop cc__pop--mention">
            <app-mention-picker
              [tab]="activeTab()"
              [initialQuery]="filterQuery()"
              (tabChange)="activeTab.set($event)"
              (picked)="onMentionPicked($event)"
              (browse)="openBrowse($event)"
            />
          </div>
        }
        @if (emojiOpen()) {
          <div class="cc__pop cc__pop--emoji">
            <app-emoji-picker (selected)="onEmojiPicked($event)" />
          </div>
        }
      </div>
    </div>

    @if (browseOpen()) {
      <app-browse-mentions-modal
        [initialTab]="activeTab()"
        (closed)="browseOpen.set(false)"
        (picked)="onBrowsePicked($event)"
      />
    }
  `,
  styles: [`
    .cc { padding: 0 0 0; }
    .cc__box { position: relative; border: 1px solid var(--nx-border); border-radius: 12px;
      background: #fff; box-shadow: 0 1px 4px rgba(20,15,40,.04); }
    .cc__files { display: flex; flex-wrap: wrap; gap: 7px; padding: 10px 12px 0; }
    .cc__file { display: inline-flex; align-items: center; gap: 7px; height: 28px;
      padding: 0 5px 0 10px; border-radius: 7px; background: var(--nx-surface-3);
      font-size: 12px; font-weight: 600; color: var(--nx-text-700); }
    .cc__file app-icon { color: var(--nx-text-500); display: flex; }
    .cc__fn { max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cc__fx { width: 18px; height: 18px; border: none; border-radius: 5px; background: transparent;
      color: var(--nx-text-500); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .cc__fx:hover { background: rgba(245,86,78,.12); color: #F5564E; }
    .cc__ed { padding: 12px 14px 4px; font-size: 14px; color: var(--nx-text); white-space: pre-wrap;
      line-height: 1.6; min-height: 22px; max-height: 140px; overflow-y: auto; outline: none; word-break: break-word; }
    .cc__ed:empty::before { content: attr(data-ph); color: var(--nx-text-400); pointer-events: none; }
    /* live mention chips inside the editor — identical to <app-mention-chip> */
    .cc__ed .m-person { color: var(--nx-indigo, #5B5FE9); font-weight: 600; }
    .cc__ed .m-chip { display: inline-flex; align-items: center; gap: 4px; vertical-align: baseline;
      height: 20px; padding: 0 7px 0 5px; margin: 0 1px; border-radius: 6px; font-size: 12.5px; font-weight: 600; line-height: 1; white-space: nowrap; }
    .cc__ed .m-chip svg { width: 12px !important; height: 12px !important; flex: none; display: block; }
    .cc__ed .m-chip > span { line-height: 1; }
    .cc__ed .m-task { background: rgba(91,95,233,.10); color: #4B3FD6; font-family: var(--nx-mono, 'JetBrains Mono', monospace); }
    .cc__ed .m-doc  { background: rgba(58,169,224,.12); color: #1f7fb0; }
    .cc__ed .m-chan { background: rgba(43,182,115,.12); color: #1f8a55; }
    .cc__bar { display: flex; align-items: center; gap: 2px; padding: 4px 8px 8px; }
    .cc__tb { width: 32px; height: 32px; border: none; border-radius: 8px; background: transparent;
      color: var(--nx-text-500); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .cc__tb:hover { background: var(--nx-surface-3); }
    .cc__tb--on { background: var(--nx-indigo-50); color: var(--nx-indigo); }
    .cc__sp { flex: 1; }
    .cc__send { width: 34px; height: 34px; border: none; border-radius: 10px; background: var(--nx-indigo);
      color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;
      box-shadow: 0 4px 12px rgba(91,95,233,.28); }
    .cc__send:hover { filter: brightness(1.05); }
    .cc__send:disabled { opacity: .7; cursor: default; }
    .cc__spin { width: 15px; height: 15px; border-radius: 50%; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; animation: ccsp .7s linear infinite; }
    @keyframes ccsp { to { transform: rotate(360deg); } }
    .cc__pop { position: absolute; z-index: 30; }
    .cc__pop--mention { left: 0; right: 0; bottom: calc(100% + 8px); }
    .cc__pop--emoji   { left: 0; right: 0; bottom: calc(100% + 8px); }
  `],
})
export class CommentComposerComponent {
  @Input() placeholder = 'Commentez, mentionnez avec @, @@, @@@ ou #…';
  /** Piloté par le parent : envoi en cours (spinner + bouton désactivé). */
  @Input() sending = false;
  @Output() submitted = new EventEmitter<{ parts: RichPart[]; files: AttachedFile[]; text: string }>();
  /** Émis à chaque frappe — alimente l'indicateur « est en train d'écrire ». */
  @Output() typing = new EventEmitter<void>();

  @ViewChild('editable', { static: true }) editable!: ElementRef<HTMLDivElement>;

  protected readonly files = signal<AttachedFile[]>([]);
  protected readonly mentionOpen = signal(false);
  protected readonly emojiOpen = signal(false);
  protected readonly browseOpen = signal(false);
  protected readonly activeTab = signal<MentionTab>('personnes');
  protected readonly filterQuery = signal('');

  private nextFileId = 1;
  private get el(): HTMLDivElement { return this.editable.nativeElement; }

  /** True when the picker was opened via the @ button (stays open while typing). */
  private pinnedOpen = false;

  // ── Toolbar toggles ────────────────────────────────────────────────────────
  protected toggleMention(): void {
    this.emojiOpen.set(false);
    const wasOpen = this.mentionOpen();
    this.mentionOpen.set(!wasOpen);
    this.pinnedOpen = !wasOpen;
    if (!wasOpen) this.filterQuery.set('');
  }
  protected toggleEmoji(): void {
    this.mentionOpen.set(false);
    this.emojiOpen.update(v => !v);
  }

  @HostListener('document:keydown.escape') onEsc(): void {
    if (this.browseOpen()) this.browseOpen.set(false);
    else if (this.mentionOpen()) { this.mentionOpen.set(false); this.pinnedOpen = false; }
    else if (this.emojiOpen()) this.emojiOpen.set(false);
  }

  // ── Editor lifecycle ─────────────────────────────────────────────────────
  protected onInput(): void {
    this.rerender();
    this.syncMentionPicker();
    this.typing.emit();
  }

  /** Caret moved (click / arrow keys) → re-render so completed mentions become chips. */
  protected onCaretMove(): void {
    this.rerender();
    this.syncMentionPicker();
  }

  protected onKey(ev: KeyboardEvent): void {
    // Entrée = envoyer ; Maj+Entrée = retour à la ligne. Si un menu (mentions/emoji)
    // est ouvert, Entrée ne doit pas envoyer : l'utilisateur est en train de choisir.
    if (ev.key === 'Enter') {
      if (ev.shiftKey) {
        ev.preventDefault();
        this.insertText('\n');
        this.rerender();
        return;
      }
      ev.preventDefault();
      if (this.mentionOpen() || this.browseOpen() || this.emojiOpen()) return;
      this.send();
      return;
    }
    // Ctrl/Cmd + A → select all contents of the editor (native contenteditable
    // handling is inconsistent across browsers and may select the whole page).
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'a') {
      ev.preventDefault();
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(this.el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }

  // ── Mentions ──────────────────────────────────────────────────────────────
  private syncMentionPicker(): void {
    const active = this.activeMention();
    if (active) {
      // A trigger (@ @@ @@@ #) escalates the tab and filters in real time.
      this.activeTab.set(active.tab);
      this.filterQuery.set(active.query);
      this.mentionOpen.set(true);
      this.emojiOpen.set(false);
    } else if (this.pinnedOpen) {
      // Opened via the @ button: keep it open, just clear the filter.
      this.filterQuery.set('');
    } else {
      // Typing normal text with no trigger → close the auto-opened picker.
      this.mentionOpen.set(false);
    }
  }

  protected onMentionPicked(p: { tab: MentionTab; token: string }): void {
    this.insertMention(p.token);
    this.mentionOpen.set(false);
    this.pinnedOpen = false;
  }
  protected onBrowsePicked(p: { tab: MentionTab; token: string }): void {
    this.insertMention(p.token);
    this.browseOpen.set(false);
    this.pinnedOpen = false;
  }
  protected onEmojiPicked(glyph: string): void {
    this.insertText(glyph);
    this.rerender();
    this.emojiOpen.set(false);
  }
  protected openBrowse(tab: MentionTab): void {
    this.activeTab.set(tab);
    this.browseOpen.set(true);
    this.mentionOpen.set(false);
  }

  // ── Files ─────────────────────────────────────────────────────────────────
  protected onFilePicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const list = Array.from(input.files ?? []);
    if (list.length === 0) return;
    this.files.update(prev => [...prev, ...list.map(f => ({ id: this.nextFileId++, name: f.name, size: f.size, file: f }))]);
    input.value = '';
  }
  protected removeFile(id: number): void {
    this.files.update(prev => prev.filter(f => f.id !== id));
  }

  // ── Send ────────────────────────────────────────────────────────────────
  protected send(): void {
    const text = this.serialize(this.el);
    const parts = parseRichText(text);
    const files = this.files();
    const hasText = parts.some(p => p.type !== 't' || p.val.trim().length > 0);
    if (!hasText && files.length === 0) return;
    this.submitted.emit({ parts, files, text });
    this.el.textContent = '';
    this.files.set([]);
    this.mentionOpen.set(false);
    this.pinnedOpen = false;
    this.emojiOpen.set(false);
  }

  // ── Rich-editor engine ────────────────────────────────────────────────────

  /** Serialize the editor to canonical text (chips → their raw token, <br> → \n). */
  private serialize(root: Node): string {
    let out = '';
    root.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) { out += node.nodeValue ?? ''; return; }
      const el = node as HTMLElement;
      if (el.tagName === 'BR') { out += '\n'; return; }
      if (el.dataset && el.dataset['raw'] != null) { out += el.dataset['raw']; return; }
      out += this.serialize(el);
    });
    return out;
  }

  /** Linear caret index over the serialized text (null if caret is outside). */
  private caretIndex(): number | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const r = sel.getRangeAt(0);
    if (!this.el.contains(r.endContainer)) return null;
    const pre = document.createRange();
    pre.selectNodeContents(this.el);
    pre.setEnd(r.endContainer, r.endOffset);
    return this.serialize(pre.cloneContents()).length;
  }

  /**
   * The mention trigger the caret currently sits after (drives the picker).
   * Works even for a lone `@`/`@@`/`@@@`/`#` with nothing typed yet: we look at
   * the word ending at the caret, not at matched tokens.
   */
  private activeMention(): { tab: MentionTab; query: string } | null {
    const caret = this.caretIndex();
    if (caret == null) return null;
    const before = this.serialize(this.el).slice(0, caret);
    // word = run of non-whitespace ending at the caret
    const word = (before.split(/[\s ]/).pop() || '');
    return pickPrefixToken(word);
  }

  /** Rebuild the editor DOM from its text, keeping the caret at the same index. */
  private rerender(): void {
    const text = this.serialize(this.el);
    const caret = this.caretIndex();
    const active = this.activeTokenRange(text, caret);

    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const tk of tokenizeRich(text)) {
      const start = pos;
      const end = pos + tk.raw.length;
      pos = end;
      // The token under the caret stays plain text so it can still be typed/filtered.
      const isActive = active != null && start === active.start && end === active.end;
      if (tk.type === 't' || isActive) {
        this.appendText(frag, tk.raw);
      } else {
        frag.appendChild(this.buildChip(tk.type, tk.val, tk.raw));
      }
    }

    this.el.replaceChildren(frag);
    if (caret != null) this.placeCaret(caret);
  }

  /** Range [start,end) of the mention token containing the caret (or null). */
  private activeTokenRange(text: string, caret: number | null): { start: number; end: number } | null {
    if (caret == null) return null;
    let pos = 0;
    for (const tk of tokenizeRich(text)) {
      const start = pos;
      const end = pos + tk.raw.length;
      pos = end;
      if (tk.type !== 't' && caret > start && caret <= end) return { start, end };
    }
    return null;
  }

  /** Append text preserving newlines as <br>. */
  private appendText(frag: DocumentFragment | HTMLElement, text: string): void {
    const segments = text.split('\n');
    segments.forEach((seg, i) => {
      if (i > 0) frag.appendChild(document.createElement('br'));
      if (seg) frag.appendChild(document.createTextNode(seg));
    });
  }

  private buildChip(type: 'person' | 'task' | 'doc' | 'channel', val: string, raw: string): HTMLElement {
    const span = document.createElement('span');
    span.contentEditable = 'false';
    span.dataset['raw'] = raw;
    // Colors are set inline: elements built in JS don't carry Angular's scoped
    // attributes, so component styles wouldn't reach them.
    if (type === 'person') {
      span.className = 'm-person';
      span.style.cssText = 'color:#5B5FE9;font-weight:600';
      span.textContent = '@' + val;
    } else {
      const c = CHIP_COLORS[type];
      span.className = 'm-chip m-' + type;
      span.style.cssText = `display:inline-flex;align-items:center;gap:4px;vertical-align:baseline;height:20px;padding:0 7px 0 5px;margin:0 1px;border-radius:6px;font-size:12.5px;font-weight:600;line-height:1;white-space:nowrap;background:${c.bg};color:${c.fg}` + (type === 'task' ? ";font-family:var(--nx-mono,'JetBrains Mono',monospace)" : '');
      const label = type === 'channel' ? '#' + this.escape(val.replace(/^#+/, '')) : this.escape(val);
      span.innerHTML = (CHIP_ICON[type] || '') + '<span style="line-height:1">' + label + '</span>';
    }
    return span;
  }

  private escape(s: string): string {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  }

  /** Place the caret at a linear index over the (already rebuilt) editor content. */
  private placeCaret(index: number): void {
    let remaining = index;
    const range = document.createRange();
    const nodes = Array.from(this.el.childNodes);
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const len = (node.nodeValue ?? '').length;
        if (remaining <= len) { range.setStart(node, remaining); range.collapse(true); this.applyRange(range); return; }
        remaining -= len;
      } else {
        const el = node as HTMLElement;
        const len = el.tagName === 'BR' ? 1 : (el.dataset['raw']?.length ?? 0);
        if (remaining < len) { range.setStartBefore(node); range.collapse(true); this.applyRange(range); return; }
        remaining -= len;
      }
    }
    // fallback: end of editor
    range.selectNodeContents(this.el);
    range.collapse(false);
    this.applyRange(range);
  }

  private applyRange(range: Range): void {
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /** Insert plain text at the caret (used for emoji / newline). */
  private insertText(text: string): void {
    this.el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && this.el.contains(sel.getRangeAt(0).endContainer)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      this.el.appendChild(document.createTextNode(text));
      this.placeCaret(this.serialize(this.el).length);
    }
  }

  /**
   * Replace the mention token under the caret (or insert at the caret) with the
   * canonical token + a trailing space, then re-render so it becomes a chip.
   */
  private insertMention(token: string): void {
    this.el.focus();
    const text = this.serialize(this.el);
    let caret = this.caretIndex();
    if (caret == null) caret = text.length;

    // Strip the trigger word ending at the caret (e.g. "@", "@@MO", "#des")
    // so we don't end up with a doubled prefix like "@@Aïda".
    const head = text.slice(0, caret);
    const after = text.slice(caret);
    const trigger = /(?:^|[\s ])((?:@{1,3}|#)[^\s ]*)$/.exec(head);
    const before = trigger ? head.slice(0, head.length - trigger[1].length) : head;
    let newCaret: number;
    // Keep multi-word tokens (e.g. "@Moussa Bâ") a single mention: spaces → NBSP.
    const nbsp = token.replace(/ /g, ' ');
    const insert = nbsp + ' ';
    newCaret = before.length + insert.length;
    const next = before + insert + after;

    // rebuild from the new text with the caret after the inserted token
    this.el.textContent = next;
    this.placeCaret(newCaret);
    this.rerender();
    this.mentionOpen.set(false);
  }
}
