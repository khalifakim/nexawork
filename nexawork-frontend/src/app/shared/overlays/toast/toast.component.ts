import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ToastService } from '@core/services/toast.service';
import { IconComponent } from '@shared/ui/icon/icon.component';

/**
 * App-wide toast slot. Mounted at the root (`AppComponent`) so it can render
 * above any layout, including during route transitions. Replicates the
 * `notifyGed` toast style used across the prototype.
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (current(); as t) {
      <div class="toast" role="status">
        <span class="toast__i"><app-icon [name]="t.icon ?? 'check'" [size]="14" /></span>
        <span class="toast__t">{{ t.message }}</span>
        <button class="toast__x" (click)="dismiss()" aria-label="Fermer"><app-icon name="x" [size]="14" /></button>
      </div>
    }
  `,
  styles: [`
    .toast { position: fixed; right: 24px; top: 72px; z-index: 220; display: flex; align-items: center; gap: 11px;
      padding: 12px 16px; background: #16131F; color: #fff; border-radius: 11px;
      box-shadow: 0 14px 40px rgba(20,15,40,.4); animation: nxFadeIn .2s ease; max-width: 90vw; }
    .toast__i { width: 24px; height: 24px; flex: none; border-radius: 50%;
      background: rgba(43,182,115,.22); color: #34D88A; display: flex; align-items: center; justify-content: center; }
    .toast__t { font-size: 13.5px; font-weight: 600; }
    .toast__x { width: 24px; height: 24px; flex: none; margin-left: 4px; border: none; border-radius: 6px;
      background: transparent; color: rgba(255,255,255,.6); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .toast__x:hover { color: #fff; }
  `],
})
export class ToastComponent {
  private readonly toast = inject(ToastService);
  protected readonly current = this.toast.current;

  protected readonly iconName = computed(() => this.current()?.icon ?? 'check');

  dismiss(): void { this.toast.dismiss(); }
}
