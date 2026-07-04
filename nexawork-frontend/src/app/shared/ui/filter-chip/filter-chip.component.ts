import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

export interface FilterOption { value: string; label: string; dot?: string; }

/**
 * Dropdown filter chip — faithful reproduction of the prototype `filterChip`.
 * Shows the selected option's label when set (indigo state), a "Tous" reset
 * entry at the top of the menu, and an inline clear (×) on the active chip.
 */
@Component({
  selector: 'app-filter-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="fc">
      <button class="fc__btn" [class.fc__btn--on]="hasVal" (click)="toggle($event)">
        <span class="fc__lbl">{{ displayLabel }}</span>
        @if (hasVal) {
          <span class="fc__x" (click)="clear($event)"><app-icon name="x" [size]="13" [stroke]="2.4" /></span>
        } @else {
          <app-icon class="fc__cv" name="chevronDown" [size]="13" [stroke]="2.4" />
        }
      </button>
      @if (open()) {
        <div class="fc__bd" (click)="open.set(false)"></div>
        <div class="fc__dd">
          <button class="fc__opt" [class.fc__opt--on]="!hasVal" (click)="pick(null)">Tous</button>
          @for (o of options; track o.value) {
            <button class="fc__opt" [class.fc__opt--on]="value === o.value" (click)="pick(o.value)">
              @if (o.dot) { <span class="fc__dot" [style.background]="o.dot"></span> }
              <span>{{ o.label }}</span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .fc { position: relative; }
    .fc__btn { display: flex; align-items: center; gap: 7px; height: 34px; padding: 0 13px; border: 1px solid #DDD9D1; border-radius: 8px; background: #fff; color: #56525c; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
    .fc__btn--on { border-color: #5B5FE9; background: rgba(91,95,233,.06); color: #5B5FE9; font-weight: 600; }
    .fc__cv { color: #9b97a3; display: flex; }
    .fc__x { display: flex; align-items: center; margin-left: 2px; cursor: pointer; }
    .fc__bd { position: fixed; inset: 0; z-index: 44; }
    .fc__dd { position: absolute; top: 40px; left: 0; z-index: 45; min-width: 200px; background: #fff; border-radius: 12px; border: 1px solid #ECEAE4; box-shadow: 0 12px 34px rgba(20,15,40,.18); padding: 5px; max-height: 260px; overflow-y: auto; }
    .fc__opt { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: none; border-radius: 8px; background: transparent; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; color: #46434e; text-align: left; }
    .fc__opt:hover { background: #F4F2ED; }
    .fc__opt--on { background: #F4F2ED; font-weight: 600; }
    .fc__dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  `],
})
export class FilterChipComponent {
  @Input() label = '';
  @Input() options: FilterOption[] = [];
  @Input() value: string | null = null;
  @Output() valueChange = new EventEmitter<string | null>();

  open = signal(false);

  get hasVal(): boolean { return this.value != null; }
  get displayLabel(): string {
    if (this.value == null) return this.label;
    return this.options.find(o => o.value === this.value)?.label ?? this.label;
  }

  toggle(ev: Event): void { ev.stopPropagation(); this.open.set(!this.open()); }
  clear(ev: Event): void { ev.stopPropagation(); this.open.set(false); this.valueChange.emit(null); }
  pick(v: string | null): void { this.open.set(false); this.valueChange.emit(v); }
}
