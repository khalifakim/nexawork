import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';

interface Inv { email: string; role: 'Administrateur' | 'Membre'; by: string; date: string; }

@Component({
  selector: 'app-param-invitations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="set-page"><div class="set-inner">
      <h1 class="set-h1">Invitations</h1>
      <p class="set-desc">Les invitations envoyées, en attente d'acceptation.</p>
      <div class="bar">
        <span class="cnt">{{ all.length }} invitations en attente</span>
        <span style="flex:1"></span>
        <button class="set-btn set-btn--primary" (click)="bus.openInvite()"><app-icon name="plus" [size]="16" />Inviter des personnes</button>
      </div>
      <div class="set-card">
        @for (inv of all; track inv.email; let i = $index) {
          <div class="row" [class.row--first]="i===0">
            <span class="ic"><app-icon name="mail" [size]="18" /></span>
            <div class="b"><div class="e">{{ inv.email }}</div><div class="m">Invité par {{ inv.by }} · {{ inv.date }}</div></div>
            <span class="set-badge" [class.set-badge--admin]="inv.role==='Administrateur'" [class.set-badge--member]="inv.role==='Membre'">{{ inv.role }}</span>
            <span class="status"><span class="status__d"></span>En attente</span>
            <button class="rs"><app-icon name="refresh" [size]="15" />Relancer</button>
            <button class="cx"><app-icon name="x" [size]="15" /></button>
          </div>
        }
      </div>
    </div></div>
  `,
  styleUrl: './invitations.component.scss',
})
export class ParamInvitationsComponent {
  bus = inject(ShellBus);
  all: Inv[] = [
    { email: 'camille.roy@gmail.com', role: 'Membre', by: 'Akim Koné', date: 'Il y a 2 jours' },
    { email: 'designer@studio.fr', role: 'Administrateur', by: 'Sarah Diallo', date: 'Il y a 5 jours' },
    { email: 'omar.cisse@externe.io', role: 'Membre', by: 'Akim Koné', date: 'Il y a 1 semaine' },
  ];
}
