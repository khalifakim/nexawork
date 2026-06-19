import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    @if (count > 0) {
      <span class="badge rounded-pill"
        [class]="'bg-' + variant"
        [style.font-size.px]="10">
        {{ count > 99 ? '99+' : count }}
      </span>
    }
  `,
})
export class BadgeComponent {
  @Input() count = 0;
  @Input() variant: 'danger' | 'primary' | 'warning' | 'success' = 'danger';
}
