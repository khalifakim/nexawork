import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FicheTacheComponent } from '@features/projets/modals/fiche-tache/fiche-tache.component';

interface Mention {
  actor: string; color: string; verb: string; snip: string;
  ctx: string; date: string; kind: string; target: string;
}

@Component({
  selector: 'app-mentions-recues',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FicheTacheComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <h1>Mentions reçues</h1>
        <p>Tout ce dans quoi vous avez été mentionné — un clic ouvre l'élément concerné.</p>
      </div>
      <div class="tabs">
        @for (t of tabs; track t) {
          <button class="tab" [class.tab--on]="filter()===t" (click)="filter.set(t)">{{ t }}</button>
        }
      </div>
      @if (shown().length) {
        <div class="list">
          @for (m of shown(); track m.snip; let i = $index) {
            <div class="row" [class.row--first]="i===0" (click)="go(m)">
              <span class="av" [style.background]="m.color">{{ ini(m.actor) }}</span>
              <div class="b">
                <div class="h"><span class="a">{{ m.actor }}</span><span class="v"> {{ m.verb }}</span></div>
                <div class="snip">{{ m.snip }}</div>
                <span class="ctx">{{ m.ctx }}</span>
              </div>
              <span class="date">{{ m.date }}</span>
            </div>
          }
        </div>
      } @else {
        <div class="empty">Aucune mention dans cette catégorie.</div>
      }
    </div>

    @if (openedTask()) {
      <app-fiche-tache [task]="openedTask()!" (closed)="openedTask.set(null)" />
    }
  `,
  styleUrl: './mentions-recues.component.scss',
})
export class MentionsRecuesComponent {
  private router = inject(Router);
  tabs = ['Toutes', 'Canaux', 'Discussions', 'Commentaires'];
  filter     = signal('Toutes');
  openedTask = signal<any>(null);

  private ments: Mention[] = [
    { actor: 'Sarah Diallo', color: '#F2693C',
      verb: 'vous a mentionné dans un commentaire',
      snip: '@Akim peux-tu valider la maquette du profil avant ce soir ?',
      ctx: 'Tâche · MOB-094',              date: 'Il y a 12 min', kind: 'Commentaires', target: 'MOB-094' },
    { actor: 'Sarah Diallo', color: '#F2693C',
      verb: 'vous a mentionné dans un message privé',
      snip: "@Akim je t'envoie la maquette du profil ce soir, tu pourras relire ?",
      ctx: 'Message privé · Sarah Diallo', date: 'Il y a 30 min', kind: 'Discussions',  target: 'sarah-diallo' },
    { actor: 'Moussa Bâ',    color: '#6C70F0',
      verb: 'vous a mentionné dans #général',
      snip: 'Bon boulot @Akim sur la mise en place du CI/CD',
      ctx: 'Canal · #général',             date: 'Il y a 2 h',   kind: 'Canaux',       target: 'general' },
    { actor: 'Aïda Ndiaye',  color: '#2BB673',
      verb: 'vous a mentionné dans un commentaire',
      snip: "@Akim je te laisse trancher sur la couleur d'accent.",
      ctx: 'Tâche · MOB-077',              date: 'Hier',          kind: 'Commentaires', target: 'MOB-077' },
    { actor: 'Moussa Bâ',    color: '#6C70F0',
      verb: 'vous a mentionné dans un message privé',
      snip: '@Akim la PR backend attend ton OK avant le merge',
      ctx: 'Message privé · Moussa Bâ',   date: 'Hier',          kind: 'Discussions',  target: 'moussa-ba' },
    { actor: 'Yacine Sow',   color: '#E0497B',
      verb: 'vous a mentionné dans #dev-frontend',
      snip: '@Akim la PR est prête pour relecture quand tu veux.',
      ctx: 'Canal · #dev-frontend',        date: 'Il y a 2 j',   kind: 'Canaux',       target: 'dev-frontend' },
  ];

  shown = computed(() =>
    this.filter() === 'Toutes' ? this.ments : this.ments.filter(m => m.kind === this.filter())
  );

  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }

  go(m: Mention): void {
    if (m.kind === 'Canaux') {
      this.router.navigate(['/app/canaux', m.target]);
    } else if (m.kind === 'Discussions') {
      this.router.navigate(['/app/conversations', m.target]);
    } else {
      this.openedTask.set({
        id: m.target, title: 'Voir commentaire — ' + m.target,
        desc: m.snip, proj: m.ctx.split('·')[0].trim(),
        prio: ['Haute', '#F5564E', '#FDECEB'],
        tag: ['Commentaire', '#6C70F0'], prog: [0, ''],
        team: [m.color], links: 0, comments: 1,
      });
    }
  }
}
