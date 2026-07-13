import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MembersService } from '@core/services/members.service';
import { Member } from '@core/models/member.models';

/** Un membre sélectionnable — `id` = userId réel (envoyé au backend). */
interface Person { id: string; n: string; c: string; role: string; email: string; }

/** « Nouvelle réunion » — modal de création, fidèle au prototype `meetingCreateModal`. */
@Component({
  selector: 'app-creer-reunion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="hd">
          <span class="hd__ic"><app-icon name="video" [size]="20" [stroke]="1.8" /></span>
          <div class="hd__t">
            <div class="hd__title">Nouvelle réunion</div>
            <div class="hd__sub">Invitez des membres ou des participants externes</div>
          </div>
          <button class="x" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
        </div>

        <!-- Titre -->
        <div class="titlewrap">
          <input class="titlein" [class.titlein--on]="title().trim()" [value]="title()"
                 (input)="title.set($any($event.target).value)" placeholder="Titre de la réunion…" autofocus />
        </div>

        <!-- Onglets -->
        <div class="tabs">
          <button class="tab" [class.tab--on]="tab()==='interne'" (click)="tab.set('interne')">
            <app-icon name="teams" [size]="16" />Invités internes{{ internal().length ? ' (' + internal().length + ')' : '' }}
          </button>
          <button class="tab" [class.tab--on]="tab()==='externe'" (click)="tab.set('externe')">
            <app-icon name="mail" [size]="16" />Invités externes{{ external().length ? ' (' + external().length + ')' : '' }}
          </button>
        </div>

        <!-- Body -->
        <div class="body">
          @if (tab()==='interne') {
            <div class="srch">
              <div class="srch__bar" [class.srch__bar--on]="q()">
                <app-icon name="search" [size]="16" />
                <input [value]="q()" (input)="q.set($any($event.target).value)" placeholder="Rechercher par nom ou email…" />
              </div>
              @if (suggestions().length) {
                <div class="dd">
                  @for (m of suggestions(); track m.id) {
                    <button class="dd__row" (click)="addMember(m)">
                      <span class="dd__av" [style.background]="m.c">{{ ini(m.n) }}</span>
                      <span class="dd__tx"><span class="dd__n">{{ m.n }}</span><span class="dd__e">{{ m.email }}</span></span>
                      <span class="dd__add">+ Ajouter</span>
                    </button>
                  }
                </div>
              } @else if (q()) {
                <div class="dd dd--empty">Aucun membre trouvé</div>
              }
            </div>

            @if (internal().length) {
              <div class="chips">
                @for (m of internal(); track m.id) {
                  <div class="chip">
                    <span class="chip__av" [style.background]="m.c">{{ ini(m.n) }}</span>
                    <span class="chip__n">{{ m.n }}</span>
                    <button class="chip__x" (click)="removeMember(m.id)"><app-icon name="x" [size]="11" [stroke]="2.4" /></button>
                  </div>
                }
              </div>
            } @else {
              <div class="empty">Tapez un nom pour rechercher et ajouter des membres</div>
            }
          } @else {
            <div class="extrow">
              <input class="extin" [class.extin--err]="emailError()"
                     [value]="extInput()" (input)="extInput.set($any($event.target).value)"
                     (keydown.enter)="addExternal()" placeholder="adresse@email.com" />
              <button class="extadd" [disabled]="!canAddExternal()" (click)="addExternal()"><app-icon name="plus" [size]="15" />Ajouter</button>
            </div>
            @if (emailError(); as err) {
              <div class="exterr"><app-icon name="info" [size]="14" /><span>{{ err }}</span></div>
            }
            @if (external().length) {
              <div class="chips">
                @for (e of external(); track e) {
                  <div class="chip">
                    <span class="chip__mi"><app-icon name="mail" [size]="14" /></span>
                    <span class="chip__n">{{ e }}</span>
                    <button class="chip__x" (click)="removeExternal(e)"><app-icon name="x" [size]="11" [stroke]="2.4" /></button>
                  </div>
                }
              </div>
            } @else {
              <div class="empty">Saisissez une adresse email et cliquez sur « Ajouter »</div>
            }
          }
        </div>

        <!-- Footer -->
        <div class="ft">
          @if (totalInvites() > 0) {
            <span class="ft__cnt">{{ totalInvites() }} invité{{ totalInvites() > 1 ? 's' : '' }}</span>
          } @else { <span></span> }
          <div class="ft__btns">
            <button class="ft__cancel" (click)="closed.emit()">Annuler</button>
            <button class="ft__ok" [disabled]="!canCreate()" (click)="create()">
              @if (busy) {
                <span class="ft__spin"></span>Création…
              } @else {
                <app-icon name="video" [size]="16" [stroke]="1.9" />Créer la réunion
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ov { position: fixed; inset: 0; z-index: 150; background: rgba(22,19,31,.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; }
    .card { width: 540px; max-width: 94vw; max-height: 88vh; background: #fff; border-radius: 20px; box-shadow: 0 28px 80px rgba(20,15,40,.4); display: flex; flex-direction: column; overflow: hidden; animation: nxFade .18s ease; }
    .hd { flex: none; display: flex; align-items: center; padding: 24px 28px 18px; }
    .hd__ic { width: 42px; height: 42px; flex: none; border-radius: 12px; background: linear-gradient(135deg,var(--nx-indigo),#4B3FD6); color: #fff; display: flex; align-items: center; justify-content: center; margin-right: 14px; }
    .hd__t { flex: 1; min-width: 0; }
    .hd__title { font-size: 19px; font-weight: 700; letter-spacing: -.02em; }
    .hd__sub { font-size: 13px; color: var(--nx-text-500); margin-top: 2px; }
    .x { width: 32px; height: 32px; flex: none; border: none; border-radius: 9px; background: transparent; color: var(--nx-text-500); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .x:hover { background: var(--nx-surface-2); }
    .titlewrap { flex: none; padding: 0 28px 18px; }
    .titlein { width: 100%; box-sizing: border-box; height: 46px; padding: 0 16px; border: 1.5px solid #DDD9D1; border-radius: 12px; outline: none; font-family: inherit; font-size: 15px; font-weight: 500; color: var(--nx-text); transition: border .15s; }
    .titlein--on { border-color: var(--nx-indigo); }
    .titlein::placeholder { color: var(--nx-text-400); }
    .tabs { flex: none; display: flex; border-bottom: 1px solid var(--nx-border-card); padding: 0 28px; }
    .tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 0; border: none; border-bottom: 2.5px solid transparent; background: transparent; color: var(--nx-text-500); font-family: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer; }
    .tab--on { border-bottom-color: var(--nx-indigo); color: var(--nx-indigo); font-weight: 700; }
    .body { flex: 1; overflow-y: auto; padding: 20px 28px; }
    .srch { position: relative; margin-bottom: 14px; }
    .srch__bar { display: flex; align-items: center; gap: 9px; height: 42px; padding: 0 14px; border: 1px solid #DDD9D1; border-radius: 11px; background: #fff; color: var(--nx-text-300); transition: border .15s; }
    .srch__bar--on { border-color: var(--nx-indigo); }
    .srch__bar input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 14px; color: var(--nx-text); }
    .dd { position: absolute; top: 48px; left: 0; right: 0; z-index: 5; background: #fff; border-radius: 12px; border: 1px solid #ECEAE4; box-shadow: 0 10px 30px rgba(20,15,40,.16); padding: 5px; max-height: 200px; overflow-y: auto; }
    .dd--empty { padding: 18px; text-align: center; font-size: 13px; color: var(--nx-text-300); }
    .dd__row { width: 100%; display: flex; align-items: center; gap: 11px; padding: 9px 11px; border: none; border-radius: 8px; background: transparent; cursor: pointer; font-family: inherit; text-align: left; }
    .dd__row:hover { background: var(--nx-surface-2); }
    .dd__av { width: 32px; height: 32px; flex: none; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
    .dd__tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .dd__n { font-size: 13.5px; font-weight: 600; color: var(--nx-text); }
    .dd__e { font-size: 12px; color: var(--nx-text-400); }
    .dd__add { font-size: 12px; font-weight: 600; color: var(--nx-indigo); flex: none; }
    .chips { display: flex; flex-direction: column; gap: 6px; }
    .chip { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--nx-surface-2); border-radius: 10px; font-size: 13px; font-weight: 500; color: var(--nx-text); }
    .chip__av { width: 26px; height: 26px; flex: none; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
    .chip__mi { width: 26px; height: 26px; flex: none; border-radius: 50%; background: #E2DFD8; color: var(--nx-text-500); display: flex; align-items: center; justify-content: center; }
    .chip__n { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chip__x { width: 20px; height: 20px; flex: none; border: none; border-radius: 50%; background: rgba(0,0,0,.08); color: var(--nx-text-500); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .chip__x:hover { background: rgba(245,86,78,.15); color: #F5564E; }
    .empty { padding: 20px; text-align: center; font-size: 13px; color: var(--nx-text-300); background: var(--nx-surface-3); border-radius: 10px; }
    .extrow { display: flex; gap: 10px; margin-bottom: 14px; }
    .extin { flex: 1; min-width: 0; height: 42px; padding: 0 14px; border: 1px solid #DDD9D1; border-radius: 11px; outline: none; font-family: inherit; font-size: 14px; color: var(--nx-text); }
    .extin--err { border-color: var(--nx-danger); box-shadow: 0 0 0 3px rgba(245,86,78,.14); }
    .extadd { height: 42px; padding: 0 18px; border: none; border-radius: 11px; background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; flex: none; display: flex; align-items: center; gap: 6px; }
    .extadd:disabled { background: #cfcbc2; cursor: not-allowed; box-shadow: none; }
    .exterr { display: flex; align-items: center; gap: 6px; margin-top: -6px; margin-bottom: 12px; font-size: 12.5px; color: var(--nx-danger); }
    .ft { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 16px 28px 22px; border-top: 1px solid var(--nx-border-card); }
    .ft__cnt { font-size: 13px; color: var(--nx-text-500); }
    .ft__btns { display: flex; gap: 10px; }
    .ft__cancel { height: 42px; padding: 0 20px; border: 1px solid #DDD9D1; border-radius: 11px; background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    .ft__cancel:hover { background: var(--nx-surface-2); }
    .ft__ok { display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 24px; border: none; border-radius: 11px; background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 18px rgba(91,95,233,.28); }
    .ft__ok:disabled { background: #cfcbc2; box-shadow: none; cursor: default; }
    .ft__spin { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: nxspin .7s linear infinite; }
    @keyframes nxspin { to { transform: rotate(360deg); } }
  `],
})
export class CreerReunionComponent {
  /** Création en cours : le bouton passe en « Création… » (l'appel dure ~1-2 s). */
  @Input() busy = false;
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<{ title: string; memberIds: string[]; emails: string[] }>();

  private membersSvc = inject(MembersService);

  tab = signal<'interne' | 'externe'>('interne');
  title = signal('');
  q = signal('');
  internal = signal<Person[]>([]);
  external = signal<string[]>([]);
  extInput = signal('');

  /** Membres réels du workspace (hors soi) — la liste était codée en dur. */
  private people = toSignal(this.membersSvc.others(), { initialValue: [] as Member[] });

  suggestions = computed<Person[]>(() => {
    const q = this.q().toLowerCase().trim();
    if (!q) return [];
    const sel = new Set(this.internal().map(p => p.id));
    return this.people()
      .filter(m => !!m.userId && !sel.has(m.userId))
      .filter(m => m.name.toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q))
      .map(m => ({ id: m.userId!, n: m.name, c: m.color, role: m.role, email: m.email ?? '' }));
  });
  totalInvites = computed(() => this.internal().length + this.external().length);
  canCreate = computed(() => this.title().trim().length > 0 && !this.busy);

  /** RFC-lite : local@domaine.tld — suffisant côté UI, la vraie validation reste serveur. */
  private static EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  emailError = computed<string | null>(() => {
    const raw = this.extInput().trim();
    if (!raw) return null;
    if (!CreerReunionComponent.EMAIL_RE.test(raw)) {
      return "Format d'adresse email invalide (ex. prenom.nom@exemple.com).";
    }
    if (this.external().includes(raw)) return 'Cette adresse a déjà été ajoutée.';
    return null;
  });

  canAddExternal = computed(() => {
    const raw = this.extInput().trim();
    return !!raw && !this.emailError();
  });

  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join(''); }

  addMember(p: Person): void { this.internal.update(l => [...l, p]); this.q.set(''); }
  removeMember(id: string): void { this.internal.update(l => l.filter(x => x.id !== id)); }
  addExternal(): void {
    if (!this.canAddExternal()) return;
    const email = this.extInput().trim();
    this.external.update(l => [...l, email]);
    this.extInput.set('');
  }
  removeExternal(e: string): void { this.external.update(l => l.filter(x => x !== e)); }

  create(): void {
    if (!this.canCreate()) return;
    this.created.emit({
      title: this.title().trim(),
      memberIds: this.internal().map(p => p.id),
      emails: this.external(),
    });
  }
}
