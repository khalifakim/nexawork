import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-apercu-document',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <div class="head">
          <div class="bc"><app-icon name="folder" [size]="15" /><span>Documents</span><span class="s">/</span><span class="f">Refonte App Mobile</span></div>
          <span class="spacer"></span>
          <button class="dl" (click)="download()"><app-icon name="download" [size]="15" />Télécharger</button>
          <button class="x" (click)="closed.emit()"><app-icon name="x" [size]="16" /></button>
        </div>
        <div class="title"><span class="ic" [style.background]="previewable ? '#F5564E' : '#86828E'">{{ extLabel }}</span><span class="t">{{ name }}</span></div>
        @if (previewable) {
          <div class="pv"><app-icon name="image" [size]="34" /><span class="nx-mono">aperçu du document</span></div>
        } @else {
          <div class="np">
            <div class="np__t">Format non pris en charge pour l'aperçu</div>
            <div class="np__s">Ce type de fichier ne peut pas être prévisualisé directement.</div>
            <button class="np__b"><app-icon name="arrowRight" [size]="15" />Ouvrir dans la GED</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .ov { position: fixed; inset: 0; z-index: var(--nx-z-modal); background: rgba(22,19,31,.5); backdrop-filter: blur(2px); display: flex; justify-content: center; padding-top: 70px; }
    .panel { width: 620px; max-width: 94vw; max-height: 80vh; background: #fff; border-radius: 16px; box-shadow: var(--nx-shadow-modal); display: flex; flex-direction: column; overflow: hidden; animation: nxFade .18s ease; }
    .head { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--nx-border-card); }
    .bc { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--nx-text-500); }
    .bc app-icon { color: var(--nx-text-300); }
    .bc .s { color: #cfcbc2; }
    .bc .f { color: var(--nx-text); font-weight: 700; }
    .spacer { flex: 1; }
    .dl { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 13px; border: 1px solid var(--nx-border); border-radius: 8px; background: #fff; color: var(--nx-text-700); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .dl app-icon { color: var(--nx-text-500); display: flex; }
    .dl:hover { background: var(--nx-surface-2); }
    .x { width: 30px; height: 30px; border: none; border-radius: 8px; background: transparent; color: var(--nx-text-400); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .x:hover { background: var(--nx-surface-2); }
    .title { display: flex; align-items: center; gap: 12px; padding: 16px 20px 14px; }
    .ic { width: 40px; height: 40px; flex: none; border-radius: 10px; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
    .t { font-size: 15px; font-weight: 700; }
    .pv { flex: 1; min-height: 280px; margin: 0 20px 20px; border-radius: 12px; border: 1px solid var(--nx-border-card); background: repeating-linear-gradient(45deg,#FAF9F6,#FAF9F6 12px,#F4F2ED 12px,#F4F2ED 24px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--nx-text-300); }
    .np { margin: 0 20px 20px; padding: 28px; border-radius: 12px; background: var(--nx-surface-3); border: 1px solid var(--nx-border-card); text-align: center; color: var(--nx-text-500); }
    .np__t { font-size: 14px; font-weight: 600; color: var(--nx-text-700); margin-bottom: 6px; }
    .np__s { font-size: 13px; margin-bottom: 14px; }
    .np__b { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border: 1px solid var(--nx-indigo); border-radius: 9px; background: rgba(91,95,233,.06); color: var(--nx-indigo); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  `],
})
export class ApercuDocumentComponent {
  @Input({ required: true }) name!: string;
  @Output() closed = new EventEmitter<void>();

  private toast = inject(ToastService);

  get ext(): string { return (this.name.split('.').pop() ?? 'doc').toLowerCase(); }
  get extLabel(): string { return (this.ext || 'doc').toUpperCase().slice(0, 4); }
  get previewable(): boolean { return ['pdf', 'png', 'jpg', 'jpeg', 'gif'].includes(this.ext); }

  download(): void { this.toast.show({ message: 'Téléchargement de « ' + this.name + ' »…' }); }
}
