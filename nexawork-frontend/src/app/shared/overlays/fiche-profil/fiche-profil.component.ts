import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { MembersService } from '@core/services/members.service';
import { Member } from '@core/models/member.models';
import { slugName } from '@core/util/ui.util';

const EMPTY_MEMBER: Member = { name: '', color: '#86828E', role: '', email: '', online: false, projects: [] };

@Component({
  selector: 'app-fiche-profil',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AvatarComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="card" (click)="$event.stopPropagation()">
        <div class="head">
          <app-avatar [name]="m().name" [color]="m().color" [size]="52" [online]="m().online" />
          <div class="t"><div class="nm">{{ m().name }}</div><div class="rl">{{ m().role }}</div></div>
          <button class="x" (click)="closed.emit()"><app-icon name="x" [size]="16" /></button>
        </div>
        <div class="sep"></div>
        <div class="info">
          <div class="ir"><app-icon name="clock" [size]="17" /><span>{{ m().online ? 'En ligne' : 'Hors ligne · vu récemment' }}</span></div>
          <div class="ir"><app-icon name="mail" [size]="17" /><span>{{ m().email }}</span></div>
          @if (m().projects.length) {
            <div class="pj">
              <div class="pj__l"><app-icon name="teams" [size]="17" />Projets assignés</div>
              <div class="pj__c">@for (p of m().projects; track p) { <span class="tag">{{ p }}</span> }</div>
            </div>
          }
        </div>
        <div class="foot"><button class="discuter" (click)="discuter()"><app-icon name="comment" [size]="16" [stroke]="2" />Discuter</button></div>
      </div>
    </div>
  `,
  styles: [`
    .ov { position: fixed; inset: 0; z-index: var(--nx-z-modal); background: rgba(22,19,31,.5); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 40px; }
    .card { width: 340px; max-width: 92vw; background: #fff; border-radius: 16px; box-shadow: var(--nx-shadow-modal); border: 1px solid var(--nx-border-card); overflow: hidden; animation: nxFade .18s ease; }
    .head { display: flex; align-items: center; gap: 14px; padding: 20px 18px 16px; }
    .t { flex: 1; min-width: 0; }
    .nm { font-size: 18px; font-weight: 700; letter-spacing: -.01em; }
    .rl { font-size: 12.5px; color: var(--nx-text-500); margin-top: 2px; }
    .x { width: 30px; height: 30px; flex: none; align-self: flex-start; border: none; border-radius: 8px; background: transparent; color: var(--nx-text-400); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .x:hover { background: var(--nx-surface-2); }
    .sep { height: 1px; background: var(--nx-border-card); margin: 0 18px; }
    .info { padding: 16px 18px; display: flex; flex-direction: column; gap: 13px; }
    .ir { display: flex; align-items: center; gap: 11px; color: var(--nx-text-600); font-size: 13.5px; }
    .ir app-icon { color: var(--nx-text-400); flex: none; }
    .pj__l { display: flex; align-items: center; gap: 11px; color: var(--nx-text-500); font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
    .pj__l app-icon { color: var(--nx-text-400); }
    .pj__c { display: flex; flex-wrap: wrap; gap: 6px; padding-left: 28px; }
    .tag { font-size: 12px; font-weight: 600; color: var(--nx-text-700); background: var(--nx-surface-2); padding: 4px 10px; border-radius: 7px; }
    .foot { display: flex; gap: 10px; padding: 0 18px 18px; }
    .discuter { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; border: 1px solid var(--nx-border); border-radius: 10px; background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
    .discuter:hover { background: var(--nx-surface-2); }
  `],
})
export class FicheProfilComponent {
  @Input({ required: true }) set name(v: string) { this._name.set(v); }
  @Output() closed = new EventEmitter<void>();
  private router = inject(Router);
  private members = inject(MembersService);
  private _name = signal('');
  m = toSignal(toObservable(this._name).pipe(switchMap(n => this.members.byName(n))), { initialValue: EMPTY_MEMBER });
  discuter(): void { this.closed.emit(); this.router.navigate(['/app/conversations', slugName(this.m().name)]); }
}
