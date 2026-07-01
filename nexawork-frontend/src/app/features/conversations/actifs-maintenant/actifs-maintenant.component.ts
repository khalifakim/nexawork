import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { MembersService } from '@core/services/members.service';
import { Member } from '@core/models/member.models';
import { slugName } from '@core/util/ui.util';
import { ShellBus } from '@layouts/app-shell/shell.bus';

@Component({
  selector: 'app-actifs-maintenant',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AvatarComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <h1>Actifs maintenant</h1>
        <p>{{ online().length }} membres en ligne — lancez une discussion en un clic.</p>
      </div>
      <div class="search"><app-icon name="search" [size]="15" [stroke]="2" /><span>Filtrer les membres…</span></div>
      <div class="list">
        @for (m of online(); track m.name; let i = $index) {
          <div class="row" [class.row--first]="i===0">
            <span style="display:flex;align-items:center;gap:13px;flex:1;cursor:pointer" (click)="bus.openProfile(m.name)">
              <app-avatar [name]="m.name" [color]="m.color" [size]="36" [online]="true" />
              <span class="b"><span class="n">{{ m.name }}</span><span class="r">{{ m.role }}</span></span>
            </span>
            <button class="chat" (click)="chat(m.name)"><app-icon name="comment" [size]="14" [stroke]="2" />Chat</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .wrap { flex: 1; overflow-y: auto; padding: 24px 32px 32px; }
    .head { margin-bottom: 16px; }
    .head h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -.02em; }
    .head p { margin: 4px 0 0; font-size: 14px; color: var(--nx-text-500); }
    .search { display: flex; align-items: center; gap: 8px; height: 38px; max-width: 340px; padding: 0 13px; border-radius: 9px; background: #fff; border: 1px solid var(--nx-border); color: var(--nx-text-400); font-size: 13px; margin-bottom: 16px; }
    .list { background: #fff; border-radius: var(--nx-r-card); border: 1px solid var(--nx-border-card); overflow: hidden; }
    .row { display: flex; align-items: center; gap: 13px; padding: 13px 18px; border-top: 1px solid #F4F2ED; }
    .row--first { border-top: none; }
    .b { display: flex; flex-direction: column; }
    .n { font-size: 14px; font-weight: 600; }
    .r { font-size: 12.5px; color: var(--nx-text-500); }
    .chat { display: flex; align-items: center; gap: 7px; padding: 8px 14px; border: 1px solid var(--nx-indigo); border-radius: 8px; background: rgba(91,95,233,.06); color: var(--nx-indigo); font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
  `],
})
export class ActifsMaintenantComponent {
  private router = inject(Router);
  private members = inject(MembersService);
  bus = inject(ShellBus);
  online = toSignal(this.members.online(), { initialValue: [] as Member[] });
  chat(name: string): void { this.router.navigate(['/app/conversations', slugName(name)]); }
}
