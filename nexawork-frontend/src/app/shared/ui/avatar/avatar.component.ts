import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Round (or squared, for teams) avatar with initials, a brand color and an
 * optional green presence dot — per the design system.
 *
 * When `photoUrl` is provided, the initials background is replaced by the
 * image (kept round via border-radius); the presence dot still overlays.
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="av" [style.width.px]="size" [style.height.px]="size">
      @if (photoUrl) {
        <img class="av__img" [class.av__img--square]="square" [src]="photoUrl" alt="" />
      } @else {
        <span class="av__c" [class.av__c--square]="square"
              [style.background]="color" [style.font-size.px]="fontSize">{{ initials }}</span>
      }
      @if (online) {
        <span class="av__dot" [style.border-color]="ring"></span>
      }
    </span>
  `,
  styles: [`
    .av { position: relative; display: inline-flex; flex: none; }
    .av__c { width: 100%; height: 100%; border-radius: 50%; color: #fff; font-weight: 700;
             display: flex; align-items: center; justify-content: center; }
    .av__c--square { border-radius: 28%; }
    .av__img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; }
    .av__img--square { border-radius: 28%; }
    .av__dot { position: absolute; bottom: -1px; right: -1px; width: 30%; height: 30%;
               min-width: 9px; min-height: 9px; max-width: 13px; max-height: 13px;
               border-radius: 50%; background: var(--nx-success); border: 2px solid #fff; }
  `],
})
export class AvatarComponent {
  @Input() name = '';
  @Input() size = 36;
  @Input() color = '#86828E';
  @Input() online = false;
  @Input() square = false;
  /** Presence-dot ring color (matches the surface the avatar sits on). */
  @Input() ring = '#fff';
  /** Optional photo URL. When set, replaces the initials disk. */
  @Input() photoUrl: string | null = null;

  get fontSize(): number { return Math.max(9, Math.round(this.size * 0.4)); }

  get initials(): string {
    return this.name.split(/\s+/).map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
  }
}
