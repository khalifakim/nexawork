import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { GedViewComponent } from '@features/documents/ged-view/ged-view.component';
import { ProjectsService } from '@core/services/projects.service';
import { Project } from '@core/models/project.models';

@Component({
  selector: 'app-documents-projet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, GedViewComponent],
  template: `
    <div class="space">
      <div class="head">
        <button class="back" (click)="back()"><app-icon name="chevronLeft" [size]="18" [stroke]="2.2" /></button>
        <span class="ic" [style.background]="color()"><app-icon name="folder" [size]="14" /></span>
        <div><div class="t">{{ name() }}</div><div class="s">Espace documentaire du projet — {{ name() }}.</div></div>
      </div>
      <app-ged-view [project]="name()" />
    </div>
  `,
  styles: [`
    .space { flex: 1; display: flex; flex-direction: column; min-height: 0; }
    .head { flex: none; min-height: 52px; padding: 22px 28px 6px; display: flex; align-items: center; gap: 12px; }
    .back { width: 34px; height: 34px; border: 1px solid var(--nx-border); border-radius: 9px; background: #fff; color: var(--nx-text-700); cursor: pointer; display: flex; align-items: center; justify-content: center; flex: none; }
    .back:hover { background: var(--nx-surface-2); }
    .ic { width: 28px; height: 28px; border-radius: 8px; color: #fff; display: flex; align-items: center; justify-content: center; flex: none; }
    .t { font-size: 18px; font-weight: 700; letter-spacing: -.015em; }
    .s { font-size: 13px; color: var(--nx-text-500); margin-top: 3px; }
  `],
})
export class DocumentsProjetComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectsSvc = inject(ProjectsService);
  private allProjects = toSignal(this.projectsSvc.list(), { initialValue: [] as Project[] });
  private id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? 'refonte-app-mobile')), { initialValue: 'refonte-app-mobile' });
  private current = computed(() => this.allProjects().find(p => p.id === this.id()));
  name = computed(() => this.current()?.name ?? 'Refonte App Mobile');
  color = computed(() => this.current()?.color ?? '#6C70F0');
  back(): void { this.router.navigate(['/app/documents/projets']); }
}
