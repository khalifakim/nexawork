import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '@core/services/session.service';
import { WorkspaceLoaderService } from '@core/services/workspace-loader.service';
import { ToastService } from '@core/services/toast.service';
import { NotificationsService } from '@core/services/notifications.service';
import { UserProfileService } from '@core/services/user-profile.service';
import { Notification as Notif } from '@core/models/notification.models';
import { workspaceSignal } from '@core/util/workspace-signal';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { LogoComponent } from '@shared/ui/logo/logo.component';
import { initials } from '@core/util/ui.util';

type Menu = 'ws' | 'user' | 'notif' | 'call' | null;

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, AvatarComponent, LogoComponent],
  template: `
    <header class="hd">
      <!-- left: logo + workspace -->
      <div class="hd__left">
        <div class="logo"><app-logo [markSize]="20" [fontSize]="9.5" [onDark]="true" [stacked]="true" /></div>
        <div class="wswrap">
          <button class="ws" (click)="toggle('ws')">
            <span class="ws__logo" [style.background]="wsColor()">{{ wsMono() }}</span>
            <span class="ws__t"><span class="ws__name">{{ wsName() }}</span><span class="ws__sub">12 membres</span></span>
            <app-icon name="chevronDown" [size]="13" [stroke]="2.4" />
          </button>
          @if (menu() === 'ws') { <div class="bd" (click)="close()"></div>
            <div class="pop pop--ws" (click)="$event.stopPropagation()">
              <div class="wsm__head">
                <div style="display:flex;align-items:center;gap:11px;margin-bottom:11px">
                  <span class="wsm__logo" [style.background]="wsColor()">{{ wsMono() }}</span>
                  <div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:700">{{ wsName() }}</div><div style="font-size:12.5px;color:var(--nx-text-500)">12 membres</div></div>
                  @if (isAdmin()) {
                    <button class="iconbtn" routerLink="/app/parametres/general" (click)="close()" title="Paramètres du workspace"><app-icon name="gear" [size]="17" /></button>
                  }
                </div>
                <div style="display:flex;gap:7px">
                  @if (isAdmin()) { <span class="badge badge--indigo">Administrateur</span> }
                  @if (isOwner()) { <span class="badge badge--amber">Propriétaire</span> }
                </div>
              </div>
              <div class="wsm__sec">
                <div class="wsm__h">Autres espaces de travail</div>
                @for (o of others(); track o.id) {
                  <button class="wsm__row" (click)="switchTo(o)"><span class="wsm__av" [style.background]="o.color">{{ o.name[0] }}</span>
                    <span style="flex:1"><span style="display:block;font-size:13.5px;font-weight:600">{{ o.name }}</span><span style="font-size:11.5px;color:var(--nx-text-500)">{{ roleLabel(o.role) }}</span></span>
                    <span style="font-size:12px;font-weight:600;color:var(--nx-indigo)">Basculer</span></button>
                }
              </div>
              <div class="wsm__sec">
                <button class="wsm__row" (click)="openCreateWorkspace()">
                  <app-icon name="plus" [size]="17" /><span>Créer un espace de travail</span>
                </button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- center: search -->
      <div class="hd__center">
        <button class="search" (click)="search.emit()" title="Recherche globale (Ctrl+K)">
          <app-icon name="search" [size]="15" [stroke]="2" />
          <span>Recherche globale…</span>
          <span class="search__kbd"><kbd>{{ modKey }}</kbd><kbd>K</kbd></span>
        </button>
      </div>

      <!-- right: call, notif, avatar -->
      <div class="hd__right">
        <!-- REF A - Un seul appel visio simultane. Le bouton d'appel n'est monte que
             si l'utilisateur est effectivement engage dans un appel, cf. session.hasOngoingCall(). -->
        @if (hasOngoingCall()) {
          @let call = ongoingCall()!;
          <button class="ico ico--call" title="Appel en cours" (click)="toggle('call')">
            <app-icon name="video" [size]="18" [stroke]="2" /><span class="pulse"></span>
          </button>
          @if (menu() === 'call') { <div class="bd" (click)="close()"></div>
            <div class="pop pop--call" (click)="$event.stopPropagation()">
              <div class="call__head">
                <div style="display:flex;align-items:center;gap:9px;margin-bottom:12px">
                  <span class="pulse pulse--lg"></span>
                  <span style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.85)">Appel en cours</span>
                  <span class="nx-mono" style="margin-left:auto;font-size:13px;font-weight:600;color:rgba(255,255,255,.85)">{{ callElapsed() }}</span>
                </div>
                <div style="font-size:16px;font-weight:700;margin-bottom:3px">{{ call.meetingTitle }}</div>
                <div style="font-size:12.5px;color:rgba(255,255,255,.8)">{{ call.context }}</div>
              </div>
              <div style="padding:14px 18px 6px">
                <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--nx-text-400);margin-bottom:11px">{{ callParts.length }} participants</div>
                <div style="display:flex;align-items:center">
                  @for (p of callParts; track p.i; let idx = $index) {
                    <span class="stack" [style.background]="p.c" [style.margin-left.px]="idx ? -9 : 0">{{ p.i }}</span>
                  }
                  <span style="margin-left:12px;font-size:13px;color:var(--nx-text-500)">Sarah, Moussa et 3 autres</span>
                </div>
              </div>
              <div style="padding:12px 18px 18px;display:flex;gap:10px">
                <button class="call__ignore" (click)="hangup()" title="Raccrocher"><app-icon name="x" [size]="17" /></button>
                <button class="call__join" (click)="focusCall()"><app-icon name="video" [size]="17" [stroke]="2" />Revenir à l'appel</button>
              </div>
            </div>
          }
        }

        <button class="ico" [class.ico--on]="menu()==='notif' || unread() > 0" (click)="toggle('notif')">
          <app-icon name="bell" [size]="17" [stroke]="2" />
          @if (unread() > 0) { <span class="dot">{{ unread() }}</span> }
        </button>
        @if (menu() === 'notif') { <div class="bd" (click)="close()"></div>
          <div class="pop pop--notif" (click)="$event.stopPropagation()">
            <div class="nm__head">
              <div style="display:flex;align-items:center;gap:9px;margin-bottom:13px">
                <span style="font-size:16px;font-weight:700">Notifications</span>
                @if (unread() > 0) { <span class="nm__count">{{ unread() }} non lues</span> }
              </div>
              <div class="seg">
                <button [class.seg--on]="notifFilter()==='tout'" (click)="notifFilter.set('tout')">Tout</button>
                <button [class.seg--on]="notifFilter()==='nonlu'" (click)="notifFilter.set('nonlu')">Non lu</button>
              </div>
            </div>
            <div class="nm__list">
              @for (n of visibleNotifs(); track n.id) {
                <div class="nm__row" [class.nm__row--unread]="!n.read" (click)="openNotif(n)">
                  <span class="nm__u">@if (!n.read) { <span class="nm__udot"></span> }</span>
                  <span class="nm__av" [style.background]="n.ac">{{ ini(n.actor) }}</span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13.5px;font-weight:700">{{ n.title }}</div>
                    <div style="font-size:13px;color:var(--nx-text-700);line-height:1.45;margin:2px 0 5px">{{ n.text }}</div>
                    <div style="font-size:12px;color:var(--nx-text-400);font-weight:500">{{ n.date }}</div>
                  </div>
                </div>
              } @empty { <div class="nm__empty">Aucune notification {{ notifFilter()==='nonlu' ? 'non lue' : '' }}.</div> }
            </div>
          </div>
        }

        <button class="avbtn" (click)="toggle('user')">
          <app-avatar [name]="userName()" [color]="'#F5A623'" [size]="30" [online]="true" ring="#16131F" [photoUrl]="userPhoto()" />
          <app-icon name="chevronDown" [size]="13" [stroke]="2.4" />
        </button>
        @if (menu() === 'user') { <div class="bd" (click)="close()"></div>
          <div class="pop pop--user" (click)="$event.stopPropagation()">
            <div class="um__id">
              <app-avatar [name]="userName()" [color]="'#F5A623'" [size]="42" [online]="true" [photoUrl]="userPhoto()" />
              <div style="min-width:0"><div style="font-size:15px;font-weight:700">{{ userName() }}</div><div style="font-size:12.5px;color:var(--nx-text-500);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ userEmail() }}</div></div>
            </div>
            <div style="padding:8px">
              <button class="um__row" routerLink="/app/parametres/profil" (click)="close()"><app-icon name="gear" [size]="17" /><span>Paramètres</span></button>
            </div>
            <div style="padding:8px;border-top:1px solid var(--nx-border-card)">
              <button class="um__row um__row--danger" (click)="logout()"><app-icon name="logout" [size]="17" /><span>Se déconnecter</span></button>
            </div>
          </div>
        }
      </div>
    </header>
  `,
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private session = inject(SessionService);
  private router = inject(Router);
  private loader = inject(WorkspaceLoaderService);
  private toast = inject(ToastService);
  private bus = inject(ShellBus);
  private profileSvc = inject(UserProfileService);
  @Output() search = new EventEmitter<void>();

  menu = signal<Menu>(null);
  notifFilter = signal<'tout' | 'nonlu'>('tout');
  private readIds = signal<string[]>([]);

  /** Modifier-key glyph shown in the Ctrl+K hint (⌘ on macOS, Ctrl elsewhere). */
  readonly modKey: string = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl';

  userName = computed(() => this.profileSvc.displayName() || this.session.user()?.displayName || 'Akim Koné');
  userEmail = computed(() => this.session.user()?.email ?? 'akim.kone@nexa.io');
  userPhoto = computed(() => this.profileSvc.profile().photoDataUrl);
  /** Admin (OWNER + ADMIN) status of the active workspace — règles R3, R17. */
  isAdmin = this.session.isAdmin;
  /** OWNER status of the active workspace — règle REF C, badge Propriétaire. */
  isOwner = this.session.isOwner;
  wsName = computed(() => this.session.activeWorkspace().name);
  wsColor = computed(() => this.session.activeWorkspace().color);
  wsMono = computed(() => initials(this.session.activeWorkspace().name));

  /** Other workspaces the user belongs to — filtered from `session.workspaces()`. */
  others = computed(() => this.session.workspaces().filter(w => w.id !== this.session.activeWorkspaceId()));

  /** Human-readable label for a WorkspaceRole ('OWNER' → 'Propriétaire', etc.). */
  roleLabel(role: 'OWNER' | 'ADMIN' | 'MEMBER'): string {
    return role === 'OWNER' ? 'Propriétaire' : role === 'ADMIN' ? 'Administrateur' : 'Membre';
  }

  openCreateWorkspace(): void { this.close(); this.bus.openCreateWorkspace(); }

  callParts = [
    { i: 'SD', c: '#F2693C' }, { i: 'MB', c: '#6C70F0' }, { i: 'AN', c: '#2BB673' }, { i: 'YS', c: '#3AA9E0' }, { i: 'FT', c: '#E89A2C' },
  ];
  /** REF A — état d'appel actif ; le popover et le bouton ne sont montés que sur ce flag. */
  hasOngoingCall = this.session.hasOngoingCall;
  ongoingCall = this.session.ongoingCall;

  /** Tick tous les 1 s pour rafraîchir le chronomètre du popover. */
  private nowTick = signal(Date.now());
  private tickInterval = typeof window !== 'undefined' ? window.setInterval(() => this.nowTick.set(Date.now()), 1000) : null;
  /** Durée d'appel formatée mm:ss (piloté par `nowTick` et `startedAt`). */
  callElapsed = computed<string>(() => {
    const call = this.ongoingCall();
    if (!call) return '00:00';
    const s = Math.max(0, Math.floor((this.nowTick() - call.startedAt) / 1000));
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  });

  /** Raccrocher — libère la contrainte REF A et ferme le popover. */
  hangup(): void {
    const call = this.ongoingCall();
    this.session.endCall();
    this.close();
    if (call) this.toast.show({ message: 'Appel « ' + call.meetingTitle + ' » terminé' });
  }

  /** Revenir à la vue d'appel — navigue vers la réunion active. */
  focusCall(): void {
    const call = this.ongoingCall();
    this.close();
    if (call) this.router.navigate(['/app/reunions', call.id]);
  }
  /** Notifications of the active workspace (reload on workspace switch). */
  private notifsSvc = inject(NotificationsService);
  private fetched = workspaceSignal<Notif[]>(this.session, () => this.notifsSvc.list(), []);
  /** Notifications reçues en temps réel (STOMP), empilées au-dessus de la liste. */
  private pushed = signal<Notif[]>([]);
  notifs = computed<Notif[]>(() => [...this.pushed(), ...this.fetched()]);

  visibleNotifs = computed(() => {
    const list = this.visibleNotifsAll();
    return this.notifFilter() === 'nonlu' ? list.filter(n => !n.read) : list;
  });
  unread = computed(() => this.visibleNotifsAll().filter(n => !n.read).length);
  private visibleNotifsAll = computed(() => {
    const read = this.readIds();
    return this.notifs().map(n => ({ ...n, read: n.read || read.includes(n.id) }));
  });

  constructor() {
    // Réception temps réel : la notification s'ajoute en tête de la liste.
    this.notifsSvc.live().pipe(takeUntilDestroyed()).subscribe(n =>
      this.pushed.update(l => [n, ...l]));
  }

  toggle(m: Menu): void { this.menu.set(this.menu() === m ? null : m); }
  close(): void { this.menu.set(null); }
  /** Marque lue localement (retour immédiat) puis persiste côté serveur. */
  markRead(id: string): void {
    this.readIds.update(l => l.includes(id) ? l : [...l, id]);
    this.notifsSvc.markRead(id).subscribe({ error: () => {} });
  }
  ini(name: string): string { return initials(name); }
  logout(): void { this.close(); this.session.logout(); }

  /** Click handler for a notification row — mark as read, close the popover, then route to the right place. */
  openNotif(n: Notif): void {
    this.markRead(n.id);
    this.close();
    // Backend réel : `target` est l'URL cible calculée par le serveur.
    if (n.target.startsWith('/')) {
      this.router.navigateByUrl(n.target);
      return;
    }
    switch (n.kind) {
      case 'tache':
        // Task notifications (assignment, comment mention) open the task detail
        // modal directly — no need to navigate to the kanban first.
        this.bus.openTask(n.target);
        break;
      case 'message':
        this.router.navigate(['/app/conversations', n.target]);
        break;
      case 'document':
        this.bus.openDocument(n.target);
        break;
      case 'projet':
        this.router.navigate(['/app/projets', n.target, 'kanban']);
        break;
    }
  }

  /**
   * Switch the active workspace from the header menu.
   * Mirrors the prototype: close the menu → show fullscreen loader for 800 ms →
   * swap the active workspace, route to the accueil, and notify.
   */
  switchTo(o: { id: string; name: string }): void {
    if (o.id === this.session.activeWorkspaceId()) {
      this.close();
      return;
    }
    this.close();
    this.loader.show(800);
    setTimeout(() => {
      this.session.switchWorkspace(o.id);
      this.router.navigate(['/app/accueil/mes-taches']);
      this.toast.show({ message: 'Vous avez rejoint « ' + o.name + ' »' });
    }, 800);
  }
}
