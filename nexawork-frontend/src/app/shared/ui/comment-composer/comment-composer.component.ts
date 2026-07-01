import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener,
  Input, Output, ViewChild, signal,
} from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MentionPickerComponent } from '@shared/ui/mention-picker/mention-picker.component';
import { EmojiPickerComponent } from '@shared/ui/emoji-picker/emoji-picker.component';
import { BrowseMentionsModalComponent } from '@shared/overlays/browse-mentions/browse-mentions-modal.component';
import { MentionTab } from '@core/models/mention.models';

interface AttachedFile {
  id: number;
  name: string;
  size: number;
}

const TABS: Array<{ key: MentionTab; prefix: RegExp }> = [
  { key: 'personnes', prefix: /^@/ },
  { key: 'taches',    prefix: /^@@/ },
  { key: 'documents', prefix: /^@@@/ },
  { key: 'canaux',    prefix: /^#/ },
];

function pickPrefixToken(word: string): { tab: MentionTab; query: string } | null {
  for (const { key, prefix } of TABS) {
    if (prefix.test(word)) {
      return { tab: key, query: word.replace(prefix, '') };
    }
  }
  return null;
}

/**
 * Comment composer — port of the prototype's `composer()` helper.
 *
 * - contenteditable with a placeholder
 * - file input (paperclip) + file chips
 * - emoji button → floating <app-emoji-picker>
 * - @ button → floating <app-mention-picker>
 * - typing @, @@, @@@ or # opens the mention picker on the matching tab
 * - "Parcourir" in the mention picker opens the deep-search <app-browse-mentions-modal>
 * - Enter to send (Shift+Enter for newline), Esc to close any popover
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
          <button class="cc__send" title="Envoyer" (click)="send()">
            <app-icon name="send" [size]="17" />
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
    .cc__ed { padding: 12px 14px 4px; font-size: 14px; color: var(--nx-text);
      line-height: 1.5; min-height: 22px; max-height: 140px; overflow-y: auto; outline: none; }
    .cc__ed:empty::before { content: attr(data-ph); color: var(--nx-text-400); pointer-events: none; }
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
    .cc__pop { position: absolute; z-index: 30; }
    .cc__pop--mention { left: 0; right: 0; bottom: calc(100% + 8px); }
    .cc__pop--emoji   { right: 0; bottom: calc(100% + 8px); }
  `],
})
export class CommentComposerComponent implements AfterViewInit {
  @Input() placeholder = 'Commentez, mentionnez avec @, @@, @@@ ou #…';
  @Output() submitted = new EventEmitter<{ text: string; files: AttachedFile[] }>();

  @ViewChild('editable', { static: true }) editable!: ElementRef<HTMLDivElement>;

  protected readonly files = signal<AttachedFile[]>([]);
  protected readonly mentionOpen = signal(false);
  protected readonly emojiOpen = signal(false);
  protected readonly browseOpen = signal(false);
  protected readonly activeTab = signal<MentionTab>('personnes');
  /** Text typed after the @|@@|@@@|# prefix — pre-fills the picker filter. */
  protected readonly filterQuery = signal('');

  private nextFileId = 1;
  private get editableEl(): HTMLDivElement { return this.editable.nativeElement; }

  ngAfterViewInit(): void { /* placeholder for future autofocus / saved-draft restore */ }

  protected toggleMention(): void {
    this.emojiOpen.set(false);
    const wasOpen = this.mentionOpen();
    this.mentionOpen.set(!wasOpen);
    if (!wasOpen) this.filterQuery.set('');
  }

  protected toggleEmoji(): void {
    this.mentionOpen.set(false);
    this.emojiOpen.update(v => !v);
  }

  @HostListener('document:keydown.escape') onEsc(): void {
    if (this.browseOpen()) this.browseOpen.set(false);
    else if (this.mentionOpen()) this.mentionOpen.set(false);
    else if (this.emojiOpen()) this.emojiOpen.set(false);
  }

  protected onInput(): void {
    const txt = this.editableEl.textContent ?? '';
    const lastWord = (txt.split(/\s/).pop() || '');
    const parsed = pickPrefixToken(lastWord);
    if (parsed) {
      this.activeTab.set(parsed.tab);
      this.filterQuery.set(parsed.query);
      this.mentionOpen.set(true);
      this.emojiOpen.set(false);
    } else {
      this.mentionOpen.set(false);
    }
  }

  protected onKey(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.send();
    }
  }

  protected onFilePicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const list = Array.from(input.files ?? []);
    if (list.length === 0) return;
    const additions: AttachedFile[] = list.map(f => ({
      id: this.nextFileId++,
      name: f.name,
      size: f.size,
    }));
    this.files.update(prev => [...prev, ...additions]);
    input.value = '';
  }

  protected removeFile(id: number): void {
    this.files.update(prev => prev.filter(f => f.id !== id));
  }

  protected onMentionPicked(p: { tab: MentionTab; token: string }): void {
    this.insertToken(p.token);
    this.mentionOpen.set(false);
  }

  protected onBrowsePicked(p: { tab: MentionTab; token: string }): void {
    this.insertToken(p.token);
    this.browseOpen.set(false);
  }

  protected onEmojiPicked(glyph: string): void {
    this.insertText(glyph);
    this.emojiOpen.set(false);
  }

  protected openBrowse(tab: MentionTab): void {
    this.activeTab.set(tab);
    this.browseOpen.set(true);
    this.mentionOpen.set(false);
  }

  protected send(): void {
    const text = (this.editableEl.textContent ?? '').trim();
    const files = this.files();
    if (!text && files.length === 0) return;
    this.submitted.emit({ text, files });
    this.editableEl.textContent = '';
    this.files.set([]);
    this.mentionOpen.set(false);
    this.emojiOpen.set(false);
  }

  private insertToken(token: string): void {
    // Strip the active prefix from the current word, then insert the canonical token + a space.
    const txt = this.editableEl.textContent ?? '';
    const before = txt.replace(/\S*$/, '');
    this.editableEl.textContent = before;
    this.insertText(token + ' ');
    this.mentionOpen.set(false);
  }

  private insertText(text: string): void {
    this.editableEl.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      this.editableEl.appendChild(document.createTextNode(text));
    }
  }
}
