import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * NexaWork brand mark (three overlapping multiply circles) + optional wordmark.
 * `onDark` adds the white base so the mark stays legible on the ink chrome.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo" [class.logo--stacked]="stacked">
      <svg class="mark" [attr.width]="markSize" [attr.height]="markSize" viewBox="0 0 120 120">
        <g style="isolation:isolate">
          @if (onDark) {
            <circle cx="60" cy="43" r="25" fill="#fff"></circle>
            <circle cx="43" cy="73" r="25" fill="#fff"></circle>
            <circle cx="77" cy="73" r="25" fill="#fff"></circle>
          }
          <circle cx="60" cy="43" r="25" fill="#5B5FE9" style="mix-blend-mode:multiply"></circle>
          <circle cx="43" cy="73" r="25" fill="#2BB673" style="mix-blend-mode:multiply"></circle>
          <circle cx="77" cy="73" r="25" fill="#F2693C" style="mix-blend-mode:multiply"></circle>
        </g>
      </svg>
      @if (wordmark) {
        <span class="word" [style.font-size.px]="fontSize" [style.color]="textColor">nexa<span [style.color]="accentColor">work.</span></span>
      }
    </span>
  `,
  styles: [`
    .logo { display: inline-flex; align-items: center; gap: 11px; line-height: 1; }
    .logo--stacked { flex-direction: column; gap: 8px; }
    .word { font-weight: 700; letter-spacing: -.04em; white-space: nowrap; }
  `],
})
export class LogoComponent {
  @Input() markSize = 28;
  @Input() fontSize = 20;
  @Input() wordmark = true;
  @Input() stacked = false;
  @Input() onDark = false;

  get textColor(): string { return this.onDark ? '#fff' : '#16131F'; }
  get accentColor(): string { return this.onDark ? '#7E81F2' : '#5B5FE9'; }
}
