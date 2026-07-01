import { ChangeDetectionStrategy, Component, EventEmitter, Output, signal } from '@angular/core';

/**
 * The four categories of emojis used by the comment composer — mirrors the
 * prototype's `emojiList()` helper. Each entry is the unicode glyph (no
 * external library — keeps the bundle slim and works in every browser).
 */
const EMOJI_CATEGORIES: Array<{ label: string; glyphs: string[] }> = [
  { label: 'Réactions', glyphs: ['👍', '👏', '🙏', '👌', '✅', '🎉', '🔥', '💯', '⭐', '❤️', '🤝', '👀'] },
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
        @for (g of categories[active()].glyphs; track g) {
          <button class="ep__g" (click)="pick(g)">{{ g }}</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .ep { width: 296px; max-height: 296px; display: flex; flex-direction: column;
      background: #fff; border-radius: 12px; border: 1px solid var(--nx-border);
      box-shadow: 0 12px 32px rgba(20,15,40,.18); overflow: hidden; }
    .ep__tabs { display: flex; gap: 2px; padding: 6px; border-bottom: 1px solid var(--nx-border-card); background: var(--nx-surface-3); }
    .ep__t { flex: 1; height: 28px; border: none; border-radius: 7px; background: transparent; color: var(--nx-text-500);
      font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; }
    .ep__t--on { background: #fff; color: var(--nx-text); box-shadow: 0 1px 3px rgba(20,15,40,.08); }
    .ep__grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; padding: 8px; overflow-y: auto; }
    .ep__g { height: 32px; border: none; border-radius: 7px; background: transparent; font-size: 19px; line-height: 1;
      cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .ep__g:hover { background: var(--nx-surface-2); }
  `],
})
export class EmojiPickerComponent {
  @Output() selected = new EventEmitter<string>();

  protected readonly categories = EMOJI_CATEGORIES;
  protected readonly active = signal(0);

  pick(g: string): void { this.selected.emit(g); }
}
