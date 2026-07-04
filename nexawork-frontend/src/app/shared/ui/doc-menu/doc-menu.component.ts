import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** One entry in the document row menu. */
export interface DocMenuItem {
  action: string;   // emitted on click
  label: string;
  icon: string;     // icon glyph name
  danger?: boolean; // red destructive styling
  sep?: boolean;    // render a separator *before* this item
}

/**
 * Reusable "⋯" document row menu — faithful to the prototype's `docRowMenu`
 * / `gedRowMenu`. Renders a fixed backdrop + a right-aligned popover. The
 * parent supplies the item list and handles the emitted `action`.
 *
 *   <app-doc-menu [items]="menuItems" (action)="onAction($event)" (closed)="menu.set(null)" />
 */
@Component({
  selector: 'app-doc-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="bd" (click)="close($event)"></div>
    <div class="menu" (click)="$event.stopPropagation()">
      @for (it of items; track it.action) {
        @if (it.sep) { <div class="sep"></div> }
        <button class="item" [class.item--danger]="it.danger" (click)="pick(it.action, $event)">
          <span class="item__i"><app-icon [name]="it.icon" [size]="16" /></span>
          <span class="item__l">{{ it.label }}</span>
        </button>
      }
    </div>
  `,
  styles: [`
    .bd { position: fixed; inset: 0; z-index: 44; background: transparent; }
    .menu { position: absolute; top: 36px; right: 0; z-index: 45; width: 230px; background: #fff;
      border-radius: 12px; border: 1px solid var(--nx-border-card); box-shadow: 0 12px 34px rgba(20,15,40,.18); padding: 5px; }
    .item { width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 11px;
      padding: 8px 11px; border: none; border-radius: 8px; background: transparent; cursor: pointer;
      font-family: inherit; font-size: 13.5px; font-weight: 500; color: var(--nx-text-600); text-align: left; }
    .item__i { display: flex; flex: none; color: var(--nx-text-500); }
    .item:hover { background: var(--nx-surface-2); }
    .item--danger { color: var(--nx-danger); }
    .item--danger .item__i { color: var(--nx-danger); }
    .item--danger:hover { background: rgba(245,86,78,.06); }
    .sep { height: 1px; background: var(--nx-border-card); margin: 4px 7px; }
  `],
})
export class DocMenuComponent {
  @Input({ required: true }) items: DocMenuItem[] = [];
  @Output() action = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  pick(action: string, ev: Event): void {
    ev.stopPropagation();
    this.action.emit(action);
    this.closed.emit();
  }
  close(ev: Event): void { ev.stopPropagation(); this.closed.emit(); }
}
