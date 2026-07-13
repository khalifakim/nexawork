import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ApercuDocumentComponent } from '@shared/overlays/apercu-document/apercu-document.component';
import { FilterChipComponent, FilterOption } from '@shared/ui/filter-chip/filter-chip.component';
import { DocMenuComponent, DocMenuItem } from '@shared/ui/doc-menu/doc-menu.component';
import { ToastService } from '@core/services/toast.service';
import { GedOverlayBus } from '@core/services/ged-overlay.bus';
import { GedService } from '@core/services/ged.service';
import { GedItem, GedType } from '@core/models/ged.models';
import { environment } from '@environment/environment';
import { GED_COLOR, GED_ICON, ME } from '@core/util/ui.util';

interface Shared {
  name: string; by: string; bc: string; date: string; size: string; type: GedType;
  /** Élément GED réel sous-jacent (mode backend) — porte l'UUID. */
  item?: GedItem;
}

@Component({
  selector: 'app-documents-partage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ApercuDocumentComponent, FilterChipComponent, DocMenuComponent],
  template: `
    <div class="wrap">
      <div class="head"><div class="t">Partagé avec moi</div><div class="s">Fichiers que vos collaborateurs ont partagés directement avec vous.</div></div>

      <div class="filters">
        <div class="search"><app-icon name="search" [size]="15" /><input [value]="q()" (input)="q.set($any($event.target).value)" placeholder="Rechercher…" /></div>
        <app-filter-chip label="Type" [options]="TYPE_OPTS" [value]="fType()" (valueChange)="fType.set($event)" />
        <app-filter-chip label="Date" [options]="DATE_OPTS" [value]="fDate()" (valueChange)="fDate.set($event)" />
      </div>

      <div class="tbl">
        <div class="thead"><span>Nom</span><span>Partagé par</span><span>Date de partage</span><span>Taille</span><span></span></div>
        @for (it of shown(); track it.name) {
          <div class="row" (click)="preview.set(it.name)">
            <div class="name">
              <span class="ic" [style.color]="color(it.type)"><app-icon [name]="icon(it.type)" [size]="18" /></span>
              <span class="nm">{{ it.name }}</span>
              @if (gedOverlay.hasRestriction(it.name)) {
                <button class="lk" [class.lk--priv]="gedOverlay.restrictionOf(it.name).mode === 'private'" title="Accès restreint — gérer les accès" (click)="gedOverlay.openAccess(it.name); $event.stopPropagation()"><app-icon name="lock" [size]="13" /></button>
              }
            </div>
            <div class="by"><span class="av" [style.background]="it.bc">{{ ini(it.by) }}</span><span class="muted">{{ it.by }}</span></div>
            <span class="muted">{{ it.date }}</span>
            <span class="muted">{{ it.size }}</span>
            <div class="act">
              <button class="dots" [class.dots--on]="menu() === it.name" (click)="toggleMenu(it.name, $event)"><app-icon name="dots" [size]="16" /></button>
              @if (menu() === it.name) {
                <app-doc-menu [items]="menuItems(it)" (action)="onAction($event, it)" (closed)="menu.set(null)" />
              }
            </div>
          </div>
        } @empty {
          <div class="empty">Aucun document ne correspond à votre recherche.</div>
        }
      </div>
    </div>
    @if (preview(); as p) { <app-apercu-document [name]="p" (closed)="preview.set(null)" /> }
  `,
  styleUrl: './partage.component.scss',
})
export class DocumentsPartageComponent {
  private toast = inject(ToastService);
  protected gedOverlay = inject(GedOverlayBus);
  private ged = inject(GedService);

  private readonly real = !environment.mock.ged;

  preview = signal<string | null>(null);
  q = signal('');
  fType = signal<string | null>(null);
  fDate = signal<string | null>(null);
  menu = signal<string | null>(null);
  private refresh = signal(0);

  /** Documents réellement partagés avec moi (mode backend). */
  private realDocs = toSignal(
    toObservable(this.refresh).pipe(switchMap(() => this.real ? this.ged.sharedWithMe() : [])),
    { initialValue: [] as GedItem[] },
  );

