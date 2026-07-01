import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '@core/services/session.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { LogoComponent } from '@shared/ui/logo/logo.component';
import { initials } from '@core/util/ui.util';

type Menu = 'ws' | 'user' | 'notif' | 'call' | null;

interface Notif { id: string; actor: string; ac: string; title: string; text: string; date: string; read?: boolean; }

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
            <span class="ws__logo">N</span>
            <span class="ws__t"><span class="ws__name">{{ wsName() }}</span><span class="ws__sub">12 membres</span></span>
            <app-icon name="chevronDown" [size]="13" [stroke]="2.4" />
          </button>
          @if (menu() === 'ws') { <div class="bd" (click)="close()"></div>
            <div class="pop pop--ws" (click)="$event.stopPropagation()">
              <div class="wsm__head">
                <div style="display:flex;align-items:center;gap:11px;margin-bottom:11px">
                  <span class="wsm__logo">N</span>
                  <div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:700">{{ wsName() }}</div><div style="font-size:12.5px;color:var(--nx-text-500)">12 membres</div></div>
                  <button class="iconbtn" routerLink="/app/parametres/general" (click)="close()"><app-icon name="gear" [size]="17" /></button>
                </div>
                <div style="display:flex;gap:7px">
                  <span class="badge badge--indigo">Administrateur</span>
                  <span class="badge badge--amber">Propriétaire</span>
                </div>
              </div>
              <div class="wsm__sec">
                <div class="wsm__h">Autres espaces de travail</div>
                @for (o of others; track o.name) {
                  <button class="wsm__row"><span class="wsm__av" [style.background]="o.color">{{ o.name[0] }}</span>
                    <span style="flex:1"><span style="display:block;font-size:13.5px;font-weight:600">{{ o.name }}</span><span style="font-size:11.5px;color:var(--nx-text-500)">{{ o.role }}</span></span>
                    <span style="font-size:12px;font-weight:600;color:var(--nx-indigo)">Basculer</span></button>
                }
              </div>
              <div class="wsm__sec"><button class="wsm__row"><app-icon name="plus" [size]="17" /><span>Créer un espace de travail</span></button></div>
            </div>
          }
        </div>
      </div>

      <!-- center: search -->
      <div class="hd__center">
        <button class="search" (click)="search.emit()">
          <app-icon name="search" [size]="15" [stroke]="2" />
          <span>Rechercher dans {{ wsName() }}…</span>
          <span class="kbd">⌘K</span>
        </button>
      </div>

      <!-- right: call, notif, avatar -->
      <div class="hd__right">
        <button class="ico ico--call" title="Appel en cours" (click)="toggle('call')">
          <app-icon name="video" [size]="18" [stroke]="2" /><span class="pulse"></span>
        </button>
        @if (menu() === 'call') { <div class="bd" (click)="close()"></div>
          <div class="pop pop--call" (click)="$event.stopPropagation()">
            <div class="call__head">
              <div style="display:flex;align-items:center;gap:9px;margin-bottom:12px">
                <span class="pulse pulse--lg"></span>
                <span style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.85)">Appel en cours</span>
                <span class="nx-mono" style="margin-left:auto;font-size:13px;font-weight:600;color:rgba(255,255,255,.85)">04:12</span>
              </div>
              <div style="font-size:16px;font-weight:700;margin-bottom:3px">Revue sprint 12</div>
              <div style="font-size:12.5px;color:rgba(255,255,255,.8)">Réunion · Refonte App Mobile</div>
            </div>
            <div style="padding:14px 18px 6px">
              <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--nx-text-400);margin-bottom:11px">5 participants</div>
              <div style="display:flex;align-items:center">
                @for (p of callParts; track p.i; let idx = $index) {
                  <span class="stack" [style.background]="p.c" [style.margin-left.px]="idx ? -9 : 0">{{ p.i }}</span>
                }
                <span style="margin-left:12px;font-size:13px;color:var(--nx-text-500)">Sarah, Moussa et 3 autres</span>
              </div>
            </div>
            <div style="padding:12px 18px 18px;display:flex;gap:10px">
              <button class="call__ignore" (click)="close()"><app-icon name="x" [size]="17" /></button>
              <button class="call__join"><app-icon name="video" [size]="17" [stroke]="2" />Rejoindre</button>
            </div>
          </div>
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
                <div class="nm__row" [class.nm__row--unread]="!n.read" (click)="markRead(n.id)">
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
          <app-avatar [name]="userName()" [color]="'#F5A623'" [size]="30" [online]="true" ring="#16131F" />
          <app-icon name="chevronDown" [size]="13" [stroke]="2.4" />
        </button>
        @if (menu() === 'user') { <div class="bd" (click)="close()"></div>
          <div class="pop pop--user" (click)="$event.stopPropagation()">
            <div class="um__id">
              <app-avatar [name]="userName()" [color]="'#F5A623'" [size]="42" [online]="true" />
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
  @Output() search = new EventEmitter<void>();

  menu = signal<Menu>(null);
  notifFilter = signal<'tout' | 'nonlu'>('tout');
  private readIds = signal<string[]>([]);

  userName = computed(() => this.session.user()?.displayName ?? 'Akim Koné');
  userEmail = computed(() => this.session.user()?.email ?? 'akim.kone@nexa.io');
  wsName = computed(() => this.session.user()?.organisationName ?? 'Atelier Nexa');

  others = [
    { name: 'Studio Lumen', color: '#2BB673', role: 'Membre' },
    { name: 'Projets Perso', color: '#E0497B', role: 'Administrateur' },
  ];
  callParts = [
    { i: 'SD', c: '#F2693C' }, { i: 'MB', c: '#6C70F0' }, { i: 'AN', c: '#2BB673' }, { i: 'YS', c: '#3AA9E0' }, { i: 'FT', c: '#E89A2C' },
  ];
  notifs: Notif[] = [
    { id: 'n1', actor: 'Sarah Diallo', ac: '#F2693C', title: 'Nouvelle tâche assignée', text: 'Sarah Diallo vous a assigné « Intégration écran profil utilisateur » dans Refonte App Mobile.', date: 'Il y a 1 minute' },
    { id: 'n2', actor: 'Moussa Bâ', ac: '#6C70F0', title: 'Mention dans un commentaire', text: '@Akim peux-tu valider la maquette du profil avant ce soir ?', date: 'Il y a 18 minutes' },
    { id: 'n3', actor: 'Aïda Ndiaye', ac: '#2BB673', title: 'Nouveau message', text: 'Aïda Ndiaye : on cale un point demain matin ?', date: 'Il y a 2 heures' },
    { id: 'n4', actor: 'Yacine Sow', ac: '#E0497B', title: 'Document partagé', text: 'Yacine Sow a partagé « Specs fonctionnelles.pdf » avec vous.', date: 'Il y a 5 heures', read: true },
    { id: 'n5', actor: 'Fatou Traoré', ac: '#3AA9E0', title: 'Ajout à un projet', text: 'Vous avez été ajouté au projet « Campagne Q3 Marketing ».', date: 'Hier', read: true },
  ];

  visibleNotifs = computed(() => {
    const read = this.readIds();
    const list = this.notifs.map(n => ({ ...n, read: n.read || read.includes(n.id) }));
    return this.notifFilter() === 'nonlu' ? list.filter(n => !n.read) : list;
  });
  unread = computed(() => this.visibleNotifsAll().filter(n => !n.read).length);
  private visibleNotifsAll = computed(() => {
    const read = this.readIds();
    return this.notifs.map(n => ({ ...n, read: n.read || read.includes(n.id) }));
  });

  toggle(m: Menu): void { this.menu.set(this.menu() === m ? null : m); }
  close(): void { this.menu.set(null); }
  markRead(id: string): void { this.readIds.update(l => l.includes(id) ? l : [...l, id]); }
  ini(name: string): string { return initials(name); }
  logout(): void { this.close(); this.session.logout(); }
}
