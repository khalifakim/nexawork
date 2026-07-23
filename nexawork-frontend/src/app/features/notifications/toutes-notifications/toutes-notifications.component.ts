import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationsService } from '@core/services/notifications.service';
import { Notification as Notif, NotificationType } from '@core/models/notification.models';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { initials } from '@core/util/ui.util';

/** Onglets de filtre → ensembles de types backend (pas d'onglet « Mention » : les
 *  mentions ont leur page dédiée « Mentions reçues »). */
interface Filter { key: string; label: string; types: NotificationType[]; }
const FILTERS: Filter[] = [
  { key: 'tout',     label: 'Toutes',    types: [] },
  { key: 'message',  label: 'Messages',  types: ['MESSAGE_RECEIVED'] },
  { key: 'tache',    label: 'Tâches',    types: ['TASK_ASSIGNED', 'LIVRABLE_VALIDATED'] },
  { key: 'projet',   label: 'Projets',   types: ['ADDED_TO_PROJECT', 'MEMBER_INVITED', 'EXTERNAL_GUEST_INVITED'] },
  { key: 'document', label: 'Documents', types: ['DOCUMENT_SHARED'] },
  { key: 'reunion',  label: 'Réunions',  types: ['MEETING_INVITED', 'CALL_ENDED'] },
];
const PAGE_SIZE = 20;

/** Libellé court du contexte (pastille), par type de notification. */
const TYPE_LABEL: Record<NotificationType, string> = {
  MESSAGE_RECEIVED: 'Message',
  MENTION: 'Commentaire',
  TASK_ASSIGNED: 'Tâche',
  LIVRABLE_VALIDATED: 'Livrable',
  ADDED_TO_PROJECT: 'Projet',
  MEMBER_INVITED: 'Invitation',
  EXTERNAL_GUEST_INVITED: 'Invitation',
  DOCUMENT_SHARED: 'Document',
  MEETING_INVITED: 'Réunion',
  CALL_ENDED: 'Réunion',
};

/**
 * Vue « Notifications » (§13.7) : historique paginé du workspace actif, filtrable
 * par type. Même présentation que « Mentions reçues » (pleine largeur, onglets
 * soulignés). Un clic ouvre l'élément concerné (même routage que la cloche).
 */
