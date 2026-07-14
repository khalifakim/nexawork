import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FicheTacheComponent } from '@features/projets/modals/fiche-tache/fiche-tache.component';
import { AccueilService } from '@core/services/accueil.service';
import { SessionService } from '@core/services/session.service';
import { TasksService } from '@core/services/tasks.service';
import { ReceivedMention as Mention } from '@core/models/accueil.models';
import { TaskCard } from '@core/models/task.models';
import { workspaceSignal } from '@core/util/workspace-signal';

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
              @if (m.photoUrl) {
                <img class="av av--img" [src]="m.photoUrl" alt="" />
              } @else {
                <span class="av" [style.background]="m.c">{{ m.initials }}</span>
              }
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
  private session = inject(SessionService);
  private accueil = inject(AccueilService);
  private tasksSvc = inject(TasksService);

  filter      = signal<FilterKey>('Toutes');
  openedTask  = signal<TaskCard | null>(null);
  /** Ids the user marked read this session (on top of the mock's own `read` flag). */
  private readIds = signal<string[]>([]);

  /** Mentions of the active workspace (reload on workspace switch). */
  private seed = workspaceSignal<Mention[]>(this.session, () => this.accueil.mentions(), []);

  tabs = TAB_ORDER;

  visible = computed<Mention[]>(() => {
    const f = this.filter();
    const list = this.seed();
    if (f === 'Toutes')   return list;
    if (f === 'Non lues') return list.filter(m => !this.isRead(m.id));
    return list.filter(m => m.kind === f);
  });

  unreadCount = computed(() => this.seed().filter(m => !this.isRead(m.id)).length);

  isRead(id: string): boolean {
    if (this.readIds().includes(id)) return true;
    return this.seed().find(m => m.id === id)?.read === true;
  }

  /** Single row open: mark read then navigate to the concerned element. */
  open(m: Mention): void {
    this.markOneInternal(m.id);
    this.goTo(m);
  }

  markOne(ev: Event, id: string): void {
    ev.stopPropagation();
    this.markOneInternal(id);
  }

  private markOneInternal(id: string): void {
    if (this.readIds().includes(id)) return;
    this.readIds.update(ids => [...new Set([...ids, id])]);
  }

  /** Mark every mention as read (Toutes). */
  markAllRead(): void {
    this.readIds.set(this.seed().map(m => m.id));
  }

  /** Route to the element a mention points at, per its serialisable target. */
  private goTo(m: Mention): void {
    switch (m.target.kind) {
      case 'task':         this.openTaskById(m.target.id); break;
      case 'conversation': this.router.navigate(['/app/conversations', m.target.slug]); break;
      case 'channel':      this.router.navigate(['/app/canaux', m.target.slug]); break;
    }
  }

  /** `ref` = UUID de la tâche, ou sa clé lisible quand la mention n'a pas d'id résolu. */
  private openTaskById(ref: string): void {
    this.tasksSvc.cardByRef(ref).subscribe(card => { if (card) this.openedTask.set(card); });
  }
}
