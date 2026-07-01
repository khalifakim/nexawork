import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICON_PATHS } from './icon-paths';

/**
 * Line-icon renderer. Use `name` for a registered glyph or `path` for a raw
 * SVG path. Stroke defaults to 1.9 (design-system rule: line icons only).
 *
 *   <app-icon name="search" [size]="16" />
 *   <app-icon [path]="customPath" [size]="18" [stroke]="2" />
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="nx-ic" [style.width.px]="size" [style.height.px]="size" [innerHTML]="svg"></span>`,
  styles: [`
    .nx-ic { display: inline-flex; align-items: center; justify-content: center; }
    .nx-ic ::ng-deep svg { display: block; width: 100%; height: 100%; }
  `],
})
export class IconComponent implements OnChanges {
  @Input() name = '';
  @Input() path = '';
  @Input() size = 18;
  @Input() stroke = 1.9;
  @Input() fill = false;
  svg: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    const body = this.path || ICON_PATHS[this.name] || '';
    const fill = this.fill ? 'currentColor' : 'none';
    const html =
      `<svg viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" ` +
      `stroke-width="${this.stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    this.svg = this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
