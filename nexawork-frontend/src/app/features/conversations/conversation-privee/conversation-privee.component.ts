import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MembersService } from '@core/services/members.service';
import { Member } from '@core/models/member.models';
import { ShellBus } from '@layouts/app-shell/shell.bus';

const EMPTY_MEMBER: Member = { name: '', color: '#86828E', role: '', email: '', online: false, projects: [] };

interface Msg { me: boolean; m: string; t: string; }

@Component({
  selector: 'app-conversation-privee',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="chat">
      <div class="ch" (click)="bus.openProfile(peer().name)" style="cursor:pointer">
        <div class="av">
          <span class="av__c" [style.background]="peer().color">{{ ini(peer().name) }}</span>
          @if (peer().online) { <span class="av__d"></span> }
        </div>
        <div>
          <div class="ch__n">{{ peer().name }}</div>
          <div class="ch__s" [style.color]="peer().online ? 'var(--nx-success)' : 'var(--nx-text-300)'">{{ peer().online ? 'En ligne' : 'Hors ligne' }}</div>
        </div>
      </div>

      <div class="msgs">
        @for (m of msgs; track $index) {
          <div class="line" [class.line--me]="m.me">
            <div class="bubble" [class.bubble--me]="m.me">
              <div>{{ m.m }}</div>
              <div class="t">{{ m.t }}</div>
            </div>
          </div>
        }
      </div>

      <div class="typing">{{ peer().name.split(' ')[0] }} est en train d'écrire…</div>

      <div class="composer">
        <div class="box">
          <div class="in" contenteditable="true" [attr.data-ph]="'Votre message…'"></div>
          <div class="bar">
            <button class="cbtn"><app-icon name="paperclip" [size]="18" /></button>
            <button class="cbtn"><app-icon name="at" [size]="18" /></button>
            <button class="cbtn"><app-icon name="smile" [size]="18" /></button>
            <span class="spacer"></span>
            <button class="send"><app-icon name="send" [size]="17" /></button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './conversation-privee.component.scss',
})
export class ConversationPriveeComponent {
  private route = inject(ActivatedRoute);
  bus = inject(ShellBus);
  private members = inject(MembersService);
  private slug = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? 'sarah-diallo')), { initialValue: 'sarah-diallo' });
  peer = toSignal(toObservable(this.slug).pipe(switchMap(s => this.members.bySlug(s))), { initialValue: EMPTY_MEMBER });

  msgs: Msg[] = [
    { me: false, m: 'Salut Akim ! Tu as eu le temps de regarder la maquette du profil ?', t: '14:02' },
    { me: true, m: 'Oui ! C’est top, juste un détail sur l’espacement des boutons.', t: '14:05' },
    { me: false, m: 'Je t’envoie la version corrigée ce soir.', t: '14:06' },
  ];
  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }
}
