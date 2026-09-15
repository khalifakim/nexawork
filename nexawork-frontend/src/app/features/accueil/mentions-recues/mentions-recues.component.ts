import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FicheTacheComponent } from '@features/projets/modals/fiche-tache/fiche-tache.component';
import { TasksService } from '@core/services/tasks.service';
import { NotificationsStore } from '@core/services/notifications-store.service';
import { ReceivedMention as Mention, MentionKind } from '@core/models/accueil.models';
import { TaskCard } from '@core/models/task.models';

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

      <!-- ONGLETS — chacun affiche son nombre de non-lues -->
      <div class="tabs">
        @for (t of tabs; track t) {
          <button class="tab" [class.tab--on]="filter()===t" (click)="filter.set(t)">
            <span>{{ t }}</span>
            @if (tabBadge(t) > 0) {
              <span class="tab__b" [class.tab__b--on]="filter()===t">{{ tabBadge(t) }}</span>
            }
          </button>
        }
      </div>

      <!-- LISTE -->
      @if (visible().length) {
        <div class="list">
          @for (m of visible(); track m.id; let i = $index) {
            <div class="row" [class.row--unread]="!m.read" (click)="open(m)">
              <span class="dot">
                @if (!m.read) { <span class="dot__b"></span> }
              </span>
              @if (m.photoUrl) {
                <img class="av av--img" [src]="m.photoUrl" alt="" />
              } @else {
                <span class="av" [style.background]="m.c">{{ m.initials }}</span>
              }
              <div class="b">
                <div class="hh"><span class="a">{{ m.a }}</span><span class="v"> {{ m.verb }}</span></div>
                <div class="snip" [class.snip--read]="m.read">« {{ m.snip }} »</div>
                <div class="meta">
                  <span class="ctx">{{ m.ctx }}</span>
                  @if (!m.read) { <span class="nlu">Non lue</span> }
                </div>
              </div>
              <div class="r">
                <span class="date">{{ m.date }}</span>
                @if (!m.read) {
                  <button class="mr" (click)="markOne($event, m)">Marquer lu</button>
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
      <app-fiche-tache [task]="openedTask()!" [anchorCommentId]="anchorComment()" (closed)="openedTask.set(null)" />
    }
  `,
  styleUrl: './mentions-recues.component.scss',
})
export class MentionsRecuesComponent {
  private router = inject(Router);
  private tasksSvc = inject(TasksService);
  private store = inject(NotificationsStore);

  filter      = signal<FilterKey>('Toutes');
  openedTask  = signal<TaskCard | null>(null);
  /** Commentaire à ancrer dans la fiche ouverte (mention de commentaire). */
  anchorComment = signal<string | null>(null);

  tabs = TAB_ORDER;
  /** Mentions de l'espace actif, avec l'état lu à jour (store partagé). */
  private list = this.store.mentionList;
  unreadCount = this.store.mentionsUnread;
  private unreadByKind = this.store.mentionsUnreadByKind;

  visible = computed<Mention[]>(() => {
    const f = this.filter();
    const list = this.list();
    if (f === 'Toutes')   return list;
    if (f === 'Non lues') return list.filter(m => !m.read);
    return list.filter(m => m.kind === f);
  });

  /** Nombre de non-lues d'un onglet (0 = pas de badge). */
  tabBadge(t: FilterKey): number {
    if (t === 'Toutes' || t === 'Non lues') return this.unreadCount();
    return this.unreadByKind()[t as MentionKind] ?? 0;
  }

  /** Ouverture d'une ligne : marque lu (store → décrémente partout) puis navigue. */
  open(m: Mention): void {
    this.store.markMention(m);
    this.goTo(m);
  }

  markOne(ev: Event, m: Mention): void {
    ev.stopPropagation();
    this.store.markMention(m);
  }

  /** Marque toutes les mentions comme lues. */
  markAllRead(): void {
    this.store.markAllMentions();
  }

  /** Route to the element a mention points at, per its serialisable target. */
  private goTo(m: Mention): void {
    switch (m.target.kind) {
      case 'task':         this.openTaskById(m.target.id, m.target.commentId); break;
      case 'conversation': this.router.navigate(['/app/conversations', m.target.slug]); break;
      case 'channel':      this.router.navigate(['/app/canaux', m.target.slug]); break;
    }
  }

  /** `ref` = UUID de la tâche, ou sa clé lisible quand la mention n'a pas d'id résolu. */
  private openTaskById(ref: string, commentId?: string): void {
    this.anchorComment.set(commentId ?? null);
    this.tasksSvc.cardByRef(ref).subscribe(card => { if (card) this.openedTask.set(card); });
  }
}
