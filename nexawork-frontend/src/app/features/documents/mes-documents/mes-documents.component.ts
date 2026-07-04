import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ApercuDocumentComponent } from '@shared/overlays/apercu-document/apercu-document.component';
import { FilterChipComponent, FilterOption } from '@shared/ui/filter-chip/filter-chip.component';
import { DocMenuComponent, DocMenuItem } from '@shared/ui/doc-menu/doc-menu.component';
import { ToastService } from '@core/services/toast.service';
import { GedOverlayBus } from '@core/services/ged-overlay.bus';

interface Doc {
  name: string; space: string; scope: string; date: string; type: string; size: string; it: string;
}

const ICON: Record<string, string> = {
  pdf: 'file', doc: 'file', img: 'image', sheet: 'sheet', fig: 'fig', folder: 'folder',
};
const COL: Record<string, string> = {
  pdf: '#F5564E', doc: '#3AA9E0', img: '#2BB673', sheet: '#1F8A5B', fig: '#A259FF', folder: '#E89A2C',
};
const SPACE_COLOR: Record<string, string> = {
  'Espace Organisation': '#5B5FE9', 'Refonte App Mobile': '#6C70F0', 'Site Vitrine 2025': '#F2693C',
  'Campagne Q3 Marketing': '#2BB673', 'Migration Backend': '#E0497B', 'Design System Nexa': '#3AA9E0',
};

