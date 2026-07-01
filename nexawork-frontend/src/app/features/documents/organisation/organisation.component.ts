import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { GedViewComponent } from '@features/documents/ged-view/ged-view.component';

@Component({
  selector: 'app-documents-organisation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, GedViewComponent],
  template: `
    <div class="space">
      <div class="head">
        <span class="ic"><app-icon name="building" [size]="14" /></span>
        <div><div class="t">Espace Organisation</div><div class="s">Documents et dossiers partagés à l'échelle de l'organisation.</div></div>
      </div>
      <app-ged-view [project]="null" />
    </div>
  `,
  styles: [`
    .space { flex: 1; display: flex; flex-direction: column; min-height: 0; }
    .head { flex: none; min-height: 52px; padding: 22px 28px 6px; display: flex; align-items: center; gap: 12px; }
    .ic { width: 28px; height: 28px; border-radius: 8px; background: #3d3aa8; color: #fff; display: flex; align-items: center; justify-content: center; flex: none; }
    .t { font-size: 18px; font-weight: 700; letter-spacing: -.015em; }
    .s { font-size: 13px; color: var(--nx-text-500); margin-top: 3px; }
  `],
})
export class DocumentsOrganisationComponent {}
