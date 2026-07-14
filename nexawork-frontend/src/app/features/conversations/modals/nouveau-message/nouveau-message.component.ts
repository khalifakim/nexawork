import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { MembersService } from '@core/services/members.service';
import { Member } from '@core/models/member.models';
import { slugName } from '@core/util/ui.util';

@Component({
  selector: 'app-nouveau-message',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent, AvatarComponent],
  template: `
    <app-modal-shell title="Nouveau message" [width]="460" [hasFooter]="false" (closed)="closed.emit()">
      <div class="search">
        <app-icon name="search" [size]="17" [stroke]="2" />
        <input autofocus placeholder="À : nom d'un membre…" [value]="q()" (input)="q.set($any($event.target).value)" />
      </div>
      <div class="lbl">Suggestions</div>
      @if (sugg().length) {
        <div class="list">
          @for (m of sugg(); track m.name) {
            <button class="row" (click)="open(m.name)">
              <app-avatar [name]="m.name" [color]="m.color" [size]="38" [online]="m.online" [photoUrl]="m.photoUrl" />
              <div class="b"><div class="n">{{ m.name }}</div><div class="r">{{ m.role }}{{ m.online ? ' · En ligne' : '' }}</div></div>
              <app-icon class="ar" name="chevronRight" [size]="16" />
            </button>
          }
        </div>
      } @else { <div class="empty">Aucun membre trouvé</div> }
    </app-modal-shell>
  `,
  styles: [`
    .search { display: flex; align-items: center; gap: 9px; height: 44px; padding: 0 13px; background: #fff; border: 1px solid var(--nx-indigo); border-radius: 11px; margin-bottom: 16px; }
    .search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 14px; color: var(--nx-text); }
    .lbl { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--nx-text-400); padding: 0 2px 8px; }
    .list { display: flex; flex-direction: column; gap: 2px; }
    .row { display: flex; align-items: center; gap: 12px; width: 100%; box-sizing: border-box; padding: 9px 10px; border: none; border-radius: 10px; background: transparent; cursor: pointer; font-family: inherit; text-align: left; }
    .row:hover { background: var(--nx-surface-2); }
    .b { flex: 1; min-width: 0; }
    .n { font-size: 14px; font-weight: 600; color: var(--nx-text); }
    .r { font-size: 12.5px; color: var(--nx-text-500); }
    .ar { color: #c2bfb6; flex: none; }
    .empty { padding: 24px; text-align: center; font-size: 13px; color: var(--nx-text-400); }
  `],
})
export class NouveauMessageComponent {
  @Output() closed = new EventEmitter<void>();
  private router = inject(Router);
  private members = inject(MembersService);
  q = signal('');
  private pool = toSignal(this.members.others(), { initialValue: [] as Member[] });
  sugg = computed(() => {
    const q = this.q().toLowerCase().trim();
    return this.pool().filter(m => m.name.toLowerCase().includes(q));
  });
  open(name: string): void { this.closed.emit(); this.router.navigate(['/app/conversations', slugName(name)]); }
}
