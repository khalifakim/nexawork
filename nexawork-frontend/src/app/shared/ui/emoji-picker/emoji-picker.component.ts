import { ChangeDetectionStrategy, Component, EventEmitter, Output, signal } from '@angular/core';

/**
 * The four categories of emojis used by the comment composer — mirrors the
 * prototype's `emojiList()` helper. Each entry is the unicode glyph (no
 * external library — keeps the bundle slim and works in every browser).
 */
const EMOJI_CATEGORIES: Array<{ label: string; glyphs: string[] }> = [
  { label: 'Réactions', glyphs: [
    '👍', '👎', '👏', '🙏', '👌', '✅', '❌', '☑️', '❎',
    '🎉', '🔥', '💯', '⭐', '🌟', '✨', '❤️', '🧡', '💛',
    '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💖', '💗',
    '🤝', '👀', '💪', '🙌', '🫶', '🫡', '🤲', '👊', '✊',
    '💥', '💫', '🌈', '☀️', '🌙', '⚡', '💡', '🎯', '🏆',
    '🥇', '🥈', '🥉',
  ] },
  { label: 'Visages',    glyphs: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '🤩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥'] },
  { label: 'Gestes',     glyphs: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍', '💪'] },
  { label: 'Objets',     glyphs: ['📌', '📎', '📏', '📐', '✏', '✒', '🖊', '🖋', '🖌', '🖍', '📝', '📒', '📓', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📁', '📂', '🗂', '📅', '📆', '🗒', '🗓', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇', '📏', '📐', '✂', '🗃', '🗄', '🗑', '🔒', '🔓', '🔑', '🔨', '🛠', '⚙', '💻', '📱', '☎', '📞', '📟', '📠'] },
];

/**
 * Floating emoji grid. Toggled by the comment composer; selecting a glyph
 * inserts it into the composer and emits `selected`.
 */
@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ep" (click)="$event.stopPropagation()" role="dialog" aria-label="Choisir un emoji">
      <div class="ep__tabs">
        @for (cat of categories; track cat.label; let i = $index) {
          <button class="ep__t" [class.ep__t--on]="active() === i" (click)="active.set(i)">{{ cat.label }}</button>
        }
      </div>
      <div class="ep__grid">
        @for (g of categories[active()].glyphs; track $index) {
          <button class="ep__g" (click)="pick(g)">{{ g }}</button>
        }
      </div>
    </div>
  `,
  styles: [`
    /* Same footprint as the mention popup: full width of the composer, fixed
       height so switching between categories never resizes the popup. */
    .ep { width: 100%; height: 280px; display: flex; flex-direction: column;
      background: #fff; border-radius: 11px; border: 1px solid var(--nx-border);
      box-shadow: 0 16px 40px rgba(20,15,40,.18); overflow: hidden; }
    /* Tabs — no scrollbar of any kind; matches the mention picker layout. */
    .ep__tabs { flex: none; display: flex; gap: 2px; padding: 4px 12px 0;
      border-bottom: 1px solid var(--nx-border-card); overflow: hidden; }
    .ep__t { padding: 8px 10px; border: none; background: transparent;
      color: var(--nx-text-500); font-family: inherit; font-size: 12px; font-weight: 500;
      cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
      white-space: nowrap; }
    .ep__t--on { font-weight: 700; color: var(--nx-text); border-bottom-color: var(--nx-indigo); }
    /* The grid fills the remaining space and is the only scrollable area — vertical only. */
    .ep__grid { flex: 1; min-height: 0;
      display: grid; grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
      grid-auto-rows: 38px; gap: 2px; padding: 8px 10px;
      overflow-x: hidden; overflow-y: auto; }
    .ep__g { border: none; border-radius: 8px; background: transparent;
      font-size: 22px; line-height: 1; cursor: pointer;
      display: flex; align-items: center; justify-content: center; }
    .ep__g:hover { background: var(--nx-surface-2); }
  `],
})
export class EmojiPickerComponent {
  @Output() selected = new EventEmitter<string>();

  protected readonly categories = EMOJI_CATEGORIES;
  protected readonly active = signal(0);

  pick(g: string): void { this.selected.emit(g); }
}
