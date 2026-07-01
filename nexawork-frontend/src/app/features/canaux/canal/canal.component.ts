import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';

interface Part { type: 'text' | 'task' | 'channel' | 'person'; v: string; }
interface ChMsg { author: string; color: string; time: string; parts: Part[]; }

@Component({
  selector: 'app-canal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="chat">
      <div class="ch">
        @if (isAnnonce()) { <app-icon name="bell" [size]="20" /> } @else { <span class="hash">#</span> }
        <span class="ch__n">{{ name() }}</span>
        @if (archived()) { <span class="badge"><app-icon name="lock" [size]="12" />archivé</span> }
        <span class="ch__s">{{ readonly() ? '· Lecture seule · écriture réservée aux admins et chef de projet' : '· Lecture et écriture pour tous les membres' }}</span>
      </div>

      <div class="msgs">
        <div class="day"><div class="day__l"></div><span>Aujourd'hui</span><div class="day__l"></div></div>
        @for (m of msgs; track $index) {
          <div class="msg">
            <span class="av" [style.background]="m.color" style="cursor:pointer" (click)="bus.openProfile(m.author)">{{ ini(m.author) }}</span>
            <div class="b">
              <div class="h"><span class="n" style="cursor:pointer" (click)="bus.openProfile(m.author)">{{ m.author }}</span><span class="t">{{ m.time }}</span></div>
              <div class="x">
                @for (p of m.parts; track $index) {
                  @switch (p.type) {
                    @case ('task') { <span class="chip chip--task nx-mono">{{ p.v }}</span> }
                    @case ('channel') { <span class="chip chip--chan">#{{ p.v }}</span> }
                    @case ('person') { <span class="mention">{{ '@' + p.v }}</span> }
                    @default { <span>{{ p.v }}</span> }
                  }
                }
              </div>
            </div>
          </div>
        }
      </div>

      @if (readonly()) {
        <div class="ro"><app-icon name="lock" [size]="16" /><span>{{ archived() ? 'Projet archivé — canal en lecture seule.' : 'Canal en lecture seule — écriture réservée aux administrateurs.' }}</span></div>
      } @else {
        <div class="composer">
          <div class="box">
            <div class="in" contenteditable="true" [attr.data-ph]="'Écrire dans #' + name() + '…'"></div>
            <div class="bar">
              <button class="cbtn"><app-icon name="paperclip" [size]="18" /></button>
              <button class="cbtn"><app-icon name="at" [size]="18" /></button>
              <button class="cbtn"><app-icon name="smile" [size]="18" /></button>
              <span class="spacer"></span>
              <button class="send"><app-icon name="send" [size]="17" /></button>
            </div>
          </div>
          <div class="legend">@ personnes · &#64;&#64; tâches · &#64;&#64;&#64; documents · # canaux</div>
        </div>
      }
    </div>
  `,
  styleUrl: './canal.component.scss',
})
export class CanalComponent {
  private route = inject(ActivatedRoute);
  bus = inject(ShellBus);
  name = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? 'annonces')), { initialValue: 'annonces' });

  isAnnonce = computed(() => this.name() === 'annonces' || this.name() === 'annonces-projet');
  readonly = computed(() => this.isAnnonce());
  archived = computed(() => false);

  msgs: ChMsg[] = [
    { author: 'Sarah Diallo', color: '#F2693C', time: '09:12', parts: [{ type: 'text', v: 'Bonjour à tous. La nouvelle version du board Kanban est en ligne, pensez à mettre à jour vos tâches.' }] },
    { author: 'Moussa Bâ', color: '#6C70F0', time: '09:18', parts: [{ type: 'text', v: 'Super, je m’en occupe ce matin. ' }, { type: 'task', v: 'MOB-094' }, { type: 'text', v: ' est presque terminée.' }] },
    { author: 'Aïda Ndiaye', color: '#2BB673', time: '09:24', parts: [{ type: 'text', v: 'De mon côté la maquette du profil est prête, je partage le lien dans ' }, { type: 'channel', v: 'design-veille' }, { type: 'text', v: '. ' }, { type: 'person', v: 'Akim' }, { type: 'text', v: ' jette un œil quand tu peux.' }] },
  ];
  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }
}