  readonly TYPE_OPTS: FilterOption[] = [
    { value: 'pdf', label: 'PDF', dot: '#F5564E' },
    { value: 'doc', label: 'Document', dot: '#5B8DEF' },
    { value: 'img', label: 'Image', dot: '#2BB673' },
    { value: 'fig', label: 'Figma', dot: '#6C70F0' },
    { value: 'sheet', label: 'Tableur', dot: '#E89A2C' },
  ];
  readonly DATE_OPTS: FilterOption[] = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ];

  /** Documents affichés : réels (backend) ou fixtures (mock). */
  private docs = computed<Shared[]>(() => {
    if (!this.real) return this.mockItems;
    return this.realDocs().map(it => ({
      name: it.name,
      by: it.owner,
      bc: '#6C70F0',
      date: it.mod ?? '',
      size: it.size,
      type: it.type,
      item: it,
    }));
  });

  private mockItems: Shared[] = [
    { name: 'Maquettes Sprint 12.fig', by: 'Sarah Diallo', bc: '#F2693C', date: "Aujourd'hui, 14:23", size: '4,2 Mo', type: 'fig' },
    { name: 'Specs fonctionnelles v2.pdf', by: 'Yacine Sow', bc: '#3AA9E0', date: 'Hier, 09:41', size: '2,4 Mo', type: 'pdf' },
    { name: 'Budget Q3.xlsx', by: 'Akim Koné', bc: '#F5A623', date: '15 mai 2026', size: '64 Ko', type: 'sheet' },
    { name: 'Rapport design system.pdf', by: 'Aïda Ndiaye', bc: '#2BB673', date: '12 mai 2026', size: '1,1 Mo', type: 'pdf' },
    { name: 'Export board kanban.png', by: 'Moussa Bâ', bc: '#6C70F0', date: '8 mai 2026', size: '840 Ko', type: 'img' },
  ];

  shown = computed<Shared[]>(() => {
    const q = this.q().toLowerCase().trim();
    const t = this.fType();
    const d = this.fDate();
    return this.docs().filter(it => {
      if (q && !it.name.toLowerCase().includes(q)) return false;
      if (t && it.type !== t) return false;
      if (d) {
        const low = it.date.toLowerCase();
        if (d === 'today' && !low.includes("aujourd'hui")) return false;
        if (d === 'week' && !(low.includes("aujourd'hui") || low.includes('hier'))) return false;
        if (d === 'month' && (low.includes('mois') || low.includes('semaine'))) return false;
      }
      return true;
    });
  });

  /** Menu items depend on edit rights: rename/delete only when I shared the file (like the prototype). */
  menuItems(it: Shared): DocMenuItem[] {
    const canEdit = it.by === ME;
    const base: DocMenuItem[] = [
      { action: 'open', label: 'Ouvrir', icon: 'image' },
      { action: 'download', label: 'Télécharger', icon: 'download' },
      // Version history is available for every file, whatever its location.
      { action: 'versions', label: 'Historique des versions', icon: 'clock' },
    ];
    if (canEdit) {
      base.push({ action: 'access', label: 'Gérer les accès', icon: 'lock', sep: true });
      base.push({ action: 'rename', label: 'Renommer', icon: 'edit' });
      base.push({ action: 'delete', label: 'Supprimer', icon: 'trash', danger: true, sep: true });
    }
    return base;
  }

  onAction(action: string, it: Shared): void {
    switch (action) {
      case 'open':     this.preview.set(it.name); break;
      case 'download': this.toast.show({ message: 'Téléchargement de « ' + it.name + ' »…' }); break;
      case 'versions':
        if (it.item) this.gedOverlay.openVersionsFor(it.item); else this.gedOverlay.openVersions(it.name);
        break;
      case 'access':
        if (it.item) this.gedOverlay.openAccessFor(it.item); else this.gedOverlay.openAccess(it.name);
        break;
      case 'rename':   this.toast.show({ message: 'Renommer « ' + it.name + ' »' }); break;
      case 'delete':
        if (it.item) {
          this.ged.deleteItem(it.item).subscribe(() => {
            this.refresh.update(v => v + 1);
            this.toast.show({ message: '« ' + it.name + ' » déplacé vers la corbeille' });
          });
        } else {
          this.toast.show({ message: '« ' + it.name + ' » supprimé' });
        }
        break;
    }
  }

  toggleMenu(name: string, ev: Event): void { ev.stopPropagation(); this.menu.set(this.menu() === name ? null : name); }

  icon(t: GedType): string { return GED_ICON[t]; }
  color(t: GedType): string { return GED_COLOR[t]; }
  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }
}
