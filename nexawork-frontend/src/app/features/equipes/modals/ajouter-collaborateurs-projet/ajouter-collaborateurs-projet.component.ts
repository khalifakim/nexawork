import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MembersService } from '@core/services/members.service';
import { ToastService } from '@core/services/toast.service';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * A workspace member candidate for addition to the current project.
 * `checked` is the local selection state inside this modal.
 */
interface Candidate { name: string; role: string; color: string; email: string; checked: boolean; }

/** Payload emitted when the user confirms. */
export interface AddCollaboratorsPayload { members: { name: string; role: string; color: string; email: string }[]; }

/**
 * « Ajouter des collaborateurs au projet » — modal that lets the user add
 * workspace members who are not already assigned to the current project.
 *
 * Faithful to règle R10 : this is NOT the workspace invitation modal (§4.7),
 * it lists existing workspace members not yet in the project.
 */
@Component({
  selector: 'app-ajouter-collaborateurs-projet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent],
  template: `
    <app-modal-shell title="Ajouter des collaborateurs au projet"
                     [subtitle]="'Membres du workspace non encore assignés à ' + projectName"
                     [width]="520" (closed)="closed.emit()">
      <div class="search">
        <app-icon name="search" [size]="16" />
        <input [value]="query()" (input)="query.set($any($event.target).value)"
               placeholder="Rechercher une personne…" autofocus />
      </div>

      <div class="list">
        @for (c of visible(); track c.name) {
          <button type="button" class="row" [class.row--on]="c.checked" (click)="toggle(c.name)">
            <span class="row__av" [style.background]="c.color">{{ ini(c.name) }}</span>
            <span class="row__tx">
              <span class="row__n">{{ c.name }}</span>
              <span class="row__r">{{ c.role || 'Membre du workspace' }}</span>
            </span>
            <span class="check" [class.check--on]="c.checked">
              @if (c.checked) { <app-icon name="check" [size]="13" [stroke]="2.6" /> }
            </span>
          </button>
        } @empty {
          <div class="empty">Aucun membre du workspace disponible à ajouter — tous sont déjà dans le projet.</div>
        }
      </div>

      @if (candidatesTotal() > 0) {
        <div class="hint">{{ count() ? count() + ' personne' + (count() > 1 ? 's' : '') + ' sélectionnée' + (count() > 1 ? 's' : '') : 'Sélectionnez au moins une personne à ajouter.' }}</div>
      }

      <div footer>
        <button class="ghost" (click)="closed.emit()">Annuler</button>
        <button class="primary" [disabled]="!count()" (click)="confirm()">
          <app-icon name="plus" [size]="15" [stroke]="2.2" />
          Ajouter au projet
        </button>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .search { display: flex; align-items: center; gap: 9px; height: 40px; padding: 0 13px; background: var(--nx-surface-3); border: 1px solid var(--nx-border); border-radius: 10px; color: var(--nx-text-400); margin-bottom: 14px; }
    .search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: var(--nx-text); }
    .search input::placeholder { color: var(--nx-text-400); }

    .list { max-height: 340px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; padding-right: 2px; }
    .row { width: 100%; display: flex; align-items: center; gap: 12px; padding: 9px 10px; border: none; border-radius: 10px; background: transparent; cursor: pointer; font-family: inherit; text-align: left; }
    .row:hover { background: var(--nx-surface-2); }
    .row--on { background: rgba(91,95,233,.08); }
    .row__av { width: 34px; height: 34px; flex: none; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
    .row__tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .row__n { font-size: 13.5px; font-weight: 600; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row__r { font-size: 12px; color: var(--nx-text-400); }
    .check { width: 20px; height: 20px; flex: none; border: 1.5px solid var(--nx-border); border-radius: 6px; background: #fff; display: flex; align-items: center; justify-content: center; color: #fff; }
    .check--on { background: var(--nx-indigo); border-color: var(--nx-indigo); }
    .empty { padding: 26px 8px; text-align: center; font-size: 13px; color: var(--nx-text-400); }

    .hint { font-size: 12px; color: var(--nx-text-500); margin-top: 12px; }

    .ghost { height: 38px; padding: 0 16px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn); background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .primary { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 18px; border: none; border-radius: var(--nx-r-btn); background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .primary:disabled { background: #cfccc4; cursor: not-allowed; }
  `],
})
export class AjouterCollaborateursProjetComponent {
  /** Names already in the project — they will be excluded from the list. */
  @Input() alreadyInProject: string[] = [];
  /** Project display name for the modal subtitle. */
  @Input() projectName = 'ce projet';
  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<AddCollaboratorsPayload>();

  private members = inject(MembersService);
  private toast = inject(ToastService);

  private directory = toSignal(this.members.directory(), { initialValue: [] });

  query = signal('');
  private checked = signal<Set<string>>(new Set<string>());

  private candidates = computed<Candidate[]>(() => {
    const already = new Set(this.alreadyInProject);
    const checked = this.checked();
    return this.directory()
      .filter(m => !already.has(m.name))
      .map(m => ({
        name: m.name,
        role: m.role,
        color: m.color,
        email: m.email,
        checked: checked.has(m.name),
      }));
  });

  visible = computed<Candidate[]>(() => {
    const q = this.query().toLowerCase().trim();
    const list = this.candidates();
    if (!q) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q),
    );
  });

  count = computed(() => this.checked().size);
  /** Total candidates available (ignoring search query) — used to hide the hint when zero. */
  candidatesTotal = computed(() => this.candidates().length);

  toggle(name: string): void {
    this.checked.update(set => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
    // Reset the search field so the user sees the full list (with the newly
    // toggled row already reflecting its checked state).
    this.query.set('');
  }

  confirm(): void {
    const picked = this.candidates().filter(c => c.checked);
    if (!picked.length) return;
    this.added.emit({ members: picked.map(({ name, role, color, email }) => ({ name, role, color, email })) });
    this.toast.show({ message: picked.length + ' collaborateur' + (picked.length > 1 ? 's ajoutés' : ' ajouté') + ' au projet' });
    this.closed.emit();
  }

  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }
}
