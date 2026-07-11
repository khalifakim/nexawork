import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ConfirmDialogComponent } from '@shared/overlays/confirm-dialog/confirm-dialog.component';
import { GedItem, GedType } from '@core/models/ged.models';
import { GED_COLOR, GED_ICON } from '@core/util/ui.util';
import { ToastService } from '@core/services/toast.service';
import { GedService } from '@core/services/ged.service';

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
          @for (it of shown(); track it.id) {
            <div class="row">
              <div class="name"><span class="ic" [style.color]="color(it.type)"><app-icon [name]="icon(it.type)" [size]="18" /></span><span class="nm">{{ it.name }}</span></div>
              <span class="muted">{{ it.owner }}</span>
              <span class="muted">{{ it.mod }}</span>
              <span class="muted">{{ typeLabel(it.type) }}</span>
              <span class="muted">{{ it.size }}</span>
              <div class="acts">
                <button class="restore" (click)="restore(it)"><app-icon name="restore" [size]="13" />Restaurer</button>
                <button class="del" title="Supprimer définitivement" (click)="askDelete(it)"><app-icon name="trash" [size]="14" /></button>
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
        [subtitle]="target.name"
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
  private ged = inject(GedService);

  /** Bumpé après restauration / suppression pour recharger la corbeille. */
  private refresh = signal(0);
  private items = toSignal(
    toObservable(this.refresh).pipe(switchMap(() => this.ged.trash())),
    { initialValue: [] as GedItem[] },
  );

  /** R11 — la corbeille backend ne renvoie que les éléments de l'appelant. */
  shown = computed(() => this.items());

  confirmDelete = signal<GedItem | null>(null);
  confirmEmpty = signal(false);

  icon(t: GedType): string { return GED_ICON[t]; }
  color(t: GedType): string { return GED_COLOR[t]; }

  /** Libellé de type affiché dans la colonne « Type ». */
  typeLabel(t: GedType): string {
    return ({ folder: 'Dossier', pdf: 'PDF', doc: 'Document', img: 'Image', sheet: 'Tableur', fig: 'Figma' } as const)[t] ?? 'Document';
  }

  private reload(): void { this.refresh.update(v => v + 1); }

  restore(it: GedItem): void {
    if (!it.id) return;
    this.ged.restoreFile(it.id).subscribe(() => {
      this.reload();
      this.toast.show({ message: '« ' + it.name + ' » restauré depuis la corbeille' });
    });
  }
  askDelete(it: GedItem): void { this.confirmDelete.set(it); }
  doDelete(it: GedItem): void {
    this.confirmDelete.set(null);
    if (!it.id) return;
    this.ged.purgeFile(it.id).subscribe(() => {
      this.reload();
      this.toast.show({ message: '« ' + it.name + ' » supprimé définitivement' });
    });
  }
  askEmptyAll(): void { this.confirmEmpty.set(true); }
  doEmptyAll(): void {
    this.confirmEmpty.set(false);
    this.ged.emptyTrash().subscribe(() => {
      this.reload();
      this.toast.show({ message: 'Corbeille vidée' });
    });
  }
}
