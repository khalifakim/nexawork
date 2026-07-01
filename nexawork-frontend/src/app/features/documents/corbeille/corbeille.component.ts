import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { GedType } from '@core/models/ged.models';
import { GED_COLOR, GED_ICON } from '@core/util/ui.util';

interface Trash { name: string; by: string; date: string; type: string; size: string; t: GedType; }

@Component({
  selector: 'app-documents-corbeille',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <div><div class="t">Corbeille</div><div class="s">Éléments que vous avez supprimés — restaurez-les ou supprimez-les définitivement.</div></div>
        @if (shown().length) { <button class="empty-btn" (click)="emptyAll()"><app-icon name="trash" [size]="14" />Vider la corbeille</button> }
      </div>
      @if (shown().length) {
        <div class="tbl">
          <div class="thead"><span>Nom</span><span>Supprimé par</span><span>Supprimé le</span><span>Type</span><span>Taille</span><span>Actions</span></div>
          @for (it of shown(); track it.name) {
            <div class="row">
              <div class="name"><span class="ic" [style.color]="color(it.t)"><app-icon [name]="icon(it.t)" [size]="18" /></span><span class="nm">{{ it.name }}</span></div>
              <span class="muted">{{ it.by }}</span>
              <span class="muted">{{ it.date }}</span>
              <span class="muted">{{ it.type }}</span>
              <span class="muted">{{ it.size }}</span>
              <div class="acts">
                <button class="restore" (click)="hide(it.name)"><app-icon name="restore" [size]="13" />Restaurer</button>
                <button class="del" title="Supprimer définitivement" (click)="hide(it.name)"><app-icon name="trash" [size]="14" /></button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="empty"><app-icon name="trash" [size]="40" /><span>La corbeille est vide</span></div>
      }
    </div>
  `,
  styleUrl: './corbeille.component.scss',
})
export class DocumentsCorbeilleComponent {
  private hidden = signal<string[]>([]);
  private all: Trash[] = [
    { name: 'Ancienne charte graphique.pdf', by: 'Moi', date: 'Il y a 2 j', type: 'PDF', size: '890 Ko', t: 'pdf' },
    { name: 'Brief_créatif_v1.docx', by: 'Moussa Bâ', date: 'Il y a 4 j', type: 'Document', size: '120 Ko', t: 'doc' },
    { name: 'Archive maquettes 2024', by: 'Moi', date: 'Il y a 7 j', type: 'Dossier', size: '—', t: 'folder' },
  ];
  shown = computed(() => this.all.filter(it => !this.hidden().includes(it.name)));
  icon(t: GedType): string { return GED_ICON[t]; }
  color(t: GedType): string { return GED_COLOR[t]; }
  hide(n: string): void { this.hidden.update(l => [...l, n]); }
  emptyAll(): void { this.hidden.set(this.all.map(it => it.name)); }
}
