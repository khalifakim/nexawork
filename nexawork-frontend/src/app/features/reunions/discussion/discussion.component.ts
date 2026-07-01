import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface Doc { n: string; meta: string; c: string; icon: string; }
interface M { a: string; c: string; t: string; m: string; }

@Component({
  selector: 'app-discussion-reunion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="chat">
      <div class="ch">
        <button class="back" (click)="back()"><app-icon name="chevronLeft" [size]="18" [stroke]="2.2" /></button>
        <div class="ch__tx"><div class="ch__n">Revue sprint 12</div><div class="ch__c">Réunion · Refonte App Mobile · Jeudi 9 mai 2026</div></div>
        <span class="ro"><app-icon name="lock" [size]="14" />Lecture seule</span>
      </div>

      <div class="docs">
        <div class="docs__l">Documents partagés · {{ docs.length }}</div>
        <div class="docs__r">
          @for (d of docs; track d.n) {
            <div class="doc"><span class="doc__ic" [style.color]="d.c"><app-icon [name]="d.icon" [size]="18" /></span>
              <div><div class="doc__n">{{ d.n }}</div><div class="doc__s">{{ d.meta }}</div></div></div>
          }
        </div>
      </div>

      <div class="msgs">
        <div class="day"><div class="day__l"></div><span>Jeudi 9 mai 2026</span><div class="day__l"></div></div>
        @for (m of msgs; track $index) {
          <div class="msg"><span class="av" [style.background]="m.c">{{ ini(m.a) }}</span>
            <div class="b"><div class="h"><span class="n">{{ m.a }}</span><span class="t">{{ m.t }}</span></div><div class="x">{{ m.m }}</div></div></div>
        }
      </div>

      <div class="foot"><app-icon name="lock" [size]="15" /><span>Ce fil de discussion est en lecture seule — aucun nouveau message ne peut être ajouté.</span></div>
    </div>
  `,
  styleUrl: './discussion.component.scss',
})
export class DiscussionReunionComponent {
  private router = inject(Router);
  docs: Doc[] = [
    { n: 'Specs sprint 12.pdf', meta: 'PDF · 1,2 Mo', c: '#F5564E', icon: 'file' },
    { n: 'Board export.png', meta: 'Image · 840 Ko', c: '#3AA9E0', icon: 'image' },
    { n: 'Notes de réunion.docx', meta: 'Document · 60 Ko', c: '#5B8DEF', icon: 'file' },
  ];
  msgs: M[] = [
    { a: 'Sarah Diallo', c: '#F2693C', t: '14:02', m: 'On démarre par la revue des écrans d’onboarding.' },
    { a: 'Moussa Bâ', c: '#6C70F0', t: '14:09', m: 'Je viens de partager l’export du board, voir les documents partagés ci-dessus.' },
    { a: 'Aïda Ndiaye', c: '#2BB673', t: '14:15', m: 'La maquette du profil est validée côté design.' },
    { a: 'Sarah Diallo', c: '#F2693C', t: '14:28', m: 'Parfait, on cale la prochaine revue vendredi. Merci à tous !' },
  ];
  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }
  back(): void { this.router.navigate(['/app/reunions/historique']); }
}
