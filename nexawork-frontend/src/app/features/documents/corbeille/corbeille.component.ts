import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ConfirmDialogComponent } from '@shared/overlays/confirm-dialog/confirm-dialog.component';
import { GedType } from '@core/models/ged.models';
import { GED_COLOR, GED_ICON } from '@core/util/ui.util';
import { ToastService } from '@core/services/toast.service';

interface Trash { name: string; by: string; date: string; type: string; size: string; t: GedType; }

@Component({
  selector: 'app-documents-corbeille',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ConfirmDialogComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <div><div class="t">Corbeille</div><div class="s">Éléments que vous avez supprimés — restaurez-les ou supprimez-les définitivement.</div></div>
        @if (shown().length) { <button class="empty-btn" (click)="askEmptyAll()"><app-icon name="trash" [size]="14" />Vider la corbeille</button> }
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
                <button class="restore" (click)="restore(it.name)"><app-icon name="restore" [size]="13" />Restaurer</button>
                <button class="del" title="Supprimer définitivement" (click)="askDelete(it.name)"><app-icon name="trash" [size]="14" /></button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="empty"><app-icon name="trash" [size]="40" /><span>La corbeille est vide</span></div>
      }
    </div>

    @if (confirmDelete(); as target) {
      <app-confirm-dialog
        [danger]="true"
        title="Supprimer définitivement"
        [subtitle]="target"
        icon="trash"
        confirmLabel="Supprimer définitivement"
        [lines]="[
          'Cette action est irréversible.',
          'L\\'élément et toutes ses versions seront définitivement effacés.'
        ]"
        (confirmed)="doDelete(target)"
        (closed)="confirmDelete.set(null)" />
    }
    @if (confirmEmpty()) {
      <app-confirm-dialog
        [danger]="true"
        title="Vider la corbeille"
        subtitle="Tous vos éléments supprimés"
        icon="trash"
        confirmLabel="Vider définitivement"
        [lines]="[
          'Cette action est irréversible.',
          'Tous les éléments présents dans votre corbeille seront définitivement effacés.'
        ]"
        (confirmed)="doEmptyAll()"
        (closed)="confirmEmpty.set(false)" />
    }
  `,
  styleUrl: './corbeille.component.scss',
})
export class DocumentsCorbeilleComponent {
  private toast = inject(ToastService);

  private hidden = signal<string[]>([]);
  /**
   * Seeds: initially every item was authored by the current user (« Moi »).
   * R11 — the trash view shows only items the current user has authored.
   */
  private all: Trash[] = [
    { name: 'Ancienne charte graphique.pdf', by: 'Moi', date: 'Il y a 2 j', type: 'PDF', size: '890 Ko', t: 'pdf' },
    { name: 'Brief_créatif_v1.docx', by: 'Moi', date: 'Il y a 4 j', type: 'Document', size: '120 Ko', t: 'doc' },
    { name: 'Archive maquettes 2024', by: 'Moi', date: 'Il y a 7 j', type: 'Dossier', size: '—', t: 'folder' },
  ];

  /** R11 — display only the current user's own trashed items. */
  shown = computed(() => this.all.filter(it => it.by === 'Moi' && !this.hidden().includes(it.name)));

  confirmDelete = signal<string | null>(null);
  confirmEmpty = signal(false);

  icon(t: GedType): string { return GED_ICON[t]; }
  color(t: GedType): string { return GED_COLOR[t]; }

  restore(n: string): void {
    this.hidden.update(l => [...l, n]);
    this.toast.show({ message: '« ' + n + ' » restauré depuis la corbeille' });
  }
  askDelete(n: string): void { this.confirmDelete.set(n); }
  doDelete(n: string): void {
    this.hidden.update(l => [...l, n]);
    this.confirmDelete.set(null);
    this.toast.show({ message: '« ' + n + ' » supprimé définitivement' });
  }
  askEmptyAll(): void { this.confirmEmpty.set(true); }
  doEmptyAll(): void {
    this.hidden.update(l => [...l, ...this.shown().map(it => it.name)]);
    this.confirmEmpty.set(false);
    this.toast.show({ message: 'Corbeille vidée' });
  }
}
