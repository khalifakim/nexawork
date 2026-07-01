import {
  ChangeDetectionStrategy, Component, EventEmitter, Output, computed, signal,
} from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface Step { name: string; color: string; }

const ME = { name: 'Akim Koné', c: '#F5A623' };
const MEMBERS = [
  ME,
  { name: 'Moussa Bâ',   c: '#5B5FE9' },
  { name: 'Aïda Ndiaye', c: '#E0497B' },
  { name: 'Fatou Sarr',  c: '#3AA9E0' },
  { name: 'Yacine Sow',  c: '#2BB673' },
];

const ROLE_OPTS: [string, string][] = [
  ['Tous',            'Tous les membres'],
  ['Chef de projet',  'Chef de projet'  ],
];

// SVG paths for role icons (raw, passed via [path])
const IC_TOUS        = '<circle cx="9" cy="8" r="3"/><path d="M2.5 19c0-3 2.9-5.3 6.5-5.3s6.5 2.3 6.5 5.3"/><path d="M16.5 7.6a3 3 0 0 1 0 5.8M21.5 19c0-2.1-1.1-3.9-2.8-4.9"/>';
const IC_CHEF        = '<path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>';
const IC_ROLE: Record<string, string> = { 'Tous': IC_TOUS, 'Chef de projet': IC_CHEF };

// raw SVG paths for arrows (not in icon registry)
const IC_ARROW_UP   = '<path d="M12 19V5M5 12l7-7 7 7"/>';
const IC_ARROW_DOWN = '<path d="M12 5v14M5 12l7 7 7-7"/>';
const IC_FILTER     = '<path d="M3 6h18M6 12h12M10 18h4"/>';

