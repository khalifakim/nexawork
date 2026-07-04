import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MentionTab } from '@core/models/mention.models';

const ICON_PATH: Record<'task' | 'doc' | 'channel', string> = {
  task: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  doc:  '<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M13 3v6h6"/>',
  channel: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
};

const ACCENT = '#5B5FE9';

export type MentionChipEvent =
  | { type: 'person';   name: string }
  | { type: 'task';     id: string }
  | { type: 'document'; name: string }
  | { type: 'channel';  slug: string };

/**
 * Renders a mention as a clickable token. Plain coloured text for `@person`,
 * styled chip for `@@task` / `@@@doc` / `#channel`. Clicking a chip emits
 * an event the parent uses to open the right preview modal or navigate to
 * the channel.
 */
@Component({
  selector: 'app-mention-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (tab === 'personnes') {
      <span class="mc mc--person" [class.mc--on-dark]="onDark" (click)="onClick($event)">@{{ value }}</span>
    } @else {
      <span class="mc mc--chip" [class.mc--task]="tab === 'taches'" [style.background]="palette.bg" [style.color]="palette.fg" (click)="onClick($event)">
        @if (tab === 'taches') { <span class="mc__ic"><app-icon name="taskCheck" [size]="12" [stroke]="2.1" /></span> }
        @else if (tab === 'documents') { <span class="mc__ic"><app-icon name="file" [size]="12" [stroke]="2.1" /></span> }
        <span class="mc__lbl">{{ label }}</span>
      </span>
    }
  `,
  styles: [`
    .mc { cursor: pointer; }
    .mc--person { color: var(--nx-indigo, #5B5FE9); font-weight: 600; }
    .mc--person.mc--on-dark { color: #fff; text-decoration: underline; text-underline-offset: 2px; }
    .mc--chip { display: inline-flex; align-items: center; gap: 4px; vertical-align: baseline;
      height: 20px; padding: 0 7px 0 5px; margin: 0 1px; border-radius: 6px;
      font-size: 12.5px; font-weight: 600; white-space: nowrap; }
    .mc--chip.mc--task { font-family: var(--nx-mono, 'JetBrains Mono', monospace); }
    .mc__ic { display: flex; flex: none; line-height: 0; }
    .mc__lbl { line-height: 1; }
  `],
})
export class MentionChipComponent {
  @Input({ required: true }) tab!: Exclude<MentionTab, 'personnes'> | 'personnes';
  @Input({ required: true }) value!: string;
  /** Render on a dark bubble (white person mention). */
  @Input() onDark = false;
  @Output() opened = new EventEmitter<MentionChipEvent>();

  get label(): string {
    // Strip any leading '#' in the stored value so the channel chip shows a single '#'.
    if (this.tab === 'canaux') return '#' + this.value.replace(/^#+/, '');
    return this.value;
  }

  get palette(): { bg: string; fg: string } {
    switch (this.tab) {
      case 'taches':    return { bg: 'rgba(91,95,233,.10)', fg: '#4B3FD6' };
      case 'documents': return { bg: 'rgba(58,169,224,.12)', fg: '#1f7fb0' };
      case 'canaux':    return { bg: 'rgba(43,182,115,.12)', fg: '#1f8a55' };
      default:          return { bg: 'transparent', fg: ACCENT };
    }
  }

  onClick(ev: Event): void {
    ev.stopPropagation();
    if (this.tab === 'personnes') this.opened.emit({ type: 'person',   name: this.value });
    else if (this.tab === 'taches')    this.opened.emit({ type: 'task',     id: this.value });
    else if (this.tab === 'documents') this.opened.emit({ type: 'document', name: this.value });
    else                                this.opened.emit({ type: 'channel',  slug: this.value });
  }
}
