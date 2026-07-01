import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';

interface Chan { n: string; icon: 'bell' | 'hash'; access: string; members: number; last: string; locked: boolean; }

@Component({
  selector: 'app-canaux-projet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <div class="toolbar">
        <div class="search"><app-icon name="search" [size]="16" /><span>Rechercher un canal…</span></div>
        <span class="spacer"></span>
        @if (!readonly) { <button class="create" (click)="bus.openNewChannel('project')"><app-icon name="plus" [size]="16" />Créer un canal</button> }
      </div>
      <div class="tbl">
        <div class="thead"><span>Canal</span><span>Accès</span><span>Membres</span><span>Activité</span></div>
        @for (c of chans; track c.n) {
          <div class="row" (click)="open(c.n)">
            <div class="name">
              <span class="ic" [class.ic--bell]="c.icon==='bell'">@if (c.icon==='bell') { <app-icon name="bell" [size]="17" /> } @else { # }</span>
              <span class="nm">{{ c.n }}</span>
              @if (c.locked) { <app-icon class="lock" name="lock" [size]="14" /> }
            </div>
            <span class="muted">{{ c.access }}</span>
            <span class="muted">{{ c.members }} membres</span>
            <span class="muted">{{ c.last }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './canaux-projet.component.scss',
})
export class CanauxProjetComponent {
  @Input() readonly = false;
  bus = inject(ShellBus);
  private router = inject(Router);
  chans: Chan[] = [
    { n: 'annonces-projet', icon: 'bell', access: 'Annonces · écriture restreinte', members: 8, last: 'il y a 2 h', locked: true },
    { n: 'général-projet', icon: 'hash', access: 'Ouvert à tous les membres', members: 8, last: 'il y a 14 min', locked: true },
    { n: 'dev-frontend', icon: 'hash', access: 'Ouvert à tous les membres', members: 5, last: 'il y a 1 j', locked: false },
    { n: 'design-revue', icon: 'hash', access: 'Écriture restreinte', members: 4, last: 'il y a 3 j', locked: false },
  ];
  open(n: string): void { this.router.navigate(['/app/canaux', n]); }
}
