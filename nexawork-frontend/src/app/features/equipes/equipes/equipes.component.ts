import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { MembersService } from '@core/services/members.service';
import { Member } from '@core/models/member.models';

interface Team { id: string; name: string; members: number; color: string; people: string[]; }
interface Loose { name: string; email: string; role: string; color: string; }
interface MemberPick { name: string; role?: string; color: string; me?: boolean; }

@Component({
  selector: 'app-equipes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap" (click)="closePopovers()">
      <!-- Toolbar : search + chef de projet + bouton + -->
      <div class="toolbar">
        <div class="search">
          <app-icon name="search" [size]="16" />
          <input
            [value]="q()"
            (input)="q.set($any($event.target).value)"
            placeholder="Rechercher une équipe ou un membre…"
            aria-label="Rechercher une équipe ou un membre" />
        </div>
        <span class="spacer"></span>

        @if (!readonly) {
          <div class="chefwrap">
            <button class="chef" [class.chef--on]="chefOpen()" [class.chef--set]="!!chef()" (click)="toggleChef($event)">
              @if (chef(); as c) {
                <span class="chef__a" [style.background]="memberColor(c)">{{ ini(c) }}</span>
                <span class="chef__t">
                  <span class="chef__l">Chef de projet</span>
                  <span class="chef__n">{{ c }}</span>
                </span>
                <span class="chef__cv"><app-icon name="chevronDown" [size]="15" /></span>
              } @else {
                <span class="chef__i"><app-icon name="user" [size]="17" /></span>
                <span class="chef__t">
                  <span class="chef__l chef__l--muted">Aucun chef de projet</span>
                </span>
                <span class="chef__as">Assigner</span>
              }
            </button>
            @if (chefOpen()) {
              <div class="picker" (click)="$event.stopPropagation()">
                <div class="picker__hd">Désigner un chef de projet</div>
                <input class="picker__q" [value]="chefQ()" (input)="chefQ.set($any($event.target).value)" placeholder="Rechercher une personne…" autofocus />
                <div class="picker__list">
                  @if (filteredMembers().length === 0) {
                    <div class="picker__empty">Aucune personne trouvée</div>
                  }
                  @for (m of filteredMembers(); track m.name) {
                    <button class="picker__row" (click)="pickChef(m.name)">
                      <span class="picker__a" [style.background]="m.color">{{ ini(m.name) }}</span>
                      <span class="picker__b">
                        <span class="picker__n">{{ m.name }}@if (m.me) { <span class="picker__me"> (moi)</span> }</span>
                        <span class="picker__r">{{ m.role || 'Membre' }}</span>
                      </span>
                      @if (chef() === m.name) { <span class="picker__ck"><app-icon name="check" [size]="16" /></span> }
                    </button>
                  }
                </div>
                @if (chef()) {
                  <button class="picker__rm" (click)="removeChef()">
                    <app-icon name="x" [size]="14" />Retirer le chef de projet
                  </button>
                }
              </div>
            }
          </div>

          <button class="add" title="Ajouter" (click)="bus.openInvite()">
            <app-icon name="plus" [size]="18" />
          </button>
        }
      </div>

      <!-- Cards d'équipes — filtrées par la recherche -->
      <div class="cards">
        @for (t of filteredTeams(); track t.id) {
          <div class="card" (click)="open(t.id)">
            <div class="card__top">
              <span class="card__ic" [style.background]="t.color"><app-icon name="teams" [size]="19" /></span>
              <div class="card__m">
                <div class="card__n">{{ t.name }}</div>
                <div class="card__s">{{ t.members }} membres</div>
              </div>
              @if (!readonly) {
                <button class="dots" (click)="$event.stopPropagation()"><app-icon name="dots" [size]="16" /></button>
              }
            </div>
            <div class="avs">
              @for (p of t.people; track $index; let i = $index) {
                <span class="av" [style.background]="palette[i % palette.length]" [style.margin-left.px]="i ? -8 : 0">{{ p }}</span>
              }
            </div>
          </div>
        } @empty {
          <div class="cards__empty">Aucune équipe ne correspond à votre recherche.</div>
        }
      </div>

      <!-- Membres sans équipe — filtrés par la recherche -->
      <div class="loose-h">Membres du projet sans équipe</div>
      <div class="loose">
        @for (m of filteredLoose(); track m.email; let i = $index) {
          <div class="lrow" [class.lrow--first]="i===0">
            <span class="lav" [style.background]="m.color">{{ ini(m.name) }}</span>
            <div class="b">
              <div class="ln">{{ m.name }}</div>
              <div class="le">{{ m.email }} · {{ m.role }}</div>
            </div>
            @if (!readonly) { <button class="assign">Assigner à une équipe</button> }
            @if (!readonly) { <button class="rm" title="Retirer du projet"><app-icon name="x" [size]="15" /></button> }
          </div>
        } @empty {
          <div class="loose__empty">Aucun membre ne correspond à votre recherche.</div>
        }
      </div>
    </div>
  `,
  styleUrl: './equipes.component.scss',
})
export class EquipesComponent implements OnInit {
  @Input() readonly = false;
  private router = inject(Router);
  private members = inject(MembersService);
  bus = inject(ShellBus);

  palette = ['#F2693C', '#6C70F0', '#2BB673', '#E0497B', '#3AA9E0'];

  q       = signal('');
  chef    = signal<string | null>(null);
  chefOpen = signal(false);
  chefQ   = signal('');

  /** Directory loaded once on init. */
  private directory = signal<Member[]>([]);

  teams: Team[] = [
    { id: 'design-produit',  name: 'Design produit',  members: 3, color: '#6C70F0', people: ['SD', 'AN', 'YS'] },
    { id: 'developpement',   name: 'Développement',  members: 4, color: '#2BB673', people: ['MB', 'AK', 'FT', 'YS'] },
    { id: 'qa-tests',        name: 'QA & Tests',      members: 2, color: '#E89A2C', people: ['AN', 'MB'] },
  ];
  loose: Loose[] = [
    { name: 'Khadija Fall', email: 'khadija.fall@nexa.io', role: 'Designer',     color: '#E0497B' },
    { name: 'Omar Cissé',   email: 'omar.cisse@nexa.io',   role: 'Développeur',  color: '#3AA9E0' },
  ];

  /** All members available for chef assignment (me first, then directory). */
  private allMembers = computed<MemberPick[]>(() => {
    const me  = { name: 'Akim Koné', role: 'Dev Backend', color: '#F5A623', me: true };
    return [me, ...this.directory().map(m => ({ name: m.name, role: m.role, color: m.color }))];
  });

  ngOnInit(): void {
    this.members.directory().subscribe(list => this.directory.set(list));
  }

  /** Members filtered by the chef-picker search query. */
  filteredMembers = computed<MemberPick[]>(() => {
    const q = this.chefQ().toLowerCase().trim();
    return this.allMembers().filter(m => m.name.toLowerCase().includes(q));
  });

  /** Teams filtered by the toolbar search (matches team name OR any member inside). */
  filteredTeams = computed<Team[]>(() => {
    const q = this.q().toLowerCase().trim();
    if (!q) return this.teams;
    return this.teams.filter(t =>
      t.name.toLowerCase().includes(q) ||
      this.teamHasMember(t, q),
    );
  });

  /** Loose members filtered by toolbar search (matches name, email, or role). */
  filteredLoose = computed<Loose[]>(() => {
    const q = this.q().toLowerCase().trim();
    if (!q) return this.loose;
    return this.loose.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q),
    );
  });

  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }

  open(id: string): void { this.router.navigate(['/app/equipes', id]); }

  toggleChef(ev: Event): void {
    ev.stopPropagation();
    const wasOpen = this.chefOpen();
    this.chefOpen.set(!wasOpen);
    if (!wasOpen) this.chefQ.set('');
  }

  pickChef(name: string): void {
    this.chef.set(name);
    this.chefOpen.set(false);
    this.chefQ.set('');
  }

  removeChef(): void {
    this.chef.set(null);
    this.chefOpen.set(false);
    this.chefQ.set('');
  }

  closePopovers(): void {
    if (this.chefOpen()) this.chefOpen.set(false);
  }

  memberColor(name: string): string {
    return this.allMembers().find(m => m.name === name)?.color ?? '#9b97a3';
  }

  private teamHasMember(t: Team, q: string): boolean {
    // team.people only holds initials — match against the full name via the directory.
    const initials = new Set(t.people);
    return this.directory().some(m =>
      initials.has(this.ini(m.name)) && m.name.toLowerCase().includes(q),
    );
  }
}
