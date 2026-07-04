import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SessionService } from '@core/services/session.service';
import { ToastService } from '@core/services/toast.service';

type InviteRole = 'Administrateur' | 'Membre';

/**
 * « Inviter des membres » — chip-input for email addresses (Enter/comma to
 * confirm, Backspace on empty to remove the last chip, dedupe on Set), role
 * selector (Administrateur / Membre) and Send.
 *
 * Faithful to the prototype's `inviteModal()`.
 */
@Component({
  selector: 'app-invitation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent],
  template: `
    <app-modal-shell title="Inviter des membres" [subtitle]="subtitle()"
                     [width]="520" (closed)="closed.emit()">
      <label class="lbl">Adresses email</label>
      <div class="emails" [class.emails--focus]="focused()" (click)="focusInput()">
        @for (e of emails(); track e) {
          <span class="tag">
            <span>{{ e }}</span>
            <button type="button" (click)="remove(e); $event.stopPropagation()" title="Retirer">
              <app-icon name="x" [size]="12" [stroke]="2.4" />
            </button>
          </span>
        }
        <input #inp class="emails__in"
               [value]="draft()"
               [placeholder]="emails().length ? '' : 'nom@exemple.com'"
               (input)="draft.set($any($event.target).value)"
               (keydown)="onKey($event)"
               (focus)="focused.set(true)"
               (blur)="onBlur()" />
      </div>
      <div class="hint">Appuyez sur Entrée ou virgule pour ajouter ; chaque adresse devient une étiquette retirable.</div>

      <label class="lbl" style="margin-top:18px">Rôle attribué</label>
      <div class="roles">
        <button class="role" [class.role--on]="role()==='Administrateur'" (click)="role.set('Administrateur')">
          <div class="role__top"><span class="radio" [class.radio--on]="role()==='Administrateur'"></span><span class="role__name">Administrateur</span></div>
          <div class="role__desc">Gère le workspace, les membres et les suppressions.</div>
        </button>
        <button class="role" [class.role--on]="role()==='Membre'" (click)="role.set('Membre')">
          <div class="role__top"><span class="radio" [class.radio--on]="role()==='Membre'"></span><span class="role__name">Membre</span></div>
          <div class="role__desc">Accède aux projets auxquels il est assigné.</div>
        </button>
      </div>

      <div footer class="foot">
        <span class="count">{{ counterText() }}</span>
        <div class="foot__btns">
          <button class="ghost" (click)="closed.emit()">Annuler</button>
          <button class="primary" [disabled]="!emails().length" (click)="send()">
            <app-icon name="send" [size]="16" />Envoyer l'invitation
          </button>
        </div>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .lbl { display: block; font-size: 11.5px; font-weight: 600; color: var(--nx-text-400); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .05em; }
    .emails { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; min-height: 46px; padding: 8px 10px; border: 1px solid var(--nx-border); border-radius: 10px; background: var(--nx-surface-3); cursor: text; transition: border-color .15s; }
    .emails--focus { border-color: var(--nx-indigo); }
    .emails__in { flex: 1; min-width: 140px; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: var(--nx-text); padding: 4px 2px; }
    .tag { display: inline-flex; align-items: center; gap: 7px; height: 28px; padding: 0 5px 0 11px; border-radius: 7px; background: var(--nx-indigo-50); color: var(--nx-indigo-text); font-size: 13px; font-weight: 600; }
    .tag button { width: 18px; height: 18px; border: none; border-radius: 5px; background: transparent; color: #7c79c9; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .tag button:hover { background: rgba(91,95,233,.18); }
    .hint { font-size: 11.5px; color: var(--nx-text-400); margin-top: 7px; }
    .roles { display: flex; gap: 11px; }
    .role { flex: 1; text-align: left; padding: 13px 15px; border-radius: 11px; border: 1.5px solid var(--nx-border); background: #fff; cursor: pointer; font-family: inherit; }
    .role--on { border-color: var(--nx-indigo); background: rgba(91,95,233,.06); }
    .role__top { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
    .radio { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #C9C5BD; flex: none; display: inline-flex; align-items: center; justify-content: center; }
    .radio--on { border-color: var(--nx-indigo); }
    .radio--on::after { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--nx-indigo); }
    .role__name { font-size: 14px; font-weight: 700; color: var(--nx-text); }
    .role__desc { font-size: 12px; color: var(--nx-text-500); line-height: 1.4; padding-left: 24px; }
    .foot { display: flex; align-items: center; justify-content: space-between; width: 100%; }
    .foot__btns { display: flex; gap: 10px; }
    .count { font-size: 13px; color: var(--nx-text-500); }
    .ghost { height: 40px; padding: 0 18px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn); background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
    .primary { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border: none; border-radius: var(--nx-r-btn); background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; box-shadow: var(--nx-shadow-primary); }
    .primary:disabled { background: #cfcbc2; cursor: not-allowed; box-shadow: none; }
  `],
})
export class InvitationModalComponent {
  @Output() closed = new EventEmitter<void>();
  @ViewChild('inp', { static: false }) private inputRef?: ElementRef<HTMLInputElement>;

  private session = inject(SessionService);
  private toast = inject(ToastService);

  emails = signal<string[]>([]);
  draft = signal('');
  role = signal<InviteRole>('Membre');
  focused = signal(false);

  subtitle = computed(() => `Les invités rejoignent l'espace ${this.session.activeWorkspace().name} par email.`);
  counterText = computed(() => {
    const n = this.emails().length;
    return n ? `${n} email${n > 1 ? 's' : ''}` : '';
  });

  focusInput(): void { this.inputRef?.nativeElement.focus(); }

  onKey(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); this.add(); return; }
    if (ev.key === 'Backspace' && !this.draft().trim() && this.emails().length) {
      this.emails.update(l => l.slice(0, -1));
    }
  }

  onBlur(): void {
    this.focused.set(false);
    this.add();
  }

  add(): void {
    const v = this.draft().trim().replace(/,$/, '').trim();
    if (!v || !v.includes('@')) { this.draft.set(''); return; }
    this.emails.update(l => Array.from(new Set([...l, v])));
    this.draft.set('');
  }

  remove(email: string): void { this.emails.update(l => l.filter(x => x !== email)); }

  send(): void {
    const n = this.emails().length;
    if (!n) return;
    this.toast.show({ message: `${n} invitation${n > 1 ? 's' : ''} envoyée${n > 1 ? 's' : ''} en tant que ${this.role()}` });
    this.emails.set([]);
    this.closed.emit();
  }
}
