import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Renders a text string with all case-insensitive occurrences of `query`
 * wrapped in a `<mark>` element. Used by the canal / conversation views to
 * highlight matches of the header search query in real time.
 *
 * Empty / whitespace-only queries render the text untouched.
 */
@Component({
  selector: 'app-highlight',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!q) {
      {{ text }}
    } @else {
      @for (seg of segments; track $index) {
        @if (seg.match) {
          <mark class="hl">{{ seg.text }}</mark>
        } @else {
          <span>{{ seg.text }}</span>
        }
      }
    }
  `,
  styles: [`
    :host { display: contents; }
    .hl { background: #FEE79A; color: inherit; padding: 0 1px; border-radius: 3px; font-weight: inherit; }
  `],
})
export class HighlightComponent {
  @Input() text = '';
  @Input() set query(v: string | null | undefined) { this._q = (v ?? '').trim(); }
  private _q = '';

  protected get q(): string { return this._q; }

  /** Case-insensitive split of `text` into alternating {match, text} segments. */
  protected get segments(): { match: boolean; text: string }[] {
    const q = this._q;
    if (!q) return [{ match: false, text: this.text }];
    const src = this.text ?? '';
    const lower = src.toLowerCase();
    const lq = q.toLowerCase();
    const parts: { match: boolean; text: string }[] = [];
    let i = 0;
    while (i < src.length) {
      const idx = lower.indexOf(lq, i);
      if (idx < 0) { parts.push({ match: false, text: src.slice(i) }); break; }
      if (idx > i) parts.push({ match: false, text: src.slice(i, idx) });
      parts.push({ match: true, text: src.slice(idx, idx + lq.length) });
      i = idx + lq.length;
    }
    return parts;
  }
}
