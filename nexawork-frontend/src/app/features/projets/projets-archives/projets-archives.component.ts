import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ConfirmDialogComponent } from '@shared/overlays/confirm-dialog/confirm-dialog.component';
import { FilterChipComponent, FilterOption } from '@shared/ui/filter-chip/filter-chip.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';

interface Arch { n: string; dot: string; chef: string; members: number; date: string; }

@Component({
  selector: 'app-projets-archives',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ConfirmDialogComponent, FilterChipComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <button class="back" (click)="back()"><app-icon name="chevronLeft" [size]="14" />Retour aux projets actifs</button>
        <div class="tt">
          <span class="ic"><app-icon name="archive" [size]="19" /></span>
          <h1>Projets archivés</h1>
          <span class="cnt">{{ all.length }}</span>
        </div>
        <p>Réservé à l'administrateur. Restaurez un projet pour le réactiver, ou supprimez-le définitivement.</p>
        <div class="filters">
          <div class="search"><app-icon name="search" [size]="16" /><input placeholder="Rechercher un projet archivé…" [value]="q()" (input)="q.set($any($event.target).value)" /></div>
          <app-filter-chip label="Chef de projet" [options]="CHEF_OPTS" [value]="chefFilter()" (valueChange)="chefFilter.set($event)" />
          <app-filter-chip label="Date d'archivage" [options]="DATE_OPTS" [value]="dateFilter()" (valueChange)="dateFilter.set($event)" />
        </div>
      </div>
      <div class="tbl">
        <div class="thead"><span>Projet</span><span>Chef de projet</span><span>Membres</span><span>Archivé le</span><span></span></div>
        @for (p of shown(); track p.n) {
          <div class="row" (click)="openProj(p)">
            <div class="name"><span class="dot" [style.background]="p.dot"><app-icon name="projects" [size]="16" /></span><span class="nm">{{ p.n }}</span></div>
            <span class="muted">{{ p.chef }}</span>
            <span class="muted">{{ p.members }} membres</span>
            <span class="muted">{{ p.date }}</span>
            <div class="acts" (click)="$event.stopPropagation()">
              <button class="restore" (click)="remove(p.n)"><app-icon name="restore" [size]="14" />Restaurer</button>
              <button class="del" title="Supprimer définitivement" (click)="confirmTarget.set(p.n)"><app-icon name="trash" [size]="15" /></button>
            </div>
          </div>
        } @empty { <div class="empty">Aucun projet archivé</div> }
      </div>
    </div>

    @if (confirmTarget(); as target) {
      <app-confirm-dialog
        [danger]="true"
        title="Supprimer définitivement"
        [subtitle]="target"
        icon="trash"
        confirmLabel="Supprimer définitivement"
        [lines]="[
          'Cette suppression est irréversible.',
          'Le projet archivé et toutes ses ressources seront définitivement supprimés.'
        ]"
        (confirmed)="doDelete()"
        (closed)="confirmTarget.set(null)" />
    }

    @if (toastMsg()) {
      <div class="toast">
        <span class="toast__i"><app-icon name="check" [size]="14" /></span>
        <span class="toast__t">{{ toastMsg() }}</span>
        <button class="toast__x" (click)="toastMsg.set(null)"><app-icon name="x" [size]="14" /></button>
      </div>
    }
  `,
  styleUrl: './projets-archives.component.scss',
})
export class ProjetsArchivesComponent {
  private router = inject(Router);
  private bus = inject(ShellBus);
  q = signal('');
  private removed = signal<string[]>([]);
  confirmTarget = signal<string | null>(null);
  toastMsg = signal<string | null>(null);
  private _t: any;

  chefFilter = signal<string | null>(null);
  dateFilter = signal<string | null>(null);

  readonly CHEF_OPTS: FilterOption[] = [
    { value: 'Sarah Diallo', label: 'Sarah Diallo', dot: '#F2693C' },
    { value: 'Moussa Bâ',    label: 'Moussa Bâ',    dot: '#6C70F0' },
    { value: 'Aïda Ndiaye',  label: 'Aïda Ndiaye',  dot: '#2BB673' },
    { value: 'Akim Koné',    label: 'Akim Koné',    dot: '#F5A623' },
  ];
  readonly DATE_OPTS: FilterOption[] = [
    { value: '7j',  label: '7 derniers jours' },
    { value: '30j', label: '30 derniers jours' },
    { value: '90j', label: '3 derniers mois' },
  ];

  all: Arch[] = [
    { n: 'Ancienne Landing 2024', dot: '#8E8AA0', chef: 'Akim Koné',   members: 5, date: '12 mars 2025' },
    { n: 'Refonte Newsletter',     dot: '#8E8AA0', chef: 'Sarah Diallo', members: 4, date: '3 févr. 2025' },
  ];

  shown = computed(() => {
    const q = this.q().toLowerCase().trim();
    const chef = this.chefFilter();
    const date = this.dateFilter();
    const rm = this.removed();
    return this.all.filter(p => {
      if (rm.includes(p.n)) return false;
      if (q && !p.n.toLowerCase().includes(q)) return false;
      if (chef && p.chef !== chef) return false;
      if (date && !this.withinDate(p.date, date)) return false;
      return true;
    });
  });

  /** French month → 0-based index, for the "Date d'archivage" filter (mirrors the prototype). */
  private static readonly MONTHS: Record<string, number> = {
    'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3, 'mai': 4, 'juin': 5,
    'juil.': 6, 'août': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11,
  };

  private withinDate(dateStr: string, bucket: string): boolean {
    const parts = dateStr.split(' ');
    if (parts.length < 3) return true;
    const d = new Date(+parts[2], ProjetsArchivesComponent.MONTHS[parts[1]] ?? 0, +parts[0]);
    const diff = (Date.now() - d.getTime()) / 86_400_000;
    if (bucket === '7j')  return diff <= 7;
    if (bucket === '30j') return diff <= 30;
    if (bucket === '90j') return diff <= 90;
    return true;
  }

  remove(n: string): void { this.removed.update(l => [...l, n]); }
  /**
   * Return from the archived-projects area back to the active projects list.
   * Force sidebar 2 to expand — the user asked to "see all active projects",
   * which are listed there. The section itself doesn't change (still `projets`)
   * so the router-level auto-expand wouldn't fire.
   */
  back(): void { this.bus.openSidebar(); this.router.navigate(['/app/projets']); }

  openProj(p: Arch): void {
    const slug = p.n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    this.router.navigate(['/app/projets', slug, 'kanban'], { queryParams: { ro: '1', name: p.n } });
  }

  doDelete(): void {
    const n = this.confirmTarget();
    if (!n) return;
    this.removed.update(l => [...l, n]);
    this.confirmTarget.set(null);
    this.toastMsg.set('Projet supprimé définitivement');
    clearTimeout(this._t);
    this._t = setTimeout(() => this.toastMsg.set(null), 2800);
  }
}
