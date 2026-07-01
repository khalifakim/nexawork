import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';

/**
 * Interim body for sections delivered in a later phase. Styled with the design
 * system so navigation reads as complete while the real view is built.
 */
@Component({
  selector: 'app-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ph">
      <div class="ph__head">
        <h1>{{ title() }}</h1>
        <p>Cet écran est en cours de construction et sera livré dans une prochaine itération.</p>
      </div>
      <div class="ph__card">
        <span class="ph__icon"><app-icon name="sparkle" [size]="26" /></span>
        <div class="ph__t">{{ title() }}</div>
        <div class="ph__s">Disposition à détailler — fidèle au prototype NexaWork.</div>
      </div>
    </div>
  `,
  styles: [`
    .ph { flex: 1; min-height: 0; overflow-y: auto; padding: 28px 32px; }
    .ph__head h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -.02em; color: var(--nx-text); }
    .ph__head p { margin: 0 0 22px; font-size: 14px; color: var(--nx-text-500); }
    .ph__card { background: var(--nx-surface); border: 1px solid var(--nx-border-card); border-radius: var(--nx-r-card);
                box-shadow: var(--nx-shadow-rest); padding: 48px; display: flex; flex-direction: column;
                align-items: center; gap: 10px; text-align: center; }
    .ph__icon { width: 56px; height: 56px; border-radius: 16px; background: var(--nx-indigo-50); color: var(--nx-indigo);
                display: flex; align-items: center; justify-content: center; }
    .ph__t { font-size: 16px; font-weight: 700; color: var(--nx-text); margin-top: 6px; }
    .ph__s { font-size: 13px; color: var(--nx-text-500); }
  `],
})
export class PlaceholderComponent {
  private route = inject(ActivatedRoute);
  title = toSignal(this.route.data.pipe(map(d => (d['title'] as string) ?? 'Section')), { initialValue: 'Section' });
}
