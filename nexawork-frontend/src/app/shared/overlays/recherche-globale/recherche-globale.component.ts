import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Output, computed, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface Result { type: string; name: string; ctx: string; date: string; mono?: string; avatar?: string; color?: string; icon?: string; hash?: boolean; radio?: string; }

@Component({
  selector: 'app-recherche-globale',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <div class="in">
          <app-icon name="search" [size]="20" [stroke]="2" />
          <input autofocus placeholder="Rechercher une tâche, un document, un projet…" [value]="q()" (input)="q.set($any($event.target).value)" />
          <button class="esc" (click)="closed.emit()">Échap</button>
        </div>
        <div class="filters">
          @for (f of filters; track f.key) {
            <button class="chip" [class.chip--on]="filter()===f.key" (click)="filter.set(f.key)">
              @if (f.icon) { <app-icon [name]="f.icon" [size]="15" /> }{{ f.label }}
            </button>
          }
        </div>
        <div class="results">
          <div class="rh">{{ shown().length }} résultat{{ shown().length > 1 ? 's' : '' }}</div>
          @for (r of shown(); track r.name; let i = $index) {
            <div class="res" [class.res--first]="i===0">
              @if (r.avatar) { <span class="res__av" [style.background]="r.color">{{ r.avatar }}</span> }
              @else if (r.radio) { <span class="res__radio" [style.border-color]="r.radio"></span> }
              @else if (r.hash) { <span class="res__hash">#</span> }
              @else { <span class="res__ic" [style.color]="r.color || 'var(--nx-text-500)'"><app-icon [name]="r.icon || 'file'" [size]="18" /></span> }
              <div class="res__b">
                @if (r.mono) { <span class="res__mono nx-mono">{{ r.mono }}</span> }
                <span class="res__n">{{ r.name }}</span>
                <span class="res__ctx">{{ r.ctx }}</span>
              </div>
              <span class="res__d">{{ r.date }}</span>
            </div>
          }
        </div>
        <div class="foot">
          <span><span class="k">↑</span><span class="k">↓</span> naviguer</span>
          <span><span class="k">↵</span> ouvrir</span>
          <span><span class="k">Échap</span> fermer</span>
        </div>
      </div>
    </div>
  `,
  styleUrl: './recherche-globale.component.scss',
})
export class RechercheGlobaleComponent {
  @Output() closed = new EventEmitter<void>();
  q = signal('');
  filter = signal('tous');

  filters = [
    { key: 'tous', label: 'Tous', icon: '' },
    { key: 'taches', label: 'Tâches', icon: 'taskCheck' },
    { key: 'documents', label: 'Documents', icon: 'file' },
    { key: 'projets', label: 'Projets', icon: 'projects' },
    { key: 'canaux', label: 'Canaux', icon: 'hash' },
    { key: 'messages', label: 'Messages', icon: 'comment' },
    { key: 'personnes', label: 'Personnes', icon: 'teams' },
  ];

  private all: Result[] = [
    { type: 'projets', icon: 'projects', color: '#6C70F0', name: 'Refonte App Mobile', ctx: 'Projet', date: 'il y a 3 j' },
    { type: 'taches', mono: 'MOB-101', name: 'Wireframes écran onboarding', ctx: 'Tâche · Refonte App Mobile', date: "aujourd'hui", radio: '#8E8AA0' },
    { type: 'taches', mono: 'MOB-094', name: 'Intégration écran profil utilisateur', ctx: 'Tâche · Refonte App Mobile', date: 'il y a 1 j', radio: '#5B8DEF' },
    { type: 'documents', icon: 'file', color: '#F5564E', name: 'Specs fonctionnelles.pdf', ctx: 'Document · Refonte App Mobile', date: 'hier' },
    { type: 'canaux', hash: true, name: 'annonces', ctx: 'Canal · Organisation', date: 'il y a 2 h' },
    { type: 'canaux', hash: true, name: 'dev-frontend', ctx: 'Canal · Refonte App Mobile', date: 'il y a 2 j' },
    { type: 'messages', icon: 'comment', color: '#F2693C', name: 'Sarah Diallo : la maquette du profil est prête', ctx: 'Message · Conversation', date: 'il y a 14 min' },
    { type: 'personnes', avatar: 'SD', color: '#F2693C', name: 'Sarah Diallo', ctx: 'Chef de projet', date: 'En ligne' },
    { type: 'personnes', avatar: 'MB', color: '#6C70F0', name: 'Moussa Bâ', ctx: 'Développeur', date: 'En ligne' },
  ];

  shown = computed(() => {
    const f = this.filter();
    const q = this.q().toLowerCase().trim();
    return this.all.filter(r => (f === 'tous' || r.type === f) && (!q || r.name.toLowerCase().includes(q)));
  });

  @HostListener('document:keydown.escape') onEsc(): void { this.closed.emit(); }
}
