import { ChangeDetectionStrategy, Component, EventEmitter, Output, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-invitation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent],
  template: `
    <app-modal-shell title="Inviter des membres" subtitle="Les invités rejoignent l'espace Atelier Nexa par email."
                     [width]="520" (closed)="closed.emit()">
      <label class="lbl">Adresses email</label>
      <div class="emails">
        @for (e of emails(); track e; let i = $index) {
          <span class="tag">{{ e }}<button (click)="remove(i)"><app-icon name="x" [size]="12" [stroke]="2.4" /></button></span>
        }
        <input class="emails__in" placeholder="nom@exemple.com" [value]="draft()"
               (input)="draft.set($any($event.target).value)" (keydown.enter)="add()" />
      </div>
      <div class="hint">Séparez les adresses par une virgule ; chaque adresse devient une étiquette retirable.</div>

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

      <div footer>
        <button class="ghost" (click)="closed.emit()">Annuler</button>
        <button class="primary" (click)="closed.emit()"><app-icon name="send" [size]="16" />Envoyer l'invitation</button>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .lbl { display: block; font-size: 11.5px; font-weight: 600; color: var(--nx-text-400); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .05em; }
    .emails { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; min-height: 46px; padding: 8px 10px; border: 1px solid var(--nx-border); border-radius: 10px; background: var(--nx-surface-3); }
    .emails__in { flex: 1; min-width: 140px; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: var(--nx-text); padding: 4px 2px; }
    .tag { display: inline-flex; align-items: center; gap: 7px; height: 28px; padding: 0 5px 0 11px; border-radius: var(--nx-r-pill); background: var(--nx-indigo-50); color: var(--nx-indigo-text); font-size: 13px; font-weight: 600; }
    .tag button { width: 18px; height: 18px; border: none; border-radius: 5px; background: transparent; color: #7c79c9; cursor: pointer; display: flex; align-items: center; justify-content: center; }
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
    .ghost { height: 40px; padding: 0 18px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn); background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
    .primary { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border: none; border-radius: var(--nx-r-btn); background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; box-shadow: var(--nx-shadow-primary); }
  `],
})
export class InvitationModalComponent {
  @Output() closed = new EventEmitter<void>();
  emails = signal<string[]>(['camille.roy@gmail.com', 'designer@studio.fr']);
  draft = signal('');
  role = signal<'Membre' | 'Administrateur'>('Membre');

  add(): void { const v = this.draft().trim(); if (!v) return; this.emails.update(l => [...l, v]); this.draft.set(''); }
  remove(i: number): void { this.emails.update(l => l.filter((_, idx) => idx !== i)); }
}
