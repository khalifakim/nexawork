import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SessionService } from '@core/services/session.service';
import { ToastService } from '@core/services/toast.service';

const PALETTE = ['#6C70F0', '#5B8DEF', '#2BB673', '#F5A623', '#F2693C', '#F5564E', '#E0497B', '#3AA9E0', '#8E5AD6', '#8E8AA0'];

/**
 * « Nouvel espace de travail » — faithful to the prototype's `wsCreateModal`.
 * The user stays on the current workspace after creation (per spec).
 */
@Component({
  selector: 'app-workspace-create',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="card" (click)="$event.stopPropagation()">
        <div class="hd">
          <div class="hd__ic" [style.background]="color()">{{ mono() }}</div>
          <div class="hd__t">
            <div class="hd__title">Nouvel espace de travail</div>
            <div class="hd__sub">Créez un espace pour votre équipe</div>
          </div>
          <button class="x" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
        </div>

        <div class="bd">
          <label class="lbl">Nom du workspace</label>
          <input class="in" [class.in--ok]="canCreate()"
                 [value]="name()" (input)="name.set($any($event.target).value)"
                 (keydown.enter)="create()"
                 placeholder="Mon équipe, Studio X…" autofocus />

          <label class="lbl" style="margin-top:20px">Couleur</label>
          <div class="pal">
            @for (c of palette; track c) {
              <button type="button" class="sw" [style.background]="c"
                      [class.sw--on]="color()===c"
                      [style.--sw-c]="c"
                      (click)="color.set(c)"></button>
            }
          </div>
        </div>

        <div class="ft">
          <button class="ghost" (click)="closed.emit()">Annuler</button>
          <button class="primary" [disabled]="!canCreate()" (click)="create()">Créer le workspace</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ov { position: fixed; inset: 0; z-index: 110; background: rgba(22,19,31,.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 40px; animation: nxFade .18s ease; }
    .card { width: 460px; max-width: 94vw; background: #fff; border-radius: 20px; box-shadow: 0 28px 80px rgba(20,15,40,.4); overflow: hidden; animation: nxFadeIn .2s ease; }
    .hd { display: flex; align-items: center; padding: 24px 28px 18px; gap: 14px; }
    .hd__ic { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 18px; flex: none; transition: background .2s; }
    .hd__t { flex: 1; min-width: 0; }
    .hd__title { font-size: 19px; font-weight: 700; letter-spacing: -.02em; }
    .hd__sub { font-size: 13px; color: var(--nx-text-500); margin-top: 2px; }
    .x { width: 32px; height: 32px; border: none; border-radius: 9px; background: transparent; color: var(--nx-text-500); cursor: pointer; display: flex; align-items: center; justify-content: center; flex: none; }
    .x:hover { background: var(--nx-surface-2); }

    .bd { padding: 0 28px 24px; }
    .lbl { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--nx-text-500); margin-bottom: 7px; }
    .in { width: 100%; box-sizing: border-box; height: 46px; padding: 0 16px; border: 1.5px solid #DDD9D1; border-radius: 12px; outline: none; font-family: inherit; font-size: 15px; font-weight: 500; color: var(--nx-text); transition: border .15s; }
    .in--ok { border-color: var(--nx-indigo); }

    .pal { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
    .sw { width: 34px; height: 34px; border-radius: 50%; border: none; cursor: pointer; padding: 0; transition: box-shadow .12s; }
    .sw--on { box-shadow: 0 0 0 2.5px #fff, 0 0 0 4.5px var(--sw-c, var(--nx-indigo)); }

    .ft { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 28px 22px; border-top: 1px solid var(--nx-border-card); }
    .ghost { height: 42px; padding: 0 20px; border: 1px solid #DDD9D1; border-radius: 11px; background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    .ghost:hover { background: var(--nx-surface-2); }
    .primary { height: 42px; padding: 0 24px; border: none; border-radius: 11px; background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 18px rgba(91,95,233,.28); }
    .primary:disabled { background: #cfcbc2; cursor: not-allowed; box-shadow: none; }

    @keyframes nxFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes nxFadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  `],
})
export class WorkspaceCreateComponent {
  @Output() closed = new EventEmitter<void>();

  private session = inject(SessionService);
  private toast = inject(ToastService);

  palette = PALETTE;
  name = signal('');
  color = signal(PALETTE[0]);

  canCreate = computed(() => this.name().trim().length >= 2);
  mono = computed(() => (this.name().trim() || 'N').charAt(0).toUpperCase());

  create(): void {
    if (!this.canCreate()) return;
    const ws = this.session.createWorkspace(this.name(), this.color());
    this.toast.show({ message: `Espace de travail « ${ws.name} » créé` });
    this.closed.emit();
  }
}
