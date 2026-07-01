import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FicheTacheComponent } from '@features/projets/modals/fiche-tache/fiche-tache.component';

interface Mention {
  id: string;
  a: string; initials: string; c: string;
  verb: string; snip: string; ctx: string; date: string; kind: string;
  go: () => void;
}

type FilterKey = 'Toutes' | 'Canaux' | 'Discussions' | 'Commentaires' | 'Non lues';

const TAB_ORDER: FilterKey[] = ['Toutes', 'Canaux', 'Discussions', 'Commentaires', 'Non lues'];

@Component({
  selector: 'app-mentions-recues',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FicheTacheComponent],
  template: `
    <div class="wrap">
      <!-- HEADER : titre + pastille "X non lue(s)" / sous-titre / bouton "Tout marquer comme lu" en haut à droite -->
      <div class="hd">
        <div class="hd__l">
          <div class="hd__row">
            <h1>Mentions reçues</h1>
            @if (unreadCount() > 0) {
              <span class="hd__pill">{{ unreadCount() }} non lue{{ unreadCount() > 1 ? 's' : '' }}</span>
            }
          </div>
          <p>Tout ce dans quoi vous avez été mentionné — un clic ouvre l'élément concerné.</p>
        </div>
        @if (unreadCount() > 0) {
          <button class="all-read" (click)="markAllRead()">Tout marquer comme lu</button>
        }
      </div>

      <!-- ONGLETS — Non lues en dernier, avec badge indigo -->
      <div class="tabs">
        @for (t of tabs; track t) {
          <button class="tab" [class.tab--on]="filter()===t" (click)="filter.set(t)">
            <span>{{ t }}</span>
            @if (t === 'Non lues' && unreadCount() > 0) {
              <span class="tab__b" [class.tab__b--on]="filter()===t">{{ unreadCount() }}</span>
            }
          </button>
        }
      </div>

      <!-- LISTE -->
      @if (visible().length) {
        <div class="list">
          @for (m of visible(); track m.id; let i = $index) {
            <div class="row" [class.row--unread]="!isRead(m.id)" (click)="open(m)">
              <span class="dot">
                @if (!isRead(m.id)) { <span class="dot__b"></span> }
              </span>
              <span class="av" [style.background]="m.c">{{ m.initials }}</span>
              <div class="b">
                <div class="hh"><span class="a">{{ m.a }}</span><span class="v"> {{ m.verb }}</span></div>
                <div class="snip" [class.snip--read]="isRead(m.id)">« {{ m.snip }} »</div>
                <div class="meta">
                  <span class="ctx">{{ m.ctx }}</span>
                  @if (!isRead(m.id)) { <span class="nlu">Non lue</span> }
                </div>
              </div>
              <div class="r">
                <span class="date">{{ m.date }}</span>
                @if (!isRead(m.id)) {
                  <button class="mr" (click)="markOne($event, m.id)">Marquer lu</button>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="empty">{{ filter() === 'Non lues' ? 'Toutes vos mentions ont été lues ✓' : 'Aucune mention dans cette catégorie.' }}</div>
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
  filter      = signal<FilterKey>('Toutes');
  openedTask  = signal<any>(null);
  readIds     = signal<string[]>(['m2', 'm4']);

  private seed: Mention[] = [
    { id: 'm1', a: 'Sarah Diallo',  initials: 'SD', c: 'linear-gradient(135deg,#F5A623,#F2693C)',
      verb: 'vous a mentioné dans un commentaire',
      snip: '@Akim peux-tu valider la maquette du profil avant ce soir ?',
      ctx: 'Tâche · MOB-094',  date: 'Il y a 12 min', kind: 'Commentaires',
      go: () => this.openTaskById('MOB-094') },
    { id: 'm2', a: 'Sarah Diallo',  initials: 'SD', c: 'linear-gradient(135deg,#F5A623,#F2693C)',
      verb: 'vous a mentioné dans un message privé',
      snip: "@Akim je t'envoie la maquette du profil ce soir, tu pourras relire ?",
      ctx: 'Message privé · Sarah Diallo', date: 'Il y a 30 min', kind: 'Discussions',
      go: () => this.router.navigate(['/app/conversations', 'sarah-diallo']) },
    { id: 'm3', a: 'Moussa Bâ',     initials: 'MB', c: 'linear-gradient(135deg,#6C70F0,#4B3FD6)',
      verb: 'vous a mentioné dans #général',
      snip: 'Bon boulot @Akim sur la mise en place du CI/CD 👏',
      ctx: 'Canal · #général',  date: 'Il y a 2 h',  kind: 'Canaux',
      go: () => this.router.navigate(['/app/canaux', 'general']) },
    { id: 'm4', a: 'Aïda Ndiaye',   initials: 'AN', c: 'linear-gradient(135deg,#2BB673,#1E8F57)',
      verb: 'vous a mentioné dans un commentaire',
      snip: "@Akim je te laisse trancher sur la couleur d'accent.",
      ctx: 'Tâche · MOB-077',   date: 'Hier',         kind: 'Commentaires',
      go: () => this.openTaskById('MOB-077') },
    { id: 'm5', a: 'Moussa Bâ',     initials: 'MB', c: 'linear-gradient(135deg,#6C70F0,#4B3FD6)',
      verb: 'vous a mentioné dans un message privé',
      snip: '@Akim la PR backend attend ton OK avant le merge 🙏',
      ctx: 'Message privé · Moussa Bâ', date: 'Hier',         kind: 'Discussions',
      go: () => this.router.navigate(['/app/conversations', 'moussa-ba']) },
    { id: 'm6', a: 'Yacine Sow',    initials: 'YS', c: 'linear-gradient(135deg,#E0497B,#B5346A)',
      verb: 'vous a mentioné dans #dev-frontend',
      snip: '@Akim la PR est prête pour relecture quand tu veux.',
      ctx: 'Canal · #dev-frontend',  date: 'Il y a 2 j',  kind: 'Canaux',
      go: () => this.router.navigate(['/app/canaux', 'dev-frontend']) },
  ];

  tabs = TAB_ORDER;

  visible = computed<Mention[]>(() => {
    const f = this.filter();
    if (f === 'Toutes')   return this.seed;
    if (f === 'Non lues') return this.seed.filter(m => !this.isRead(m.id));
    return this.seed.filter(m => m.kind === f);
  });

  unreadCount = computed(() => this.seed.filter(m => !this.isRead(m.id)).length);

  isRead(id: string): boolean { return this.readIds().includes(id); }

  /** Single row open: mark read then run the row's go(). */
  open(m: Mention): void {
    this.markOneInternal(m.id);
    m.go();
  }

  markOne(ev: Event, id: string): void {
    ev.stopPropagation();
    this.markOneInternal(id);
  }

  private markOneInternal(id: string): void {
    if (this.isRead(id)) return;
    this.readIds.update(ids => [...new Set([...ids, id])]);
  }

  /** Mark every mention as read (Toutes). */
  markAllRead(): void {
    this.readIds.set(this.seed.map(m => m.id));
  }

  private openTaskById(id: string): void {
    this.openedTask.set({
      id, title: 'Voir commentaire — ' + id,
      desc: '', proj: 'Tâche',
      prio: ['Haute', '#F5564E', '#FDECEB'],
      tag: ['Commentaire', '#6C70F0'], prog: [0, ''],
      team: [], links: 0, comments: 1,
    });
  }
}
