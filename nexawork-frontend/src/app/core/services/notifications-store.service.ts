import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationsService } from './notifications.service';
import { AccueilService } from './accueil.service';
import { SessionService } from './session.service';
import { Notification, NotificationType } from '@core/models/notification.models';
import { ReceivedMention, MentionKind } from '@core/models/accueil.models';

/**
 * Source de vérité partagée des **notifications** et **mentions** de l'espace
 * actif. La sidebar, la cloche du header et les pages Accueil consomment ce store
 * pour que les badges « non lues » soient cohérents et se **décrémentent en direct**
 * dès qu'un élément est ouvert/lu, sans rechargement.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private session = inject(SessionService);
  private notifsSvc = inject(NotificationsService);
  private accueil = inject(AccueilService);

  private _notifs = signal<Notification[]>([]);
  private _mentions = signal<ReceivedMention[]>([]);
  private _loadedWs: string | null = null;

  /** Ids marqués lus localement (mentions de commentaires : pas d'endpoint dédié). */
  private _localReadMentions = signal<Set<string>>(new Set());

  readonly notifs = this._notifs.asReadonly();
  readonly mentions = this._mentions.asReadonly();

  // ── Compteurs « non lues » ────────────────────────────────────────────────
  readonly notifUnread = computed(() => this._notifs().filter(n => !n.read).length);
  readonly mentionsUnread = computed(() => this.mentionList().filter(m => !m.read).length);

  /** Non-lues par onglet de « Mentions reçues » (Canaux / Discussions / Commentaires). */
  readonly mentionsUnreadByKind = computed(() => {
    const map: Record<MentionKind, number> = { Canaux: 0, Discussions: 0, Commentaires: 0 };
    for (const m of this.mentionList()) if (!m.read) map[m.kind] = (map[m.kind] ?? 0) + 1;
    return map;
  });

  /** Non-lues par type de notification (pour les compteurs d'onglets). */
  readonly notifUnreadByType = computed(() => {
    const map = new Map<NotificationType, number>();
    for (const n of this._notifs()) if (!n.read) map.set(n.type, (map.get(n.type) ?? 0) + 1);
    return map;
  });

  /** Mentions avec l'état lu effectif (backend + lectures locales). */
  readonly mentionList = computed<ReceivedMention[]>(() => {
    const local = this._localReadMentions();
    return this._mentions().map(m => local.has(m.id) ? { ...m, read: true } : m);
  });

  constructor() {
    // (Re)chargement au changement d'espace de travail.
    effect(() => {
      const ws = this.session.activeWorkspaceId();
      if (!ws || ws === this._loadedWs) return;
      this._loadedWs = ws;
      this.reload();
    });
    // Notifications temps réel (STOMP) → empilées en tête. Les mentions (type
    // MENTION) sont exclues de cette vue : elles vivent dans « Mentions reçues ».
    this.notifsSvc.live().pipe(takeUntilDestroyed()).subscribe(n => {
      if (n.type === 'MENTION') return;
      this._notifs.update(l => [n, ...l.filter(x => x.id !== n.id)]);
    });
  }

  /**
   * Recharge notifications + mentions de l'espace actif. Les notifications de type
   * MENTION sont écartées de la liste des notifications (page dédiée + badge sidebar) :
   * elles apparaissent uniquement dans « Mentions reçues » (et la cloche du header).
   */
  reload(): void {
    this.notifsSvc.list().subscribe({ next: l => this._notifs.set(l.filter(n => n.type !== 'MENTION')), error: () => {} });
    this.accueil.mentions().subscribe({ next: l => this._mentions.set(l), error: () => {} });
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  markNotif(id: string): void {
    let changed = false;
    this._notifs.update(l => l.map(n => {
      if (n.id === id && !n.read) { changed = true; return { ...n, read: true }; }
      return n;
    }));
    if (changed && !id.startsWith('ch-')) this.notifsSvc.markRead(id).subscribe({ error: () => {} });
  }
  removeNotif(id: string): void {
    this._notifs.update(l => l.filter(n => n.id !== id));
    if (!id.startsWith('ch-')) this.notifsSvc.remove(id).subscribe({ error: () => {} });
  }
  /** Ajoute une notification reçue en direct (utilisé par le header pour les invitations, etc.). */
  pushNotif(n: Notification): void {
    this._notifs.update(l => [n, ...l.filter(x => x.id !== n.id)]);
  }

  // ── Mentions ───────────────────────────────────────────────────────────────
  markMention(m: ReceivedMention): void {
    if (m.read || this._localReadMentions().has(m.id)) return;
    this._localReadMentions.update(s => new Set(s).add(m.id));
    // Les mentions de messagerie (Canaux/Discussions) ont un endpoint de lecture ;
    // les mentions de commentaires n'en ont pas (lecture locale uniquement).
    if (m.kind !== 'Commentaires') this.accueil.markMentionRead(m.id).subscribe({ error: () => {} });
  }
  markAllMentions(): void {
    const ids = this.mentionList().filter(m => !m.read).map(m => m.id);
    if (!ids.length) return;
    this._localReadMentions.update(s => { const n = new Set(s); ids.forEach(i => n.add(i)); return n; });
    this.accueil.markAllMentionsRead().subscribe({ error: () => {} });
  }
}
