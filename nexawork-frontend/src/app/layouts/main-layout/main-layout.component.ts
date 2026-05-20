import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { AsyncPipe } from '@angular/common';
import { selectUser } from '@store/auth/auth.selectors';
import { AuthActions } from '@store/auth/auth.actions';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe],
  template: `
    <div class="d-flex min-vh-100">
      <!-- Sidebar -->
      <nav class="d-flex flex-column p-3 bg-dark text-white" style="width:240px;min-width:240px">
        <div class="mb-4">
          <h5 class="fw-bold text-primary mb-0">NexaWork</h5>
          <small class="text-muted">{{ (user$ | async)?.displayName }}</small>
        </div>
        <ul class="nav nav-pills flex-column gap-1 flex-grow-1">
          <li class="nav-item">
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-link text-white">
              Tableau de bord
            </a>
          </li>
          <li class="nav-item">
            <a routerLink="/projects" routerLinkActive="active" class="nav-link text-white">
              Projets &amp; Kanban
            </a>
          </li>
          <li class="nav-item">
            <a routerLink="/ged" routerLinkActive="active" class="nav-link text-white">
              GED
            </a>
          </li>
          <li class="nav-item">
            <a routerLink="/messaging" routerLinkActive="active" class="nav-link text-white">
              Messagerie
            </a>
          </li>
          <li class="nav-item">
            <a routerLink="/meetings" routerLinkActive="active" class="nav-link text-white">
              Réunions
            </a>
          </li>
          <li class="nav-item">
            <a routerLink="/notifications" routerLinkActive="active" class="nav-link text-white">
              Notifications
            </a>
          </li>
        </ul>
        <div class="mt-auto pt-3 border-top border-secondary">
          <a routerLink="/profile" class="nav-link text-white mb-2">Profil</a>
          <button class="btn btn-sm btn-outline-danger w-100" (click)="logout()">
            Déconnexion
          </button>
        </div>
      </nav>
      <!-- Main content -->
      <main class="flex-grow-1 p-4 overflow-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export class MainLayoutComponent {
  private readonly store = inject(Store);
  readonly user$ = this.store.select(selectUser);

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
