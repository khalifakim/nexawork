import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ProjectsService } from '@core/services/projects.service';
import { Project } from '@core/models/project.models';

@Component({
  selector: 'app-espace-projets',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <div class="t">Espace Projets</div>
        <div class="s">Espaces documentaires dédiés à chacun de vos projets.</div>
      </div>
      <div class="grid">
        @for (p of projects(); track p.id) {
          <button class="card" (click)="open(p.id)">
            <span class="ic" [style.background]="p.color"><app-icon name="folder" [size]="18" /></span>
            <div class="b"><div class="n">{{ p.name }}</div><div class="m">{{ p.docs }} fichiers · {{ p.folders }} dossiers</div></div>
            <app-icon class="ar" name="chevronRight" [size]="16" />
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .wrap { flex: 1; display: flex; flex-direction: column; min-height: 0; }
    .head { flex: none; padding: 22px 28px 6px; }
    .t { font-size: 18px; font-weight: 700; letter-spacing: -.015em; }
    .s { font-size: 13px; color: var(--nx-text-500); margin-top: 3px; }
    .grid { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 28px; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 14px; align-content: start; }
    .card { background: #fff; border: 1px solid var(--nx-border); border-radius: 12px; padding: 16px 18px; cursor: pointer; display: flex; align-items: center; gap: 14px; box-shadow: var(--nx-shadow-rest); font-family: inherit; text-align: left; }
    .card:hover { box-shadow: var(--nx-shadow-hover); }
    .ic { width: 40px; height: 40px; border-radius: 10px; color: #fff; display: flex; align-items: center; justify-content: center; flex: none; }
    .b { flex: 1; min-width: 0; }
    .n { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .m { font-size: 12px; color: var(--nx-text-400); margin-top: 3px; }
    .ar { color: var(--nx-text-300); flex: none; }
  `],
})
export class EspaceProjetsComponent {
  private router = inject(Router);
  private projectsSvc = inject(ProjectsService);
  projects = toSignal(this.projectsSvc.list(), { initialValue: [] as Project[] });
  open(id: string): void { this.router.navigate(['/app/documents/projets', id]); }
}
