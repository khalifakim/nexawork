import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

/**
 * Centered overlay shell (matches `gedModalShell` from the prototype): dimmed
 * backdrop, rounded white panel, header (title + optional subtitle + close),
 * projected body and optional projected footer.
 *
 *   <app-modal-shell title="…" subtitle="…" [width]="520" (closed)="...">
 *     body…
 *     <div footer>…</div>
 *   </app-modal-shell>
 */
@Component({
  selector: 'app-modal-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" [style.align-items]="align" (click)="closed.emit()">
      <div class="panel" [style.width.px]="width" (click)="$event.stopPropagation()">
        <div class="head">
          <div class="head__t">
            <div class="head__title">{{ title }}</div>
            @if (subtitle) { <div class="head__sub">{{ subtitle }}</div> }
          </div>
          <button class="x" (click)="closed.emit()"><app-icon name="x" [size]="16" /></button>
        </div>
        <div class="body"><ng-content></ng-content></div>
        @if (hasFooter) {
          <div class="foot"><ng-content select="[footer]"></ng-content></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .ov { position: fixed; inset: 0; z-index: var(--nx-z-modal); background: rgba(22,19,31,.5);
      backdrop-filter: blur(2px); display: flex; justify-content: center; padding-top: 60px; }
    .panel { max-width: 94vw; max-height: 85vh; background: #fff; border-radius: var(--nx-r-panel);
      box-shadow: var(--nx-shadow-modal); display: flex; flex-direction: column; overflow: hidden; animation: nxFade .18s ease; }
    .head { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 14px; border-bottom: 1px solid var(--nx-border-card); flex: none; }
    .head__t { flex: 1; min-width: 0; }
    .head__title { font-size: 16px; font-weight: 700; letter-spacing: -.01em; }
    .head__sub { font-size: 12.5px; color: var(--nx-text-500); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .x { width: 30px; height: 30px; flex: none; border: none; border-radius: 8px; background: transparent; color: var(--nx-text-400); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .x:hover { background: var(--nx-surface-2); }
    .body { padding: 18px 20px; overflow-y: auto; }
    .foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--nx-border-card); flex: none; }
  `],
})
export class ModalShellComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() width = 520;
  /** vertical alignment of the panel within the overlay */
  @Input() align: 'flex-start' | 'center' = 'flex-start';
  @Input() hasFooter = true;
  @Output() closed = new EventEmitter<void>();
}
