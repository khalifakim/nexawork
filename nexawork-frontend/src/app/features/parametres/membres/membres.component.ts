import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { ConfirmDialogComponent } from '@shared/overlays/confirm-dialog/confirm-dialog.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { ToastService } from '@core/services/toast.service';
import { SessionService } from '@core/services/session.service';
import { WorkspaceService } from '@core/services/workspace.service';
import { WorkspaceMemberAdmin } from '@core/models/member.models';

type WsRole = 'Propriétaire' | 'Administrateur' | 'Membre';
interface Row { memberId: string; name: string; email: string; role: WsRole; color: string; me?: boolean; active: boolean; }

const ROLE_FR: Record<string, WsRole> = { OWNER: 'Propriétaire', ADMIN: 'Administrateur', MEMBER: 'Membre' };

/**
 * « Membres » — search box (live), role dropdown (Membre / Administrateur),
 * activate/deactivate switch, and Retirer with confirmation dialog.
 * Faithful to `settingsPersonnes()` in the prototype.
 */
@Component({
  selector: 'app-param-membres',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AvatarComponent, ConfirmDialogComponent],
  template: `
    <div class="set-page"><div class="set-inner">
      <h1 class="set-h1">Membres</h1>
      <p class="set-desc">Gérez les membres de votre espace de travail.</p>
      <div class="bar">
        <div class="search">
          <app-icon name="search" [size]="16" />
          <input [value]="query()" (input)="query.set($any($event.target).value)"
                 placeholder="Rechercher un membre…" aria-label="Rechercher un membre" />
        </div>
        <button class="set-btn set-btn--primary" (click)="bus.openInvite()">
          <app-icon name="plus" [size]="16" />Inviter des personnes
        </button>
      </div>

      <div class="set-card">
        @for (m of visible(); track m.email; let i = $index) {
          <div class="mrow" [class.mrow--first]="i===0" [class.mrow--inactive]="!m.active">
            <app-avatar [name]="m.name" [color]="m.active ? m.color : '#C9C5BD'" [size]="38" />
            <div class="b">
              <div class="n">
                {{ m.name }}
                @if (m.me) { <span class="you">(vous)</span> }
                @if (!m.active) { <span class="off">Désactivé</span> }
              </div>
              <div class="e">{{ m.email }}</div>
            </div>

            <div class="role-wrap">
              @if (m.role === 'Propriétaire') {
                <span class="set-badge set-badge--owner">Propriétaire</span>
              } @else {
                <button class="set-badge set-badge--admin roleBtn"
                        [class.set-badge--admin]="m.role==='Administrateur'"
                        [class.set-badge--member]="m.role==='Membre'"
                        (click)="toggleRoleMenu(m.email, $event)" title="Changer le rôle">
                  <span>{{ m.role }}</span>
                  <app-icon name="chevronDown" [size]="12" [stroke]="2.4" />
                </button>
                @if (roleMenu() === m.email) {
                  <div class="bd" (click)="roleMenu.set(null)"></div>
                  <div class="role-menu">
                    <button class="role-menu__i" [class.role-menu__i--on]="m.role==='Membre'"
                            (click)="setRole(m.email, 'Membre'); $event.stopPropagation()">
                      <span class="role-menu__d" style="background:#9b97a3"></span>
                      <span style="flex:1">Membre</span>
                      @if (m.role==='Membre') { <app-icon name="check" [size]="15" /> }
                    </button>
                    <button class="role-menu__i" [class.role-menu__i--on]="m.role==='Administrateur'"
                            (click)="setRole(m.email, 'Administrateur'); $event.stopPropagation()">
                      <span class="role-menu__d" style="background:var(--nx-indigo)"></span>
                      <span style="flex:1">Administrateur</span>
                      @if (m.role==='Administrateur') { <app-icon name="check" [size]="15" /> }
                    </button>
                  </div>
                }
              }
            </div>

            @if (m.role !== 'Propriétaire') {
              <button class="toggle" [class.toggle--on]="m.active"
                      [title]="m.active ? 'Désactiver le compte' : 'Réactiver le compte'"
                      (click)="toggleActive(m.email)">
                <span class="toggle__knob"></span>
              </button>
              <div class="menu-wrap">
                <button class="dots" [class.dots--on]="dotsMenu()===m.email"
                        (click)="toggleDotsMenu(m.email, $event)">
                  <app-icon name="dots" [size]="16" />
                </button>
                @if (dotsMenu() === m.email) {
                  <div class="bd" (click)="dotsMenu.set(null)"></div>
                  <div class="menu">
                    <button class="menu__i menu__i--danger" (click)="askRemove(m); dotsMenu.set(null)">
                      <app-icon name="trash" [size]="15" />Retirer du workspace
                    </button>
                  </div>
                }
              </div>
            } @else {
              <span style="width: 68px"></span>
            }
          </div>
        } @empty {
          <div class="empty">Aucun membre trouvé.</div>
        }
      </div>
    </div></div>

    @if (removing(); as r) {
      <app-confirm-dialog
        [danger]="true"
        title="Retirer du workspace"
        [subtitle]="r.name"
        icon="trash"
        confirmLabel="Retirer"
        [lines]="removeLines"
        (confirmed)="confirmRemove(r)"
        (closed)="removing.set(null)" />
    }
  `,
  styleUrl: './membres.component.scss',
})
export class ParamMembresComponent implements OnInit {
  bus = inject(ShellBus);
  private toast = inject(ToastService);
  private session = inject(SessionService);
  private workspaceService = inject(WorkspaceService);

