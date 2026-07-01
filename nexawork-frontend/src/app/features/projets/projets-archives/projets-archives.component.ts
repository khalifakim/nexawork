import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface Arch { n: string; dot: string; chef: string; members: number; date: string; }

@Component({
  selector: 'app-projets-archives',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
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
          <button class="chip">Chef de projet<app-icon name="chevronDown" [size]="13" [stroke]="2.4" /></button>
          <button class="chip">Date d'archivage<app-icon name="chevronDown" [size]="13" [stroke]="2.4" /></button>
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

    @if (confirmTarget()) {
      <div class="overlay" (click)="confirmTarget.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__bd">
            <div class="modal__top">
              <span class="modal__i"><app-icon name="trash" [size]="22" /></span>
              <div>
                <div class="modal__title">Supprimer définitivement</div>
                <div class="modal__sub">{{ confirmTarget() }}</div>
              </div>
            </div>
            <div class="modal__lines">
              <div class="modal__line"><span class="modal__dot"></span><span>Cette suppression est irréversible.</span></div>
              <div class="modal__line"><span class="modal__dot"></span><span>Le projet archivé et toutes ses ressources seront définitivement supprimés.</span></div>
            </div>
          </div>
          <div class="modal__ft">
            <button class="modal__cancel" (click)="confirmTarget.set(null)">Annuler</button>
            <button class="modal__confirm" (click)="doDelete()"><app-icon name="trash" [size]="16" />Supprimer définitivement</button>
          </div>
        </div>
      </div>
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
  q = signal('');
  private removed = signal<string[]>([]);
  confirmTarget = signal<string | null>(null);
  toastMsg = signal<string | null>(null);
  private _t: any;

  all: Arch[] = [
    { n: 'Ancienne Landing 2024', dot: '#8E8AA0', chef: 'Akim Koné',   members: 5, date: '12 mars 2025' },
    { n: 'Refonte Newsletter',     dot: '#8E8AA0', chef: 'Sarah Diallo', members: 4, date: '3 févr. 2025' },
  ];

  shown = computed(() =>
    this.all.filter(p => p.n.toLowerCase().includes(this.q().toLowerCase().trim()) && !this.removed().includes(p.n))
  );

  remove(n: string): void { this.removed.update(l => [...l, n]); }
  back(): void { this.router.navigate(['/app/projets']); }

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
