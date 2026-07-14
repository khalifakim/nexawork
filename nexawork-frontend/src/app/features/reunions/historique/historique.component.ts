import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MeetingsService } from '@core/services/meetings.service';
import { SessionService } from '@core/services/session.service';
import { ToastService } from '@core/services/toast.service';
import { Meeting } from '@core/models/meeting.models';
import { workspaceSignal } from '@core/util/workspace-signal';

@Component({
  selector: 'app-historique-reunions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <h1>Historique discussion réunion</h1>
        <p>Les réunions auxquelles vous avez été invité, que vous y ayez participé ou non.</p>

        <!-- Filtre par date + compteur -->
        <div class="filters">
          <div class="datewrap">
            <button class="dchip" [class.dchip--on]="dateFilter() !== 'all'" (click)="dateOpen.set(!dateOpen()); $event.stopPropagation()">
              <app-icon name="calendar" [size]="16" />{{ dateLabel() }}<app-icon name="chevronDown" [size]="14" />
            </button>
            @if (dateOpen()) {
              <div class="dbd" (click)="dateOpen.set(false)"></div>
              <div class="dmenu">
                @for (o of DATE_OPTS; track o.key) {
                  <button class="dmenu__i" [class.dmenu__i--on]="dateFilter()===o.key" (click)="dateFilter.set(o.key); dateOpen.set(false)">
                    {{ o.label }}
                    @if (dateFilter()===o.key) { <app-icon name="check" [size]="15" /> }
                  </button>
                }
              </div>
            }
          </div>
          <span class="count">{{ shown().length }} réunion{{ shown().length > 1 ? 's' : '' }}</span>
        </div>
      </div>

      <div class="card">
        <div class="hrow">
          <span>Réunion</span><span>Date</span><span>Durée</span><span>Participation</span><span></span>
        </div>
        @for (m of shown(); track m.id; let i = $index) {
          <div class="row" [class.row--first]="i===0" [class.row--menu]="menu()===m.id" (click)="open(m.id)">
            <div class="r-name">
              <span class="r-ic"><app-icon name="video" [size]="18" /></span>
              <div><div class="r-n">{{ m.name }}</div><div class="r-p">Réunion · {{ m.proj }}</div></div>
            </div>
            <div><div class="r-d">{{ m.date }}</div><div class="r-t">{{ m.time }}</div></div>
            <span class="r-dur">{{ m.dur }}</span>
            <span>
              @if (m.joined) { <span class="tag tag--ok"><app-icon name="check" [size]="13" [stroke]="2.4" />Participé</span> }
              @else { <span class="tag tag--no"><app-icon name="x" [size]="13" [stroke]="2.4" />Absent</span> }
            </span>
            <div class="act">
              <button class="dots" [class.dots--on]="menu()===m.id" (click)="toggleMenu(m.id, $event)"><app-icon name="dots" [size]="16" /></button>
              @if (menu()===m.id) {
                <div class="hbd" (click)="menu.set(null); $event.stopPropagation()"></div>
                <div class="hmenu" (click)="$event.stopPropagation()">
                  <button class="hmenu__i" (click)="hide(m)"><app-icon name="eyeOff" [size]="16" />Masquer de mon historique</button>
                  @if (isAdmin()) {
                    <button class="hmenu__i hmenu__i--danger" (click)="remove(m)"><app-icon name="trash" [size]="16" />Supprimer définitivement</button>
                  }
                </div>
              }
            </div>
          </div>
        } @empty {
          <div class="empty">Aucune réunion dans cette période.</div>
        }
      </div>
    </div>
  `,
  styleUrl: './historique.component.scss',
})
export class HistoriqueReunionsComponent {
  private router = inject(Router);
  private session = inject(SessionService);
  private meetingsSvc = inject(MeetingsService);
  private toast = inject(ToastService);

  isAdmin = this.session.isAdmin;
  private all = workspaceSignal<Meeting[]>(this.session, () => this.meetingsSvc.history(), []);
  private hidden = signal<string[]>([]);
  private removed = signal<string[]>([]);

  menu = signal<string | null>(null);
  dateOpen = signal(false);
  dateFilter = signal<'all' | 'week' | 'month' | 'quarter'>('all');

  readonly DATE_OPTS = [
    { key: 'all',     label: 'Toutes les dates' },
    { key: 'week',    label: 'Cette semaine' },
    { key: 'month',   label: 'Ce mois' },
    { key: 'quarter', label: 'Ce trimestre' },
  ] as const;

  dateLabel = computed(() => this.DATE_OPTS.find(o => o.key === this.dateFilter())?.label ?? 'Toutes les dates');

  /** Meetings after hide/delete + the date filter. */
  shown = computed<Meeting[]>(() => {
    const hidden = new Set([...this.hidden(), ...this.removed()]);
    return this.all().filter(m => !hidden.has(m.id) && this.withinDate(m.date));
  });

  /** French month → month index, for the date filter buckets. */
  private static readonly MONTHS: Record<string, number> = {
    'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3, 'mai': 4, 'juin': 5,
    'juil.': 6, 'août': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11,
  };

  private withinDate(dateStr: string): boolean {
    const f = this.dateFilter();
    if (f === 'all') return true;
    const parts = dateStr.split(' ');
    if (parts.length < 3) return true;
    const d = new Date(+parts[2], HistoriqueReunionsComponent.MONTHS[parts[1]] ?? 0, +parts[0]);
    const diff = (Date.now() - d.getTime()) / 86_400_000;
    if (f === 'week') return diff <= 7;
    if (f === 'month') return diff <= 31;
    if (f === 'quarter') return diff <= 92;
    return true;
  }

  toggleMenu(id: string, ev: Event): void { ev.stopPropagation(); this.menu.set(this.menu() === id ? null : id); }

  /**
   * Masquage et suppression PERSISTÉS. Les deux se contentaient d'alimenter un
   * signal local et d'afficher un toast affirmant « supprimée définitivement » :
   * aucune requête n'atteignait jamais le serveur, et tout réapparaissait au
   * rechargement. Le masquage local n'est appliqué qu'APRÈS confirmation du
   * serveur — sinon la ligne disparaîtrait de l'écran d'un utilisateur à qui
   * REF B vient de refuser la suppression (403).
   */
  hide(m: Meeting): void {
    this.menu.set(null);
    this.meetingsSvc.hide(m.id).subscribe({
      next: () => {
        this.hidden.update(l => [...l, m.id]);
        this.toast.show({ message: '« ' + m.name + ' » masquée de votre historique' });
      },
      error: () => this.toast.show({ message: 'Impossible de masquer « ' + m.name + ' ».', icon: 'warning' }),
    });
  }

  remove(m: Meeting): void {
    this.menu.set(null);
    this.meetingsSvc.remove(m.id).subscribe({
      next: () => {
        this.removed.update(l => [...l, m.id]);
        this.toast.show({ message: '« ' + m.name + ' » supprimée définitivement' });
      },
      error: () => this.toast.show({ message: 'Impossible de supprimer « ' + m.name + ' ».', icon: 'warning' }),
    });
  }

  open(id: string): void { this.router.navigate(['/app/reunions/historique', id]); }
}
