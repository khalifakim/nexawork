import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface RailItem { label: string; icon: string; link: string; }

/** Sidebar 1 — dark rail, 76px. 7 sections + a detached Inviter button. */
@Component({
  selector: 'app-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav class="rail">
      <div class="rail__top">
        @if (collapsed) {
          <button class="expand" title="Développer" (click)="expand.emit()">
            <app-icon name="chevronRight" [size]="16" [stroke]="2.2" />
          </button>
        }
        @for (it of items; track it.link) {
          <a class="rail__btn" [routerLink]="it.link" routerLinkActive="rail__btn--on">
            <app-icon [name]="it.icon" [size]="21" />
            <span>{{ it.label }}</span>
          </a>
        }
      </div>
      <div class="rail__bottom">
        <div class="rail__sep"></div>
        <button class="rail__invite" title="Inviter des membres" (click)="invite.emit()">
          <app-icon name="invite" [size]="21" />
          <span>Inviter</span>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .rail { width: 76px; height: 100%; background: var(--nx-ink); display: flex; flex-direction: column; align-items: center; padding-top: 8px; position: relative; box-sizing: border-box; }
    .rail__top { display: flex; flex-direction: column; align-items: center; gap: 1px; width: 100%; padding-bottom: 80px; }
    .rail__bottom { position: absolute; bottom: 10px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; }
    .expand { width: 34px; height: 30px; border: none; border-radius: 8px; background: rgba(255,255,255,.06); color: rgba(255,255,255,.6); display: flex; align-items: center; justify-content: center; cursor: pointer; margin-bottom: 6px; }
    .expand:hover { background: rgba(255,255,255,.14); }
    .rail__btn { width: 60px; padding: 6px 0 5px; border: none; border-radius: 12px; background: transparent;
      color: rgba(255,255,255,.52); display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; transition: background .12s, color .12s; text-decoration: none; }
    .rail__btn:hover { background: rgba(255,255,255,.06); }
    .rail__btn span { font-size: 9px; font-weight: 500; white-space: nowrap; }
    .rail__btn--on { background: rgba(108,112,240,.20); color: #fff; }
    .rail__btn--on:hover { background: rgba(108,112,240,.20); }
    .rail__sep { width: 44px; height: 1px; background: rgba(255,255,255,.1); margin-bottom: 8px; }
    .rail__invite { width: 60px; padding: 6px 0 5px; border: none; border-radius: 12px; background: rgba(108,112,240,.16);
      color: #A6A8F7; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; }
    .rail__invite span { font-size: 9px; font-weight: 500; }
    .rail__invite:hover { background: rgba(108,112,240,.28); }
  `],
})
export class RailComponent {
  @Input() collapsed = false;
  @Output() invite = new EventEmitter<void>();
  @Output() expand = new EventEmitter<void>();

  items: RailItem[] = [
    { label: 'Accueil',       icon: 'home',          link: '/app/accueil' },
    { label: 'Projets',       icon: 'projects',      link: '/app/projets' },
    { label: 'Équipes',       icon: 'teams',         link: '/app/equipes' },
    { label: 'Documents',     icon: 'documents',     link: '/app/documents' },
    { label: 'Canaux',        icon: 'channels',      link: '/app/canaux' },
    { label: 'Conversations', icon: 'conversations', link: '/app/conversations' },
    { label: 'Réunions',      icon: 'meetings',      link: '/app/reunions' },
  ];
}