@Component({
  selector: 'app-toutes-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <div class="hd">
        <div class="hd__l">
          <div class="hd__row">
            <h1>Notifications</h1>
            @if (unread() > 0) { <span class="hd__pill">{{ unread() }} non lues</span> }
          </div>
          <p>Tout votre historique de notifications — un clic ouvre l'élément concerné.</p>
        </div>
      </div>

      <div class="tabs">
        @for (f of filters; track f.key) {
          <button class="tab" [class.tab--on]="active()===f.key" (click)="setFilter(f)">{{ f.label }}</button>
        }
      </div>

      @if (items().length) {
        <div class="list">
          @for (n of items(); track n.id) {
            <div class="row" [class.row--unread]="!n.read" (click)="open(n)">
              <span class="dot">@if (!n.read) { <span class="dot__b"></span> }</span>
              <span class="av" [style.background]="n.ac">{{ ini(n.actor) }}</span>
              <div class="b">
                <div class="hh"><span class="a">{{ n.title }}</span></div>
                <div class="snip">{{ n.text }}</div>
                <div class="meta">
                  <span class="ctx">{{ label(n.type) }}</span>
                  @if (!n.read) { <span class="nlu">Non lu</span> }
                </div>
              </div>
              <div class="r">
                <span class="date">{{ n.date }}</span>
                <button class="mr" (click)="remove(n, $event)">Supprimer</button>
              </div>
            </div>
          }
          @if (page() + 1 < totalPages()) {
            <button class="loadmore" (click)="loadMore()" [disabled]="loading()">
              {{ loading() ? 'Chargement…' : 'Charger plus' }}
            </button>
          }
        </div>
      } @else {
        <div class="empty">{{ loading() ? 'Chargement…' : 'Aucune notification dans cette catégorie.' }}</div>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 24px 32px 0; }

    .hd { flex: none; display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .hd__l { min-width: 0; }
    .hd__row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .hd h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -.02em; color: #1d1b25; }
    .hd p  { margin: 0; font-size: 14px; color: #86828e; }
    .hd__pill { font-size: 12px; font-weight: 700; color: #fff; background: #5B5FE9; padding: 2px 9px; border-radius: 9px; }

    .tabs { flex: none; display: flex; gap: 2px; border-bottom: 1px solid #DDD9D1; margin-bottom: 18px; }
    .tab { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border: none; background: transparent; cursor: pointer;
      font-family: inherit; font-size: 13.5px; font-weight: 500; color: #86828e; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .tab--on { font-weight: 600; color: #1d1b25; border-bottom-color: #5B5FE9; }

    .list { flex: 1; min-height: 0; overflow-y: auto; margin-bottom: 32px; background: #fff; border-radius: 14px; border: 1px solid #F0EEE9; }
    .row { display: flex; align-items: flex-start; gap: 10px; padding: 15px 18px 15px 14px; border-top: 1px solid #F4F2ED; cursor: pointer; background: transparent; }
    .row:first-child { border-top: none; border-radius: 14px 14px 0 0; }
    .row:hover { background: #FAF9F6; }
    .row--unread { background: rgba(91,95,233,.05); }
    .row--unread:hover { background: rgba(91,95,233,.09); }

    .dot { width: 8px; flex: none; display: flex; justify-content: center; padding-top: 16px; }
    .dot__b { width: 8px; height: 8px; border-radius: 50%; background: #5B5FE9; display: block; }
    .av { width: 36px; height: 36px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex: none; }

    .b { flex: 1; min-width: 0; }
    .hh { font-size: 13.5px; margin-bottom: 4px; color: #1d1b25; }
    .a  { font-weight: 700; }
    .snip { font-size: 13.5px; color: #3a373f; line-height: 1.45; margin-bottom: 7px; }
    .meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .ctx { font-size: 11.5px; font-weight: 600; color: #6b6770; background: #F4F2ED; padding: 3px 9px; border-radius: 7px; }
    .nlu { font-size: 11px; font-weight: 700; color: #5B5FE9; background: rgba(91,95,233,.09); padding: 2px 8px; border-radius: 6px; }

    .r { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex: none; }
    .date { font-size: 12px; color: #a8a4af; white-space: nowrap; }
    .mr { font-size: 11.5px; font-weight: 600; color: #86828e; background: transparent; border: 1px solid #E6E3DC; border-radius: 7px; padding: 3px 9px; cursor: pointer; white-space: nowrap; font-family: inherit; }
    .mr:hover { background: #FAF9F6; color: #e11d48; border-color: #e11d48; }

    .loadmore { display: block; width: 100%; padding: 13px; border: none; border-top: 1px solid #F4F2ED; background: #fff;
      font-family: inherit; font-size: 13px; font-weight: 600; color: #5B5FE9; cursor: pointer; }
    .loadmore:hover { background: #FAF9F6; }

    .empty { flex: none; margin-bottom: 32px; background: #fff; border-radius: 14px; border: 1px solid #F0EEE9; padding: 40px; text-align: center; font-size: 13.5px; color: #a8a4af; }
  `],
})
export class ToutesNotificationsComponent {
  private notifsSvc = inject(NotificationsService);
  private router = inject(Router);
  private bus = inject(ShellBus);

  filters = FILTERS;
  active = signal<string>('tout');
  items = signal<Notif[]>([]);
  page = signal(0);
  totalPages = signal(1);
  unread = signal(0);
  loading = signal(false);

  private currentTypes(): NotificationType[] {
    return FILTERS.find(f => f.key === this.active())?.types ?? [];
  }

  constructor() { this.reload(); }

  setFilter(f: Filter): void {
    if (this.active() === f.key) return;
    this.active.set(f.key);
    this.reload();
  }

  label(t: NotificationType): string { return TYPE_LABEL[t] ?? 'Notification'; }

  /** (Re)charge depuis la page 0 pour le filtre courant. */
  private reload(): void {
    this.loading.set(true);
    this.notifsSvc.listPage({ types: this.currentTypes(), page: 0, size: PAGE_SIZE }).subscribe({
      next: p => { this.items.set(p.items); this.page.set(p.page); this.totalPages.set(p.totalPages); this.unread.set(p.unreadCount); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadMore(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.notifsSvc.listPage({ types: this.currentTypes(), page: this.page() + 1, size: PAGE_SIZE }).subscribe({
      next: p => { this.items.update(l => [...l, ...p.items]); this.page.set(p.page); this.totalPages.set(p.totalPages); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  ini(name: string): string { return initials(name); }

  /** Ouvre l'élément visé — marque lu, puis route (même logique que la cloche du header). */
  open(n: Notif): void {
    if (!n.read) {
      this.items.update(l => l.map(x => x.id === n.id ? { ...x, read: true } : x));
      if (!n.id.startsWith('ch-')) this.notifsSvc.markRead(n.id).subscribe({ error: () => {} });
    }
    if (n.target?.startsWith('/')) { this.router.navigateByUrl(n.target); return; }
    switch (n.kind) {
      case 'tache':    this.bus.openTask(n.target); break;
      case 'message':  this.router.navigate(['/app/conversations', n.target]); break;
      case 'document': this.bus.openDocument(n.target); break;
      case 'projet':   this.router.navigate(['/app/projets', n.target, 'kanban']); break;
    }
  }

  remove(n: Notif, ev: Event): void {
    ev.stopPropagation();
    if (n.id.startsWith('ch-')) { this.items.update(l => l.filter(x => x.id !== n.id)); return; }
    this.notifsSvc.remove(n.id).subscribe({
      next: () => this.items.update(l => l.filter(x => x.id !== n.id)),
      error: () => {},
    });
  }
}
