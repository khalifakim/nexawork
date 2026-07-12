import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ProjectsService } from '@core/services/projects.service';
import { SessionService } from '@core/services/session.service';
import { ShellBus } from '@layouts/app-shell/shell.bus';

/**
 * Page d'entrée de la section Projets (`/app/projets`). Charge les projets réels
 * du workspace : s'il en existe au moins un, ouvre le premier sur son board
 * Kanban ; sinon, affiche un état vide invitant à créer le premier projet.
 *
 * Remplace l'ancienne redirection statique vers un slug mocké
 * (`projets/refonte-app-mobile/kanban`).
 */
@Component({
  selector: 'app-projets-index',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @switch (state()) {
      @case ('empty') {
        <div class="wrap">
          <div class="card">
            <span class="ic"><app-icon name="projects" [size]="30" /></span>
            <h1>Aucun projet pour le moment</h1>
            @if (isAdmin()) {
              <p>Créez votre premier projet pour organiser vos tâches, votre équipe et vos échéances.</p>
              <button class="cta" (click)="createProject()"><app-icon name="plus" [size]="17" [stroke]="2.2" />Créer votre premier projet</button>
            } @else {
              <p>Aucun projet ne vous a encore été partagé dans cet espace de travail. Contactez un administrateur pour en créer un.</p>
            }
          </div>
        </div>
      }
      @default {
        <div class="wrap"><div class="loading"><span class="spin"></span></div></div>
      }
    }
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .wrap { height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 420px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .ic { width: 68px; height: 68px; border-radius: 20px; background: rgba(91,95,233,0.10); color: var(--nx-indigo);
      display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
    h1 { font-size: 19px; font-weight: 700; letter-spacing: -.01em; color: var(--nx-text); margin: 0; }
    p { font-size: 13.5px; line-height: 1.55; color: var(--nx-text-500); margin: 2px 0 14px; }
    .cta { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border: none; border-radius: 9px;
      background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; box-shadow: var(--nx-shadow-primary); }
    .cta:hover { filter: brightness(1.04); }
    .loading { display: flex; align-items: center; justify-content: center; }
    .spin { width: 26px; height: 26px; border-radius: 50%; border: 3px solid var(--nx-border); border-top-color: var(--nx-indigo); animation: sp .7s linear infinite; }
    @keyframes sp { to { transform: rotate(360deg); } }
  `],
})
export class ProjetsIndexComponent {
  private router = inject(Router);
  private projectsSvc = inject(ProjectsService);
  private session = inject(SessionService);
  private bus = inject(ShellBus);

  /** 'loading' tant que la liste n'a pas répondu, 'empty' si aucun projet actif. */
  state = signal<'loading' | 'empty'>('loading');
  isAdmin = this.session.isAdmin;

  constructor() {
    this.projectsSvc.list().pipe(takeUntilDestroyed()).subscribe({
      next: projects => {
        const first = projects[0];
        if (first) {
          this.router.navigate(['/app/projets', first.id, 'kanban'], { replaceUrl: true });
        } else {
          this.state.set('empty');
        }
      },
      error: () => this.state.set('empty'),
    });
  }

  createProject(): void {
    this.bus.openCreateProject();
  }
}
