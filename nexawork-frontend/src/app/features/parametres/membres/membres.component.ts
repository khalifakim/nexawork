import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';

interface Row { name: string; email: string; role: 'Propriétaire' | 'Administrateur' | 'Membre'; color: string; me?: boolean; active: boolean; }

@Component({
  selector: 'app-param-membres',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AvatarComponent],
  template: `
    <div class="set-page"><div class="set-inner">
      <h1 class="set-h1">Membres</h1>
      <p class="set-desc">Gérez les membres de votre espace de travail.</p>
      <div class="bar">
        <div class="search"><app-icon name="search" [size]="16" /><span>Rechercher un membre…</span></div>
        <button class="set-btn set-btn--primary" (click)="bus.openInvite()"><app-icon name="plus" [size]="16" />Inviter des personnes</button>
      </div>
      <div class="set-card">
        @for (m of people(); track m.email; let i = $index) {
          <div class="mrow" [class.mrow--first]="i===0" [class.mrow--inactive]="!m.active">
            <app-avatar [name]="m.name" [color]="m.color" [size]="38" />
            <div class="b">
              <div class="n">{{ m.name }} @if (m.me) { <span class="you">(vous)</span> }</div>
              <div class="e">{{ m.email }}</div>
            </div>
            <span class="set-badge"
              [class.set-badge--owner]="m.role==='Propriétaire'"
              [class.set-badge--admin]="m.role==='Administrateur'"
              [class.set-badge--member]="m.role==='Membre'">{{ m.role }}</span>

            @if (m.role !== 'Propriétaire') {
              <button class="toggle" [class.toggle--on]="m.active" title="{{ m.active ? 'Désactiver le compte' : 'Activer le compte' }}" (click)="toggleActive(i)">
                <span class="toggle__knob"></span>
              </button>
              <div class="menu-wrap">
                <button class="dots" (click)="menuOpen.set(menuOpen() === i ? -1 : i); $event.stopPropagation()">
                  <app-icon name="dots" [size]="16" />
                </button>
                @if (menuOpen() === i) {
                  <div class="bd" (click)="menuOpen.set(-1)"></div>
                  <div class="menu">
                    <button class="menu__i menu__i--danger" (click)="remove(i); menuOpen.set(-1)">
                      <app-icon name="trash" [size]="15" />Retirer du workspace
                    </button>
                  </div>
                }
              </div>
            } @else {
              <span style="width: 68px"></span>
            }
          </div>
        }
      </div>
    </div></div>
  `,
  styleUrl: './membres.component.scss',
})
export class ParamMembresComponent {
  bus = inject(ShellBus);
  menuOpen = signal(-1);

  people = signal<Row[]>([
    { name: 'Akim Koné',      email: 'akim.kone@nexa.io',     role: 'Propriétaire',   color: '#F2693C', me: true, active: true },
    { name: 'Sarah Diallo',   email: 'sarah.diallo@nexa.io',  role: 'Administrateur', color: '#6C70F0',           active: true },
    { name: 'Moussa Bâ',      email: 'moussa.ba@nexa.io',     role: 'Membre',         color: '#2BB673',           active: true },
    { name: 'Aïda Ndiaye',    email: 'aida.ndiaye@nexa.io',   role: 'Membre',         color: '#E0497B',           active: false },
    { name: 'Yacine Sow',     email: 'yacine.sow@nexa.io',    role: 'Membre',         color: '#3AA9E0',           active: true },
    { name: 'Fatou Traoré',   email: 'fatou.traore@nexa.io',  role: 'Administrateur', color: '#E89A2C',           active: true },
  ]);

  toggleActive(i: number): void {
    this.people.update(list => list.map((m, idx) => idx === i ? { ...m, active: !m.active } : m));
  }
  remove(i: number): void {
    this.people.update(list => list.filter((_, idx) => idx !== i));
  }
}
