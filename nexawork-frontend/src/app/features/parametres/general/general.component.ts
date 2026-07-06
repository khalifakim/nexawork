import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ConfirmDialogComponent } from '@shared/overlays/confirm-dialog/confirm-dialog.component';
import { SessionService } from '@core/services/session.service';
import { ToastService } from '@core/services/toast.service';

const PALETTE = ['#6C70F0', '#5B8DEF', '#2BB673', '#F5A623', '#F2693C', '#F5564E', '#E0497B', '#3AA9E0', '#8E5AD6', '#8E8AA0'];

/** « Général » — icon (workspace colored square) + name + locked identifier + palette. */
@Component({
  selector: 'app-param-general',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ConfirmDialogComponent],
  template: `
    <div class="set-page"><div class="set-inner">
      <h1 class="set-h1">Général</h1>
      <p class="set-desc">Informations et configuration de l'espace de travail.</p>

      <div class="set-card">
        <div class="set-row set-row--first set-row--top">
          <div class="set-rlabel"><b>Icône</b></div>
          <div class="set-rctrl">
            <div class="top">
              <span class="ws" [style.background]="color()">{{ mono() }}</span>
              <span class="lbl">Changer de couleur</span>
            </div>
            <div class="pal">
              @for (c of palette; track c) {
                <button type="button" class="sw" [style.background]="c"
                        [class.sw--on]="color()===c"
                        [style.--sw-c]="c"
                        (click)="color.set(c)"></button>
              }
            </div>
          </div>
        </div>
        <div class="set-row set-row--top">
          <div class="set-rlabel"><b>Nom du workspace</b><small>Visible par tous les membres.</small></div>
          <div class="set-rctrl">
            <input class="set-input" [value]="name()" (input)="name.set($any($event.target).value)" />
          </div>
        </div>
        <div class="set-row set-row--top">
          <div class="set-rlabel"><b>Identifiant</b><small>Lié à l'URL de l'espace, non modifiable.</small></div>
          <div class="set-rctrl">
            <div class="set-input set-input--locked nx-mono">
              {{ session.activeWorkspaceId() }}
              <span style="margin-left:auto;display:flex;color:var(--nx-text-300)"><app-icon name="lock" [size]="15" /></span>
            </div>
          </div>
        </div>
        <div class="set-row">
          <div class="set-rlabel"></div>
          <div class="set-rctrl">
            <button class="set-btn set-btn--primary" [disabled]="!dirty()" (click)="save()">Enregistrer les modifications</button>
          </div>
        </div>
      </div>

      @if (isOwner()) {
        <div class="set-card set-card--danger">
          <div class="set-row set-row--first set-row--top">
            <div class="set-rlabel"><b>Supprimer le workspace</b></div>
            <div class="set-rctrl">
              <div class="muted">La suppression est définitive : tous les projets, documents, canaux et messages seront effacés pour l'ensemble des membres. Cette action est irréversible. Seul le propriétaire de l'espace peut effectuer cette opération.</div>
              <button class="set-btn set-btn--danger" (click)="askDelete()"><app-icon name="trash" [size]="16" />Supprimer définitivement</button>
            </div>
          </div>
        </div>
      }
    </div></div>

    @if (deleteOpen()) {
      <app-confirm-dialog
        [danger]="true"
        icon="trash"
        title="Supprimer définitivement le workspace ?"
        [subtitle]="ws().name"
        confirmLabel="Supprimer définitivement"
        [lines]="[
          'Tous les projets, canaux, documents et messages seront effacés pour l\\'ensemble des membres.',
          'Les autres membres perdront immédiatement l\\'accès à cet espace.',
          'Vous serez déconnecté et devrez vous reconnecter à un autre espace.',
          'Cette action est irréversible.'
        ]"
        (confirmed)="confirmDelete()"
        (closed)="deleteOpen.set(false)" />
    }
  `,
  styles: [`
    .top { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
    .ws { width: 54px; height: 54px; border-radius: 13px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 21px; flex: none; transition: background .2s; }
    .lbl { font-size: 13px; color: var(--nx-text-500); font-weight: 500; }
    .pal { display: flex; gap: 10px; flex-wrap: wrap; }
    .sw { width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer; padding: 0; transition: box-shadow .12s; }
    .sw--on { box-shadow: 0 0 0 2.5px #fff, 0 0 0 4.5px var(--sw-c, var(--nx-indigo)); }
    .set-input { display: flex; align-items: center; }
    .muted { font-size: 13px; color: var(--nx-text-500); line-height: 1.5; margin-bottom: 12px; max-width: 440px; }
    .set-btn:disabled { opacity: .55; cursor: not-allowed; }
  `],
})
export class ParamGeneralComponent {
  session = inject(SessionService);
  private toast = inject(ToastService);

  /** True when current user OWNS the workspace — REF H. */
  isOwner = this.session.isOwner;

  palette = PALETTE;

  ws = computed(() => this.session.activeWorkspace());
  color = signal(this.ws().color);
  name = signal(this.ws().name);

  mono = computed(() => (this.name().trim() || 'N').charAt(0).toUpperCase());
  dirty = computed(() => {
    const w = this.ws();
    return (this.color() !== w.color) || (this.name().trim() !== w.name && this.name().trim().length >= 2);
  });

  save(): void {
    const patch: { name?: string; color?: string } = {};
    const w = this.ws();
    const n = this.name().trim();
    if (n.length >= 2 && n !== w.name) patch.name = n;
    if (this.color() !== w.color) patch.color = this.color();
    if (Object.keys(patch).length === 0) return;
    this.session.updateActiveWorkspace(patch);
    this.toast.show({ message: 'Espace de travail mis à jour' });
  }

  /** REF H — état du ConfirmDialog de suppression. */
  deleteOpen = signal(false);
  askDelete(): void { this.deleteOpen.set(true); }

  /**
   * REF H — confirmation acceptée : supprime le workspace, déconnecte
   * l'utilisateur et redirige vers la page de login. Les autres membres
   * perdront l'accès à l'espace.
   */
  confirmDelete(): void {
    const name = this.ws().name;
    this.session.deleteActiveWorkspace(({ ok }) => {
      this.deleteOpen.set(false);
      if (!ok) return;
      this.toast.show({ message: '« ' + name + ' » supprimé — vous êtes déconnecté.' });
      this.session.logout(); // AuthEffect logout$ → route /auth/landing
    });
  }
}
