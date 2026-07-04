import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@core/services/toast.service';

interface Version { v: number; by: string; color: string; date: string; size: string; note: string; }

/**
 * « Historique des versions » — reusable GED version-history modal, faithful to
 * the prototype's `versionModalView`. Available for every file across the app.
 */
@Component({
  selector: 'app-ged-versions-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="card" (click)="$event.stopPropagation()">
        <div class="hd">
          <div class="hd__t"><div class="hd__title">Historique des versions</div><div class="hd__sub">{{ name }}</div></div>
          <button class="x" (click)="closed.emit()"><app-icon name="x" [size]="16" /></button>
        </div>

        <div class="bd">
          @for (ver of versions(); track ver.v; let i = $index) {
            <div class="row" [class.row--first]="i===0">
              <span class="vbadge" [class.vbadge--cur]="ver.v===current()">v{{ ver.v }}</span>
              <div class="rtx">
                <div class="rh">
                  <span class="rname">Version {{ ver.v }}</span>
                  @if (ver.v===current()) { <span class="cur">Actuelle</span> }
                  <span class="rsize">{{ ver.size }}</span>
                </div>
                <div class="rby">
                  <span class="rav" [style.background]="ver.color">{{ ini(ver.by) }}</span>
                  <span class="rbt">{{ ver.by }} · {{ ver.date }}</span>
                </div>
                @if (ver.note) { <div class="rnote">{{ ver.note }}</div> }
              </div>
              <div class="ract">
                <button class="dl" title="Télécharger cette version" (click)="download(ver.v)"><app-icon name="download" [size]="15" /></button>
                @if (ver.v!==current()) {
                  <button class="restore" (click)="restore(ver.v)"><app-icon name="restore" [size]="13" />Restaurer</button>
                }
              </div>
            </div>
          }
        </div>

        <div class="ft">
          <button class="ft__up" (click)="addVersion()"><app-icon name="upload" [size]="15" />Importer une nouvelle version</button>
          <button class="ft__close" (click)="closed.emit()">Fermer</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ov { position: fixed; inset: 0; z-index: 150; background: rgba(22,19,31,.5); backdrop-filter: blur(2px); display: flex; align-items: flex-start; justify-content: center; padding-top: 60px; }
    .card { width: 560px; max-width: 94vw; max-height: 85vh; background: #fff; border-radius: 16px; box-shadow: 0 24px 70px rgba(20,15,40,.4); display: flex; flex-direction: column; overflow: hidden; animation: nxFade .18s ease; }
    .hd { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 14px; border-bottom: 1px solid #F0EEE9; flex: none; }
    .hd__t { flex: 1; min-width: 0; }
    .hd__title { font-size: 16px; font-weight: 700; letter-spacing: -.01em; }
    .hd__sub { font-size: 12.5px; color: #86828e; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .x { width: 30px; height: 30px; flex: none; border: none; border-radius: 8px; background: transparent; color: #9b97a3; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .x:hover { background: #F4F2ED; }
    .bd { padding: 18px 20px; overflow-y: auto; }
    .row { display: flex; align-items: flex-start; gap: 13px; padding: 14px 4px; border-top: 1px solid #F0EEE9; }
    .row--first { border-top: none; }
    .vbadge { width: 38px; height: 38px; flex: none; border-radius: 10px; background: #EFEDE7; color: #7a7682; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; font-family: var(--nx-mono, 'JetBrains Mono', monospace); }
    .vbadge--cur { background: var(--nx-indigo); color: #fff; }
    .rtx { flex: 1; min-width: 0; }
    .rh { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .rname { font-size: 13.5px; font-weight: 700; color: #1d1b25; }
    .cur { font-size: 10.5px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--nx-indigo); background: rgba(91,95,233,.1); padding: 2px 8px; border-radius: 20px; }
    .rsize { font-size: 12px; color: #a8a4af; }
    .rby { display: flex; align-items: center; gap: 7px; margin-top: 6px; }
    .rav { width: 20px; height: 20px; flex: none; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 8.5px; font-weight: 700; }
    .rbt { font-size: 12.5px; color: #56525c; }
    .rnote { font-size: 12.5px; color: #86828e; margin-top: 5px; line-height: 1.4; }
    .ract { display: flex; align-items: center; gap: 6px; flex: none; }
    .dl { width: 32px; height: 32px; border: 1px solid #E2DFD8; border-radius: 8px; background: #fff; color: #56525c; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .dl:hover { background: #F4F2ED; }
    .restore { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 11px; border: 1px solid #E2DFD8; border-radius: 8px; background: #fff; color: #46434e; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
    .restore:hover { background: #F4F2ED; }
    .ft { display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-top: 1px solid #F0EEE9; flex: none; }
    .ft__up { display: flex; align-items: center; gap: 7px; height: 38px; padding: 0 15px; border: 1px solid var(--nx-indigo); border-radius: 9px; background: rgba(91,95,233,.06); color: var(--nx-indigo); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; margin-right: auto; }
    .ft__close { height: 38px; padding: 0 16px; border: 1px solid #D9D6CE; border-radius: 9px; background: #fff; color: #46434e; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  `],
})
export class GedVersionsModalComponent {
  @Input({ required: true }) name!: string;
  @Output() closed = new EventEmitter<void>();

  private toast = inject(ToastService);

  versions = signal<Version[]>([
    { v: 3, by: 'Sarah Diallo', color: '#F2693C', date: "Aujourd'hui, 14:23", size: '2,4 Mo', note: 'Ajustement des marges et libellés.' },
    { v: 2, by: 'Akim Koné',    color: '#F5A623', date: 'Hier, 09:10',        size: '2,2 Mo', note: 'Intégration des retours de revue.' },
    { v: 1, by: 'Yacine Sow',   color: '#E0497B', date: '12 mai 2026',        size: '2,0 Mo', note: 'Version initiale.' },
  ]);

  current = computed(() => this.versions().reduce((m, v) => Math.max(m, v.v), 0));

  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }

  download(v: number): void { this.toast.show({ message: 'Téléchargement de la version ' + v + '…' }); }
  restore(v: number): void { this.toast.show({ message: 'Version ' + v + ' restaurée comme version actuelle' }); this.closed.emit(); }
  addVersion(): void {
    const next = this.current() + 1;
    this.versions.update(l => [{ v: next, by: 'Akim Koné', color: '#F5A623', date: "À l'instant", size: '2,5 Mo', note: 'Nouvelle version importée.' }, ...l]);
    this.toast.show({ message: 'Version ' + next + ' importée' });
  }
}
