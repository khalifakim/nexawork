import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    @if (src) {
      <img [src]="src" [alt]="name" class="rounded-circle object-fit-cover"
        [style.width.px]="size" [style.height.px]="size" />
    } @else {
      <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
        [style.width.px]="size" [style.height.px]="size"
        [style.background-color]="color"
        [style.font-size.px]="size * 0.4">
        {{ initials }}
      </div>
    }
  `,
})
export class AvatarComponent {
  @Input() name = '';
  @Input() src?: string;
  @Input() size = 36;

  get initials(): string {
    return this.name.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
  }

  get color(): string {
    const colors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed'];
    const idx = this.name.charCodeAt(0) % colors.length;
    return colors[idx];
  }
}
