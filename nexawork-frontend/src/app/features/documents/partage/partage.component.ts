import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ApercuDocumentComponent } from '@shared/overlays/apercu-document/apercu-document.component';
import { GedType } from '@core/models/ged.models';
import { GED_COLOR, GED_ICON } from '@core/util/ui.util';

interface Shared { name: string; by: string; bc: string; date: string; size: string; type: GedType; }

@Component({
  selector: 'app-documents-partage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ApercuDocumentComponent],
  template: `
    <div class="wrap">
      <div class="head"><div class="t">Partagé avec moi</div><div class="s">Fichiers que vos collaborateurs ont partagés directement avec vous.</div></div>
      <div class="tbl">
        <div class="thead"><span>Nom</span><span>Partagé par</span><span>Date de partage</span><span>Taille</span><span></span></div>
        @for (it of items; track it.name) {
          <div class="row" (click)="preview.set(it.name)">
            <div class="name"><span class="ic" [style.color]="color(it.type)"><app-icon [name]="icon(it.type)" [size]="18" /></span><span class="nm">{{ it.name }}</span></div>
            <div class="by"><span class="av" [style.background]="it.bc">{{ ini(it.by) }}</span><span class="muted">{{ it.by }}</span></div>
            <span class="muted">{{ it.date }}</span>
            <span class="muted">{{ it.size }}</span>
            <button class="dots" (click)="$event.stopPropagation()"><app-icon name="dots" [size]="16" /></button>
          </div>
        }
      </div>
    </div>
    @if (preview(); as p) { <app-apercu-document [name]="p" (closed)="preview.set(null)" /> }
  `,
  styleUrl: './partage.component.scss',
})
export class DocumentsPartageComponent {
  preview = signal<string | null>(null);
  items: Shared[] = [
    { name: 'Maquettes Sprint 12.fig', by: 'Sarah Diallo', bc: '#F2693C', date: "Aujourd'hui, 14:23", size: '4,2 Mo', type: 'fig' },
    { name: 'Specs fonctionnelles v2.pdf', by: 'Yacine Sow', bc: '#3AA9E0', date: 'Hier, 09:41', size: '2,4 Mo', type: 'pdf' },
    { name: 'Budget Q3.xlsx', by: 'Akim Koné', bc: '#F5A623', date: '15 mai 2026', size: '64 Ko', type: 'sheet' },
    { name: 'Rapport design system.pdf', by: 'Aïda Ndiaye', bc: '#2BB673', date: '12 mai 2026', size: '1,1 Mo', type: 'pdf' },
    { name: 'Export board kanban.png', by: 'Moussa Bâ', bc: '#6C70F0', date: '8 mai 2026', size: '840 Ko', type: 'img' },
  ];
  icon(t: GedType): string { return GED_ICON[t]; }
  color(t: GedType): string { return GED_COLOR[t]; }
  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }
}
