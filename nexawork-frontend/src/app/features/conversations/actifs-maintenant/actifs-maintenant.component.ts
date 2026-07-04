import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { MembersService } from '@core/services/members.service';
import { Member } from '@core/models/member.models';
import { slugName } from '@core/util/ui.util';
import { ShellBus } from '@layouts/app-shell/shell.bus';

@Component({
  selector: 'app-actifs-maintenant',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <h1>En ligne</h1>
        <p>{{ online().length }} membres en ligne — lancez une discussion en un clic.</p>
      </div>
      <div class="list">
        @for (m of filteredOnline(); track m.name; let i = $index) {
          <div class="row" [class.row--first]="i===0">
            <span style="display:flex;align-items:center;gap:13px;flex:1;cursor:pointer" (click)="bus.openProfile(m.name)">
              <app-avatar [name]="m.name" [color]="m.color" [size]="36" [online]="true" />
              <span class="b"><span class="n">{{ m.name }}</span><span class="r">{{ m.role }}</span></span>
            </span>
            <button class="chat" (click)="chat(m.name)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/>
              </svg>Chat
            </button>
          </div>
        } @empty {
          <div class="empty">Aucun membre correspondant à « {{ bus.conversationSearch() }} ».</div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .wrap { flex: 1; min-height: 0; overflow-y: auto; padding: 24px 32px 32px; }
    .head { margin-bottom: 16px; }
    .head h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -.02em; }
    .head p { margin: 4px 0 0; font-size: 14px; color: var(--nx-text-500); }
    .list { background: #fff; border-radius: var(--nx-r-card); border: 1px solid var(--nx-border-card); overflow: hidden; }
    .row { display: flex; align-items: center; gap: 13px; padding: 13px 18px; border-top: 1px solid #F4F2ED; }
    .row--first { border-top: none; }
    .b { display: flex; flex-direction: column; }
    .n { font-size: 14px; font-weight: 600; }
    .r { font-size: 12.5px; color: var(--nx-text-500); }
    .chat { display: flex; align-items: center; gap: 7px; padding: 8px 14px; border: 1px solid var(--nx-indigo); border-radius: 8px; background: rgba(91,95,233,.06); color: var(--nx-indigo); font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
    .empty { padding: 24px 18px; text-align: center; font-size: 13px; color: var(--nx-text-400); }
  `],
})
export class ActifsMaintenantComponent {
  private router = inject(Router);
  private members = inject(MembersService);
  bus = inject(ShellBus);
  online = toSignal(this.members.online(), { initialValue: [] as Member[] });
  /** Members roster filtered by the shared conversations search query. */
  filteredOnline = computed<Member[]>(() => {
    const q = this.bus.conversationSearch().toLowerCase().trim();
    const list = this.online();
    if (!q) return list;
    return list.filter(m => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q));
  });
  chat(name: string): void { this.router.navigate(['/app/conversations', slugName(name)]); }
}
