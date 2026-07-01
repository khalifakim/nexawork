import {
  ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface St { id: string; name: string; color: string; cat: string; }

const CATS = [
  { id: 'notstarted', label: 'Not started' },
  { id: 'active',     label: 'Active'      },
  { id: 'done',       label: 'Done'        },
  { id: 'closed',     label: 'Closed'      },
];

const CAT_COLORS: Record<string, string> = {
  notstarted: '#8E8AA0',
  active:     '#5B8DEF',
  done:       '#2BB673',
  closed:     '#2B9E8E',
};

const PALETTE = [
  '#8E8AA0','#5C6370','#5B8DEF','#3AA9E0',
  '#6C70F0','#8E5AD6','#C44AC0','#E0497B',
  '#F5564E','#F2693C','#F5A623','#E89A2C',
  '#7FB800','#2BB673','#2B9E8E','#46A0A0',
];

@Component({
  selector: 'app-statuts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
<!-- Overlay -->
<div class="ov" (click)="closed.emit()">
<div class="card" (click)="$event.stopPropagation()">

  <!-- Header -->
  <div class="hd">
    <div class="hd__t">
      Modifier les statuts pour <span class="hd__proj">Refonte App Mobile</span>
    </div>
    <button class="x-btn" (click)="closed.emit()" title="Fermer">
      <app-icon name="x" [size]="16" />
    </button>
  </div>

  <!-- Body: left panel + right panel -->
  <div class="bd">

    <!-- Left panel -->
    <div class="left">
      <div class="left__t">Statuts personnalisés</div>
      <p class="left__p">Renommez, recolorez et déplacez les statuts par glisser-déposer entre les quatre catégories.</p>
      <div class="left__sep"></div>
      <div class="left__leg">
        @for (cat of CATS; track cat.id) {
          <div class="left__row">
            <span class="left__dot" [style.background]="CAT_COLORS[cat.id]"></span>
            <span class="left__lbl">{{ cat.label }}</span>
          </div>
        }
      </div>
    </div>

    <!-- Right panel -->
    <div class="right">
      @for (cat of CATS; track cat.id) {
        <div class="group"
             (dragover)="$event.preventDefault(); dropCat.set(cat.id)"
             (drop)="groupDrop($event, cat.id)">

          <!-- Category header -->
          <div class="gh">
            <span class="gh__l">{{ cat.label }}</span>
            <span class="gh__info"
                  title="Catégorie fixe — chaque statut appartient à l'un de ces quatre groupes.">
              <app-icon name="info" [size]="14" />
            </span>
            <span style="flex:1"></span>
            <button class="gh__add" title="Ajouter un statut" (click)="addStatus(cat.id)">
              <app-icon name="plus" [size]="16" />
            </button>
          </div>

          <!-- Status rows -->
          @for (c of byCat(cat.id); track c.id) {
            <div class="srow"
                 draggable="true"
                 [style.opacity]="dragId() === c.id ? 0.4 : 1"
                 [style.box-shadow]="dropBefore() === c.id ? 'inset 0 2px 0 #5B5FE9' : 'none'"
                 (dragstart)="startDrag($event, c.id)"
                 (dragend)="endDrag()"
                 (dragover)="onDragOver($event, c.id, c.cat)"
                 (drop)="onDrop($event, c.cat, c.id)">
              <!-- Grip -->
              <span class="grip"><app-icon name="grip" [size]="16" /></span>
              <!-- Color icon button -->
              <button class="col-btn" title="Couleur du statut"
                      (click)="$event.stopPropagation(); toggleColor(c.id)">
                <span [innerHTML]="statusIconHtml(c.cat, c.color)"></span>
              </button>
              <!-- Name input -->
              <input class="sname" [value]="c.name" placeholder="Nom du statut"
                     (input)="rename(c.id, $any($event.target).value)" />
              <!-- Dots menu -->
              <button class="dots-btn" (click)="$event.stopPropagation(); toggleMenu(c.id)">⋯</button>

              <!-- Color picker popup -->
              @if (colorOpenId() === c.id) {
                <div class="popup-bd" (click)="$event.stopPropagation(); colorOpenId.set(null)"></div>
                <div class="cp" (click)="$event.stopPropagation()">
                  <div class="cp__grid">
                    @for (cl of PALETTE; track cl) {
                      <button class="cp__sw"
                              [style.background]="cl"
                              [style.border-color]="cl === c.color ? '#1d1b25' : '#fff'"
                              [style.box-shadow]="cl === c.color ? '0 0 0 1px #1d1b25' : '0 0 0 1px #E2DFD8'"
                              (click)="setColor(c.id, cl)"></button>
                    }
                  </div>
                </div>
              }

              <!-- Dots menu popup -->
              @if (menuOpenId() === c.id) {
                <div class="popup-bd" (click)="$event.stopPropagation(); menuOpenId.set(null)"></div>
                <div class="smenu" (click)="$event.stopPropagation()">
                  <button class="smenu__del" (click)="del(c.id)">
                    <app-icon name="trash" [size]="15" /><span>Supprimer le statut</span>
                  </button>
                </div>
              }
            </div>
          }

          <!-- Dashed add-status row / drop zone -->
          <button class="add-row"
                  [class.add-row--over]="dragId() && dropCat() === cat.id"
                  (click)="addStatus(cat.id)">
            <app-icon name="plus" [size]="15" /><span>Add status</span>
          </button>
        </div>
      }
    </div>
  </div>

  <!-- Footer -->
  <div class="ft">
    <span style="flex:1"></span>
    <button class="ft-ghost" (click)="closed.emit()">Annuler</button>
    <button class="ft-primary" (click)="closed.emit()">Appliquer les modifications</button>
  </div>

</div>
</div>
  `,
  styles: [`
    /* ── Overlay & card ──────────────────────────────────────────────── */
    .ov {
      position: fixed; inset: 0; z-index: 140;
      background: rgba(22,19,31,.5); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center; padding: 40px;
    }
    .card {
      width: 840px; max-width: 95vw; height: 80vh; max-height: 720px;
      background: #fff; border-radius: 18px;
      box-shadow: 0 30px 90px rgba(20,15,40,.45);
      display: flex; flex-direction: column; overflow: hidden;
    }

    /* ── Header ─────────────────────────────────────────────────────── */
    .hd {
      flex: none; display: flex; align-items: center; gap: 10px;
      padding: 18px 22px; border-bottom: 1px solid #F0EEE9;
    }
    .hd__t { flex: 1; font-size: 17px; font-weight: 700; color: #1d1b25; }
    .hd__proj { border-bottom: 1.5px dashed #c4c0b8; }
    .x-btn {
      width: 32px; height: 32px; border: none; border-radius: 50%;
      background: #F0EEE8; color: #86828e; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .x-btn:hover { background: #E6E3DC; }

    /* ── Body ───────────────────────────────────────────────────────── */
    .bd { flex: 1; min-height: 0; display: flex; overflow: hidden; }

    /* Left panel */
    .left {
      width: 252px; flex: none; padding: 24px 22px;
      border-right: 1px solid #F0EEE9; background: #FBFAF7;
    }
    .left__t { font-size: 13px; font-weight: 700; color: #1d1b25; margin-bottom: 9px; }
    .left__p { margin: 0; font-size: 12.5px; color: #86828e; line-height: 1.6; }
    .left__sep { height: 1px; background: #ECEAE4; margin: 18px 0; }
    .left__leg { display: flex; flex-direction: column; gap: 11px; }
    .left__row { display: flex; align-items: center; gap: 9px; }
    .left__dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    .left__lbl { font-size: 12.5px; font-weight: 600; color: #56525c; }

    /* Right panel */
    .right {
      flex: 1; min-width: 0; min-height: 0;
      overflow-y: auto; overflow-x: hidden; padding: 24px 24px 10px;
    }

    /* Group */
    .group { margin-bottom: 20px; }
    .gh {
      display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
    }
    .gh__l { font-size: 13px; font-weight: 700; color: #86828e; }
    .gh__info { display: flex; color: #c4c0b8; cursor: help; }
    .gh__add {
      width: 28px; height: 28px; border: none; border-radius: 7px;
      background: transparent; color: #86828e; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .gh__add:hover { background: #F4F2ED; }

    /* Status row */
    .srow {
      display: flex; align-items: center; gap: 8px;
      height: 46px; padding: 0 8px 0 10px;
      border-radius: 10px; border: 1px solid #ECEAE4;
      background: #fff; margin-bottom: 8px;
      position: relative; cursor: default;
    }
    .grip { display: flex; color: #c4c0b8; cursor: grab; flex: none; }
    .col-btn {
      width: 26px; height: 26px; flex: none; border: none; border-radius: 7px;
      background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center; padding: 0;
    }
    .col-btn:hover { background: #F4F2ED; }
    .sname {
      flex: 1; min-width: 0; border: none; outline: none; background: transparent;
      font-family: inherit; font-size: 13px; font-weight: 700;
      letter-spacing: .03em; text-transform: uppercase; color: #1d1b25;
    }
    .dots-btn {
      width: 28px; height: 28px; flex: none; border: none; border-radius: 7px;
      background: transparent; color: #9b97a3; cursor: pointer;
      font-size: 16px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
    }
    .dots-btn:hover { background: #F4F2ED; }

    /* Color picker popup */
    .popup-bd { position: fixed; inset: 0; background: transparent; z-index: 42; }
    .cp {
      position: absolute; top: 36px; left: 40px; z-index: 43;
      width: 212px; background: #fff; border-radius: 12px;
      border: 1px solid #ECEAE4; box-shadow: 0 12px 34px rgba(20,15,40,.18); padding: 11px;
    }
    .cp__grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 7px; }
    .cp__sw {
      width: 20px; height: 20px; border-radius: 6px;
      border: 2px solid #fff; cursor: pointer; padding: 0;
    }
    .cp__sw:hover { transform: scale(1.15); }

    /* Dots menu popup */
    .smenu {
      position: absolute; top: 36px; right: 6px; z-index: 43;
      width: 190px; background: #fff; border-radius: 10px;
      border: 1px solid #ECEAE4; box-shadow: 0 12px 34px rgba(20,15,40,.18); padding: 6px;
    }
    .smenu__del {
      width: 100%; box-sizing: border-box;
      display: flex; align-items: center; gap: 10px;
      padding: 9px 11px; border: none; border-radius: 8px;
      background: transparent; cursor: pointer;
      font-family: inherit; font-size: 13px; font-weight: 600;
      color: #E0497B; text-align: left;
    }
    .smenu__del:hover { background: #FBE9E7; }

    /* Add row (dashed drop zone) */
    .add-row {
      display: flex; align-items: center; gap: 9px;
      width: 100%; height: 44px; padding: 0 12px;
      border: 1px dashed #DDD9D1; border-radius: 10px;
      background: transparent; color: #86828e;
      font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .add-row:hover { background: #F4F2ED; }
    .add-row--over {
      border-color: #5B5FE9; background: rgba(91,95,233,.05);
    }

    /* ── Footer ─────────────────────────────────────────────────────── */
    .ft {
      flex: none; display: flex; align-items: center; gap: 10px;
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
      height: 40px; padding: 0 20px; border: none; border-radius: 9px;
      background: #5B5FE9; color: #fff;
      font-family: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer;
      box-shadow: 0 6px 18px rgba(91,95,233,.3);
    }
    .ft-primary:hover { background: #4D51DC; }
  `],
})
export class StatutsComponent {
  @Output() closed = new EventEmitter<void>();

  private sanitizer = inject(DomSanitizer);

  readonly CATS      = CATS;
  readonly CAT_COLORS = CAT_COLORS;
  readonly PALETTE   = PALETTE;

  statuses = signal<St[]>([
    { id: 's1', name: 'À faire',     color: '#8E8AA0', cat: 'notstarted' },
    { id: 's2', name: 'En cours',    color: '#5B8DEF', cat: 'active'     },
    { id: 's3', name: 'En révision', color: '#E89A2C', cat: 'active'     },
    { id: 's4', name: 'Validé',      color: '#2BB673', cat: 'done'       },
  ]);

  colorOpenId = signal<string | null>(null);
  menuOpenId  = signal<string | null>(null);

  // drag-and-drop state
  dragId    = signal<string | null>(null);
  dropCat   = signal<string | null>(null);
  dropBefore = signal<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  byCat(cat: string): St[] { return this.statuses().filter(s => s.cat === cat); }

  // ── Mutations ────────────────────────────────────────────────────────────
  rename(id: string, v: string): void {
    this.statuses.update(l => l.map(s => s.id === id ? { ...s, name: v } : s));
  }
  del(id: string): void {
    this.statuses.update(l => l.filter(s => s.id !== id));
    this.menuOpenId.set(null);
  }
  addStatus(cat: string): void {
    const id = 'st-' + Date.now().toString(36);
    this.statuses.update(arr => {
      const a = [...arr];
      let last = -1;
      a.forEach((c, i) => { if (c.cat === cat) last = i; });
      const nc: St = { id, name: '', color: '#6C70F0', cat };
      if (last < 0) a.push(nc); else a.splice(last + 1, 0, nc);
      return a;
    });
  }
  setColor(id: string, color: string): void {
    this.statuses.update(l => l.map(s => s.id === id ? { ...s, color } : s));
    this.colorOpenId.set(null);
  }

  // ── Popup toggles ────────────────────────────────────────────────────────
  toggleColor(id: string): void {
    this.menuOpenId.set(null);
    this.colorOpenId.set(this.colorOpenId() === id ? null : id);
  }
  toggleMenu(id: string): void {
    this.colorOpenId.set(null);
    this.menuOpenId.set(this.menuOpenId() === id ? null : id);
  }

  // ── Drag-and-drop ────────────────────────────────────────────────────────
  startDrag(e: DragEvent, id: string): void {
    this.dragId.set(id);
    e.dataTransfer?.setData('text/plain', id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }
  endDrag(): void {
    this.dragId.set(null); this.dropCat.set(null); this.dropBefore.set(null);
  }
  onDragOver(e: DragEvent, id: string, cat: string): void {
    e.preventDefault();
    if (this.dropBefore() !== id) { this.dropBefore.set(id); this.dropCat.set(cat); }
  }
  onDrop(e: DragEvent, cat: string, beforeId: string): void {
    e.preventDefault(); e.stopPropagation();
    this.doMove(cat, beforeId);
  }
  groupDrop(e: DragEvent, cat: string): void {
    e.preventDefault(); this.doMove(cat, null);
  }
  private doMove(cat: string, beforeId: string | null): void {
    const di = this.dragId();
    if (!di) return;
    this.statuses.update(arr => {
      const a = [...arr];
      const idx = a.findIndex(c => c.id === di);
      if (idx < 0) return arr;
      const moved = { ...a[idx], cat };
      a.splice(idx, 1);
      let at: number;
      if (beforeId && beforeId !== moved.id) {
        at = a.findIndex(c => c.id === beforeId);
        if (at < 0) at = a.length;
      } else {
        let last = -1;
        a.forEach((c, i) => { if (c.cat === cat) last = i; });
        at = last + 1;
      }
      a.splice(at, 0, moved);
      return a;
    });
    this.dragId.set(null); this.dropCat.set(null); this.dropBefore.set(null);
  }

  // ── Status icon SVG (matches prototype exactly) ──────────────────────────
  statusIconHtml(cat: string, color: string): SafeHtml {
    let body: string;
    if (cat === 'closed') {
      body = `<circle cx="12" cy="12" r="9" fill="${color}" stroke="none"/>` +
             `<path d="M8 12.4l2.6 2.6L16 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (cat === 'done') {
      body = `<circle cx="12" cy="12" r="8.5" fill="none" stroke="${color}" stroke-width="2.2"/>` +
             `<path d="M8 12.4l2.6 2.6L16 9" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (cat === 'active') {
      body = `<circle cx="12" cy="12" r="8.5" fill="none" stroke="${color}" stroke-width="2.2"/>` +
             `<path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="${color}" stroke="none"/>`;
    } else {
      body = `<circle cx="12" cy="12" r="8.5" fill="none" stroke="${color}" stroke-width="2.2" stroke-dasharray="2.6 2.8"/>`;
    }
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${body}</svg>`,
    );
  }
}