@Component({
  selector: 'app-mes-documents',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ApercuDocumentComponent, FilterChipComponent, DocMenuComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <div class="tx">
          <div class="t">Mes documents</div>
          <div class="s">Tous les documents que vous avez partagés dans la GED, quel que soit leur emplacement.</div>
        </div>
        <span class="cnt">{{ shown().length }} {{ shown().length > 1 ? 'documents' : 'document' }}</span>
      </div>

      <div class="filters">
        <div class="search"><app-icon name="search" [size]="16" /><input [value]="q()" (input)="q.set($any($event.target).value)" placeholder="Rechercher dans mes documents…" /></div>
        <app-filter-chip label="Tous les espaces" [options]="SPACE_OPTS" [value]="fSpace()" (valueChange)="fSpace.set($event)" />
        <app-filter-chip label="Tous les types" [options]="TYPE_OPTS" [value]="fType()" (valueChange)="fType.set($event)" />
        @if (q() || fSpace() || fType()) {
          <button class="reset" (click)="resetFilters()"><app-icon name="x" [size]="14" />Réinitialiser</button>
        }
      </div>

      @if (shown().length === 0) {
        <div class="none"><app-icon name="search" [size]="40" /><span>Aucun document ne correspond à votre recherche</span></div>
      } @else {
        <div class="tbl">
          <div class="thead"><span>Nom</span><span>Emplacement</span><span>Date de partage</span><span>Type</span><span>Taille</span><span></span></div>
          @for (it of shown(); track it.name) {
            <div class="row" (click)="open(it)">
              <div class="name">
                <span class="ic" [style.color]="col(it.it)"><app-icon [name]="icon(it.it)" [size]="18" /></span>
                <span class="nm">{{ it.name }}</span>
                @if (gedOverlay.hasRestriction(it.name)) {
                  <button class="lk" [class.lk--priv]="gedOverlay.restrictionOf(it.name).mode === 'private'" title="Accès restreint — gérer les accès" (click)="gedOverlay.openAccess(it.name); $event.stopPropagation()"><app-icon name="lock" [size]="13" /></button>
                }
              </div>
              <div class="loc"><span class="dot" [style.background]="spaceColor(it.space)"></span><span class="loc__t"><span class="loc__a">{{ it.space }}</span><span class="loc__b">{{ it.scope }}</span></span></div>
              <span class="muted">{{ it.date }}</span>
              <span class="muted muted--sm">{{ it.type }}</span>
              <span class="muted">{{ it.size }}</span>
              <div class="act">
                <button class="dots" [class.dots--on]="menu() === it.name" (click)="toggleMenu(it.name, $event)"><app-icon name="dots" [size]="16" /></button>
                @if (menu() === it.name) {
                  <app-doc-menu [items]="menuItems(it)" (action)="onAction($event, it)" (closed)="menu.set(null)" />
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
    @if (preview(); as p) { <app-apercu-document [name]="p" (closed)="preview.set(null)" /> }
  `,
  styleUrl: './mes-documents.component.scss',
})
export class MesDocumentsComponent {
  private toast = inject(ToastService);
  protected gedOverlay = inject(GedOverlayBus);

  preview = signal<string | null>(null);
  q = signal('');
  fSpace = signal<string | null>(null);
  fType = signal<string | null>(null);
  menu = signal<string | null>(null);

  readonly SPACE_OPTS: FilterOption[] = Object.keys(SPACE_COLOR).map(s => ({ value: s, label: s, dot: SPACE_COLOR[s] }));
  readonly TYPE_OPTS: FilterOption[] = [
    { value: 'PDF', label: 'PDF' }, { value: 'Document', label: 'Document' }, { value: 'Tableur', label: 'Tableur' },
    { value: 'Image', label: 'Image' }, { value: 'Figma', label: 'Figma' }, { value: 'Dossier', label: 'Dossier' },
  ];

  items: Doc[] = [
    { name: 'Plan de release v3.pdf',     space: 'Refonte App Mobile',    scope: 'Projet',       date: "Aujourd'hui, 11:05", type: 'PDF',     size: '1,8 Mo', it: 'pdf' },
    { name: 'Notes atelier produit.docx', space: 'Espace Organisation',   scope: 'Organisation', date: 'Hier, 16:32',        type: 'Document', size: '210 Ko', it: 'doc' },
    { name: 'Wireframes onboarding.fig',  space: 'Refonte App Mobile',    scope: 'Projet',       date: 'Hier, 10:12',        type: 'Figma',   size: '5,6 Mo', it: 'fig' },
    { name: 'Suivi budget annuel.xlsx',   space: 'Espace Organisation',   scope: 'Organisation', date: '16 mai 2026',        type: 'Tableur', size: '120 Ko', it: 'sheet' },
    { name: 'Visuels page tarifs.png',    space: 'Site Vitrine 2025',     scope: 'Projet',       date: '14 mai 2026',        type: 'Image',   size: '1,2 Mo', it: 'img' },
    { name: 'Roadmap Q3.pdf',             space: 'Campagne Q3 Marketing', scope: 'Projet',       date: '12 mai 2026',        type: 'PDF',     size: '940 Ko', it: 'pdf' },
    { name: 'Schéma base de données.pdf', space: 'Migration Backend',     scope: 'Projet',       date: '9 mai 2026',         type: 'PDF',     size: '660 Ko', it: 'pdf' },
    { name: 'Tokens couleurs.xlsx',       space: 'Design System Nexa',    scope: 'Projet',       date: '6 mai 2026',         type: 'Tableur', size: '48 Ko',  it: 'sheet' },
    { name: 'Livrables client',           space: 'Espace Organisation',   scope: 'Organisation', date: '3 mai 2026',         type: 'Dossier', size: '—',      it: 'folder' },
  ];

  shown = computed<Doc[]>(() => {
    const q = this.q().toLowerCase().trim();
    const sp = this.fSpace();
    const ty = this.fType();
    return this.items.filter(it =>
      (!q || it.name.toLowerCase().includes(q)) &&
      (!sp || it.space === sp) &&
      (!ty || it.type === ty),
    );
  });

  menuItems(it: Doc): DocMenuItem[] {
    const isFolder = it.it === 'folder';
    const items: DocMenuItem[] = [
      { action: 'open', label: 'Ouvrir', icon: isFolder ? 'folder' : 'image' },
      { action: 'download', label: isFolder ? 'Télécharger (.zip)' : 'Télécharger', icon: 'download' },
    ];
    if (!isFolder) items.push({ action: 'versions', label: 'Historique des versions', icon: 'clock' });
    items.push({ action: 'access', label: 'Gérer les accès', icon: 'lock', sep: true });
    items.push({ action: 'rename', label: 'Renommer', icon: 'edit' });
    items.push({ action: 'delete', label: 'Supprimer', icon: 'trash', danger: true, sep: true });
    return items;
  }

  onAction(action: string, it: Doc): void {
    switch (action) {
      case 'open':     this.open(it); break;
      case 'download': this.toast.show({ message: 'Téléchargement de « ' + it.name + ' »…' }); break;
      case 'versions': this.gedOverlay.openVersions(it.name); break;
      case 'access':   this.gedOverlay.openAccess(it.name); break;
      case 'rename':   this.toast.show({ message: 'Renommer « ' + it.name + ' »' }); break;
      case 'delete':   this.toast.show({ message: '« ' + it.name + ' » supprimé' }); break;
    }
  }

  open(it: Doc): void { if (it.it !== 'folder') this.preview.set(it.name); }
  toggleMenu(name: string, ev: Event): void { ev.stopPropagation(); this.menu.set(this.menu() === name ? null : name); }
  resetFilters(): void { this.q.set(''); this.fSpace.set(null); this.fType.set(null); }

  icon(t: string): string { return ICON[t] ?? 'file'; }
  col(t: string): string { return COL[t] ?? '#86828e'; }
  spaceColor(s: string): string { return SPACE_COLOR[s] ?? '#9b97a3'; }
}