@Component({
  selector: 'app-workflow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
<!-- Overlay -->
<div class="ov" (click)="closed.emit()">
<div class="card" (click)="$event.stopPropagation(); transOpen.set(null)">

  <!-- Header -->
  <div class="hd">
    <div class="hd__ic">
      <app-icon [path]="IC_FILTER" [size]="20" [stroke]="2" />
    </div>
    <div class="hd__tx">
      <div class="hd__t">Configurer le workflow</div>
      <div class="hd__s">Refonte App Mobile · définissez la séquence des colonnes et qui peut effectuer chaque transition.</div>
    </div>
    <button class="x-btn" (click)="closed.emit()" title="Fermer">
      <app-icon name="x" [size]="16" [stroke]="2.2" />
    </button>
  </div>

  <!-- Body -->
  <div class="bd">

    <!-- Section: Ordre des étapes -->
    <div class="sec-h">
      <div class="sec-h__t">Ordre des étapes</div>
      <div class="sec-h__s">L'ordre des colonnes du Kanban, de la première à la dernière.</div>
    </div>

    @for (s of steps(); track s.name; let i = $index; let last = $last) {
      <!-- Step row -->
      <div class="step">
        <span class="step__num">{{ i + 1 }}</span>
        <span class="step__dot" [style.background]="s.color"></span>
        <span class="step__name">{{ s.name }}</span>
        <div class="step__mv">
          <button [style.color]="i === 0 ? '#cfcbc2' : '#56525c'"
                  [style.cursor]="i === 0 ? 'default' : 'pointer'"
                  (click)="move(i, -1)" title="Monter">
            <app-icon [path]="IC_ARROW_UP" [size]="14" [stroke]="2" />
          </button>
          <button [style.color]="last ? '#cfcbc2' : '#56525c'"
                  [style.cursor]="last ? 'default' : 'pointer'"
                  (click)="move(i, 1)" title="Descendre">
            <app-icon [path]="IC_ARROW_DOWN" [size]="14" [stroke]="2" />
          </button>
        </div>
      </div>
      <!-- Arrow between steps -->
      @if (!last) {
        <div class="step-arr">
          <span style="color:#c4c0b8;display:flex">
            <app-icon [path]="IC_ARROW_DOWN" [size]="16" [stroke]="2" />
          </span>
        </div>
      }
    }

    <div style="height:18px"></div>

    <!-- Toggle: Imposer l'ordre de passage -->
    <button class="toggle"
            [style.border-color]="enforce() ? '#5B5FE9' : '#E6E3DC'"
            [style.background]="enforce() ? 'rgba(91,95,233,.05)' : '#fff'"
            (click)="$event.stopPropagation(); enforce.set(!enforce())">
      <span class="sw" [style.background]="enforce() ? '#5B5FE9' : '#D2CEC6'">
        <span class="sw__knob" [style.left]="enforce() ? '18px' : '2px'"></span>
      </span>
      <div class="toggle__tx">
        <div class="toggle__a">Imposer l'ordre de passage</div>
        <div class="toggle__b">Une tâche ne peut pas sauter d'étape : elle suit obligatoirement la séquence ci-dessus.</div>
      </div>
    </button>

    <div class="sep"></div>

    <!-- Section: Transitions & permissions -->
    <div class="sec-h">
      <div class="sec-h__t">Transitions &amp; permissions</div>
      <div class="sec-h__s">Pour chaque passage d'une colonne à la suivante, choisissez qui est autorisé à déplacer la tâche.</div>
    </div>

    <div class="trans-list">
      @for (t of transitions(); track t.to.name; let first = $first) {
        <div class="trans" [class.trans--first]="first">
          <!-- Label: from → to -->
          <div class="trans__l">
            <span class="trans__chip">
              <span class="trans__dot" [style.background]="t.from.color"></span>
              {{ t.from.name }}
            </span>
            <span class="trans__arr"><app-icon name="arrowRight" [size]="15" [stroke]="2" /></span>
            <span class="trans__chip">
              <span class="trans__dot" [style.background]="t.to.color"></span>
              {{ t.to.name }}
            </span>
          </div>

          <!-- Role selector -->
          <div class="tc" (click)="$event.stopPropagation()">
            <button class="tc__btn"
                    [style.border-color]="transOpen() === t.to.name ? '#5B5FE9' : '#D9D6CE'"
                    (click)="$event.stopPropagation(); openTrans(t.to.name)">
              @if (isRole(roleFor(t.to.name))) {
                <span class="tc__ic"><app-icon [path]="IC_ROLE[roleFor(t.to.name)] || ''" [size]="15" /></span>
              } @else {
                <span class="tc__av" [style.background]="memberColor(roleFor(t.to.name))">{{ ini(roleFor(t.to.name)) }}</span>
              }
              <span class="tc__lbl">{{ roleLabel(t.to.name) }}</span>
              <span style="display:flex;color:#9b97a3"><app-icon name="chevronDown" [size]="14" /></span>
            </button>

            @if (transOpen() === t.to.name) {
              <!-- Backdrop -->
              <div class="tc-bd" (click)="$event.stopPropagation(); transOpen.set(null)"></div>
              <!-- Popup -->
              <div class="tc-pp" (click)="$event.stopPropagation()">
                @for (r of ROLE_OPTS; track r[0]) {
                  <button class="tc-pp__i" [class.tc-pp__i--sel]="roleFor(t.to.name) === r[0]"
                          (click)="setRole(t.to.name, r[0])">
                    <span style="display:flex;color:#86828e"><app-icon [path]="IC_ROLE[r[0]]" [size]="16" /></span>
                    <span class="tc-pp__n">{{ r[1] }}</span>
                    @if (roleFor(t.to.name) === r[0]) {
                      <app-icon name="checkBig" [size]="15" style="color:#5B5FE9;display:flex" />
                    }
                  </button>
                }
                <div class="tc-pp__sep"></div>
                <div class="tc-pp__lbl">Membre spécifique</div>
                <input class="tc-pp__q" autofocus placeholder="Rechercher un membre…"
                       [value]="transQuery()"
                       (click)="$event.stopPropagation()"
                       (input)="transQuery.set($any($event.target).value)" />
                <div class="tc-pp__list">
                  @if (filteredMembers().length) {
                    @for (m of filteredMembers(); track m.name) {
                      <button class="tc-pp__i" [class.tc-pp__i--sel]="roleFor(t.to.name) === m.name"
                              (click)="setRole(t.to.name, m.name); transQuery.set('')">
                        <span class="tc-pp__av" [style.background]="m.c">{{ ini(m.name) }}</span>
                        <span class="tc-pp__n">{{ m.name }}{{ m.name === ME.name ? ' (moi)' : '' }}</span>
                        @if (roleFor(t.to.name) === m.name) {
                          <app-icon name="checkBig" [size]="15" style="color:#5B5FE9;display:flex" />
                        }
                      </button>
                    }
                  } @else {
                    <div class="tc-pp__empty">Aucun membre trouvé</div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>

  </div><!-- /bd -->

  <!-- Footer -->
  <div class="ft">
    <button class="ft-ghost" (click)="closed.emit()">Annuler</button>
    <button class="ft-primary" (click)="closed.emit()">
      <app-icon name="checkBig" [size]="16" [stroke]="2.4" />Enregistrer le workflow
    </button>
  </div>

</div>
</div>
  `,
  styles: [`
    /* ── Overlay & card ──────────────────────────────────────────────── */
    .ov {
      position: fixed; inset: 0; z-index: 120;
      background: rgba(22,19,31,.5); backdrop-filter: blur(2px);
      display: flex; align-items: flex-start; justify-content: center; padding-top: 64px;
    }
    .card {
      width: 600px; max-width: 94vw; max-height: 84vh;
      background: #fff; border-radius: 16px;
      box-shadow: 0 24px 70px rgba(20,15,40,.4);
      display: flex; flex-direction: column; overflow: hidden;
    }

    /* ── Header ─────────────────────────────────────────────────────── */
    .hd {
      flex: none; display: flex; align-items: flex-start; gap: 12px;
      padding: 20px 22px 16px; border-bottom: 1px solid #F0EEE9;
    }
    .hd__ic {
      width: 40px; height: 40px; flex: none; border-radius: 11px;
      background: rgba(91,95,233,.1); color: #5B5FE9;
      display: flex; align-items: center; justify-content: center;
    }
    .hd__tx { flex: 1; min-width: 0; }
    .hd__t { font-size: 18px; font-weight: 700; letter-spacing: -.01em; color: #1d1b25; }
    .hd__s { font-size: 13px; color: #86828e; margin-top: 3px; line-height: 1.45; }
    .x-btn {
      width: 30px; height: 30px; flex: none; border: none; border-radius: 8px;
      background: transparent; color: #9b97a3; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .x-btn:hover { background: #F4F2ED; }

    /* ── Body ───────────────────────────────────────────────────────── */
    .bd { flex: 1; overflow-y: auto; padding: 20px 22px; }

    /* Section header */
    .sec-h { margin-bottom: 12px; }
    .sec-h__t {
      font-size: 11px; font-weight: 700; letter-spacing: .06em;
      text-transform: uppercase; color: #5B5FE9;
    }
    .sec-h__s { font-size: 12.5px; color: #86828e; margin-top: 4px; line-height: 1.45; }

    /* Step row */
    .step {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 12px; background: #FAF9F6;
      border: 1px solid #ECEAE4; border-radius: 10px;
    }
    .step__num {
      width: 22px; height: 22px; flex: none; border-radius: 7px;
      background: #fff; border: 1px solid #E6E3DC;
      color: #86828e; font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .step__dot { width: 10px; height: 10px; border-radius: 3px; flex: none; }
    .step__name { flex: 1; font-size: 14px; font-weight: 600; color: #1d1b25; }
    .step__mv { display: flex; gap: 4px; }
    .step__mv button {
      width: 28px; height: 28px; border: 1px solid #E6E3DC; border-radius: 7px;
      background: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }

    /* Arrow between steps */
    .step-arr { display: flex; justify-content: center; padding: 2px 0; }

    /* Toggle */
    .toggle {
      display: flex; align-items: center; gap: 12px; width: 100%;
      padding: 13px 14px; border: 1px solid #E6E3DC; border-radius: 11px;
      background: #fff; cursor: pointer; font-family: inherit; text-align: left;
      margin-bottom: 16px;
    }
    .sw {
      width: 38px; height: 22px; flex: none; border-radius: 20px; position: relative;
    }
    .sw__knob {
      position: absolute; top: 2px; width: 18px; height: 18px;
      border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2);
      transition: left .15s;
    }
    .toggle__tx { flex: 1; }
    .toggle__a { font-size: 13.5px; font-weight: 600; color: #1d1b25; }
    .toggle__b { font-size: 12.5px; color: #86828e; margin-top: 2px; }

    /* Separator */
    .sep { height: 1px; background: #F0EEE9; margin: 4px 0 18px; }

    /* Transition rows */
    .trans {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0; border-top: 1px solid #F0EEE9;
    }
    .trans--first { border-top: none; }
    .trans__l {
      flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px;
      font-size: 13.5px; font-weight: 600; color: #1d1b25; flex-wrap: wrap;
    }
    .trans__chip { display: inline-flex; align-items: center; gap: 6px; }
    .trans__dot { width: 8px; height: 8px; border-radius: 3px; }
    .trans__arr { color: #b4b0bb; display: flex; }

    /* Transition control (role selector) */
    .tc { position: relative; flex: none; width: 210px; }
    .tc__btn {
      width: 100%; box-sizing: border-box;
      display: flex; align-items: center; gap: 8px;
      height: 36px; padding: 0 10px;
      border-radius: 9px; border: 1px solid #D9D6CE;
      background: #fff; cursor: pointer; font-family: inherit;
      font-size: 13px; font-weight: 600; color: #1d1b25;
    }
    .tc__btn:hover { background: #F4F2ED; }
    .tc__ic { display: flex; color: #86828e; }
    .tc__av {
      width: 20px; height: 20px; flex: none; border-radius: 50%;
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 700;
    }
    .tc__lbl { flex: 1; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Backdrop */
    .tc-bd { position: fixed; inset: 0; background: transparent; z-index: 30; }

    /* Popup */
    .tc-pp {
      position: absolute; top: 40px; right: 0; z-index: 31;
      width: 244px; background: #fff; border-radius: 11px;
      border: 1px solid #ECEAE4; box-shadow: 0 12px 34px rgba(20,15,40,.18); padding: 6px;
    }
    .tc-pp__i {
      width: 100%; box-sizing: border-box;
      display: flex; align-items: center; gap: 10px;
      padding: 8px 9px; border: none; border-radius: 8px;
      background: transparent; cursor: pointer; font-family: inherit; text-align: left;
    }
    .tc-pp__i:hover, .tc-pp__i--sel { background: #EFEDE7; }
    .tc-pp__n { flex: 1; font-size: 13px; font-weight: 600; color: #1d1b25; }
    .tc-pp__sep { height: 1px; background: #ECEAE4; margin: 6px 4px; }
    .tc-pp__lbl {
      font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
      color: #a9a5b0; padding: 2px 10px 5px;
    }
    .tc-pp__q {
      width: 100%; box-sizing: border-box; height: 34px; padding: 0 10px;
      border-radius: 8px; border: 1px solid #D9D6CE;
      font-family: inherit; font-size: 13px; color: #1d1b25;
      margin-bottom: 6px; outline: none;
    }
    .tc-pp__list { max-height: 150px; overflow-y: auto; }
    .tc-pp__av {
      width: 24px; height: 24px; flex: none; border-radius: 50%;
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700;
    }
    .tc-pp__empty { padding: 10px; text-align: center; font-size: 12.5px; color: #a8a4af; }

    /* ── Footer ─────────────────────────────────────────────────────── */
    .ft {
      flex: none; display: flex; justify-content: flex-end; gap: 10px;
      padding: 14px 22px; border-top: 1px solid #F0EEE9;
    }
    .ft-ghost {
      height: 40px; padding: 0 18px;
      border: 1px solid #D9D6CE; border-radius: 9px;
      background: #fff; color: #46434e;
      font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
    }
    .ft-ghost:hover { background: #F4F2ED; }
    .ft-primary {
      display: flex; align-items: center; gap: 8px;
      height: 40px; padding: 0 18px; border: none; border-radius: 9px;
      background: #5B5FE9; color: #fff;
      font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
      box-shadow: 0 6px 18px rgba(91,95,233,.3);
    }
    .ft-primary:hover { background: #4D51DC; }
  `],
})
export class WorkflowComponent {
  @Output() closed = new EventEmitter<void>();

  readonly ME         = ME;
  readonly ROLE_OPTS  = ROLE_OPTS;
  readonly IC_ROLE    = IC_ROLE;
  readonly IC_FILTER  = IC_FILTER;
  readonly IC_ARROW_UP   = IC_ARROW_UP;
  readonly IC_ARROW_DOWN = IC_ARROW_DOWN;

  enforce = signal(true);
  steps   = signal<Step[]>([
    { name: 'À faire',     color: '#8E8AA0' },
    { name: 'En cours',    color: '#5B8DEF' },
    { name: 'En révision', color: '#E89A2C' },
    { name: 'Validé',      color: '#2BB673' },
  ]);

  roles      = signal<Record<string, string>>({});
  transOpen  = signal<string | null>(null);
  transQuery = signal('');

  transitions = computed(() => {
    const s = this.steps();
    const out: { from: Step; to: Step }[] = [];
    for (let i = 1; i < s.length; i++) out.push({ from: s[i - 1], to: s[i] });
    return out;
  });

  filteredMembers = computed(() => {
    const q = this.transQuery().toLowerCase().trim();
    return MEMBERS.filter(m => m.name.toLowerCase().includes(q));
  });

  move(i: number, dir: number): void {
    const j = i + dir;
    this.steps.update(l => {
      if (j < 0 || j >= l.length) return l;
      const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n;
    });
  }

  roleFor(toName: string): string  { return this.roles()[toName] ?? 'Tous'; }
  isRole(r: string): boolean       { return ROLE_OPTS.some(o => o[0] === r); }

  roleLabel(toName: string): string {
    const r = this.roleFor(toName);
    const opt = ROLE_OPTS.find(o => o[0] === r);
    return opt ? opt[1] : r;
  }

  memberColor(name: string): string {
    return MEMBERS.find(m => m.name === name)?.c ?? '#5B5FE9';
  }

  ini(name: string): string { return name.split(' ').map(w => w[0]).join(''); }

  openTrans(toName: string): void {
    this.transOpen.set(this.transOpen() === toName ? null : toName);
    this.transQuery.set('');
  }

  setRole(toName: string, role: string): void {
    this.roles.update(r => ({ ...r, [toName]: role }));
    this.transOpen.set(null);
  }
}