  query = signal('');
  roleMenu = signal<string | null>(null);
  dotsMenu = signal<string | null>(null);
  removing = signal<Row | null>(null);

  readonly removeLines = [
    "Le membre perd immédiatement l'accès à ce workspace et à ses projets.",
    'Cette action est irréversible ; il devra être ré-invité pour revenir.',
  ];

  private all = signal<Row[]>([]);

  ngOnInit(): void {
    const myId = this.session.user()?.id;
    this.workspaceService.members(this.session.activeWorkspaceId()).subscribe(list =>
      this.all.set(list.map((m: WorkspaceMemberAdmin) => ({
        memberId: m.memberId, name: m.name, email: m.email, role: ROLE_FR[m.role], color: m.color,
        me: m.userId === myId, active: m.active,
      }))));
  }

  private memberIdByEmail(email: string): string | undefined {
    return this.all().find(m => m.email === email)?.memberId;
  }

  visible = computed<Row[]>(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.all();
    return this.all().filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q),
    );
  });

  toggleRoleMenu(email: string, ev: Event): void {
    ev.stopPropagation();
    this.dotsMenu.set(null);
    this.roleMenu.set(this.roleMenu() === email ? null : email);
  }
  toggleDotsMenu(email: string, ev: Event): void {
    ev.stopPropagation();
    this.roleMenu.set(null);
    this.dotsMenu.set(this.dotsMenu() === email ? null : email);
  }
  setRole(email: string, role: WsRole): void {
    this.roleMenu.set(null);
    const id = this.memberIdByEmail(email);
    if (!id || role === 'Propriétaire') return;
    const backendRole = role === 'Administrateur' ? 'ADMIN' : 'MEMBER';
    this.workspaceService.changeMemberRole(id, backendRole).subscribe(() => {
      this.all.update(list => list.map(m => m.email === email ? { ...m, role } : m));
      this.toast.show({ message: 'Rôle mis à jour' });
    });
  }
  toggleActive(email: string): void {
    const row = this.all().find(m => m.email === email);
    if (!row) return;
    const next = !row.active;
    this.workspaceService.toggleMemberActive(row.memberId, next).subscribe(() => {
      this.all.update(list => list.map(m => m.email === email ? { ...m, active: next } : m));
      this.toast.show({ message: next ? 'Membre réactivé' : 'Membre désactivé' });
    });
  }

  askRemove(m: Row): void { this.removing.set(m); }
  confirmRemove(m: Row): void {
    this.workspaceService.removeMember(m.memberId).subscribe(() => {
      this.all.update(list => list.filter(x => x.memberId !== m.memberId));
      this.removing.set(null);
      this.toast.show({ message: 'Membre retiré du workspace' });
    });
  }
}
