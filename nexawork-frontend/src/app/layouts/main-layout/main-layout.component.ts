import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationStart } from '@angular/router';
import { Store } from '@ngrx/store';
import { AsyncPipe, NgIf } from '@angular/common';
import { map, filter } from 'rxjs';
import { selectUser } from '@store/auth/auth.selectors';
import { AuthActions } from '@store/auth/auth.actions';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, NgIf],
  template: `
    <div class="d-flex flex-column min-vh-100">

      <!-- ═══ HEADER ═══ -->
      <header class="d-flex align-items-center justify-content-between px-4 bg-dark text-white border-bottom border-secondary flex-shrink-0"
              style="height:56px;z-index:100;position:sticky;top:0">

        <!-- Workspace dropdown (gauche) -->
        <div class="position-relative" (click)="$event.stopPropagation()">
          <button class="btn btn-dark btn-sm d-flex align-items-center gap-2 text-white fw-semibold border-0 px-2"
                  (click)="toggleWorkspaceMenu()">
            <span class="text-primary">&#9632;</span>
            {{ (user$ | async)?.organisationName || 'Mon Workspace' }}
            <span class="text-muted small">&#9660;</span>
          </button>
          <div *ngIf="workspaceMenuOpen"
               class="position-absolute bg-white text-dark rounded shadow-lg border"
               style="top:calc(100% + 6px);left:0;min-width:250px;z-index:200">
            <div class="px-3 py-3 border-bottom">
              <div class="fw-bold">{{ (user$ | async)?.organisationName || 'Mon Workspace' }}</div>
              <small class="text-muted">Workspace actuel</small>
            </div>
            <a *ngIf="isAdmin$ | async"
               routerLink="/settings" [queryParams]="{tab:'general'}"
               class="dropdown-item py-2 px-3">
              &#9881; Paramètres
            </a>
            <a routerLink="/settings" [queryParams]="{tab:'members'}"
               class="dropdown-item py-2 px-3">
              &#128101; Personnes
            </a>
            <hr class="my-1">
            <a routerLink="/workspace/setup"
               class="dropdown-item py-2 px-3 text-primary">
              + Créer un workspace
            </a>
          </div>
        </div>

        <!-- Header droite : notifications + avatar -->
        <div class="d-flex align-items-center gap-3">

          <!-- Cloche notifications -->
          <a routerLink="/notifications"
             class="btn btn-dark btn-sm text-white border-0 position-relative fs-5 px-2"
             title="Notifications">
            &#128276;
          </a>

          <!-- Avatar dropdown -->
          <div class="position-relative" (click)="$event.stopPropagation()">
            <button class="btn btn-dark btn-sm d-flex align-items-center gap-2 text-white border-0 px-2"
                    (click)="toggleUserMenu()">
              <span class="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center text-white fw-bold"
                    style="width:32px;height:32px;font-size:0.75rem;flex-shrink:0">
                {{ (user$ | async)?.displayName?.charAt(0)?.toUpperCase() || '?' }}
              </span>
              <span class="text-muted small">&#9660;</span>
            </button>
            <div *ngIf="userMenuOpen"
                 class="position-absolute bg-white text-dark rounded shadow-lg border"
                 style="top:calc(100% + 6px);right:0;min-width:190px;z-index:200">
              <div class="px-3 py-3 border-bottom">
                <div class="fw-bold">{{ (user$ | async)?.displayName }}</div>
                <small class="text-success">&#9679; En ligne</small>
              </div>
              <a routerLink="/settings" [queryParams]="{tab:'profile'}"
                 class="dropdown-item py-2 px-3">
                &#9881; Paramètres
              </a>
              <button class="dropdown-item py-2 px-3 text-danger w-100 text-start border-0 bg-transparent"
                      (click)="logout()">
                &#x2192; Se déconnecter
              </button>
            </div>
          </div>

        </div>
      </header>

      <!-- ═══ CORPS : sidebar 1 + contenu principal ═══ -->
      <div class="d-flex flex-grow-1 overflow-hidden">

        <!-- Sidebar 1 -->
        <nav class="d-flex flex-column py-3 bg-dark text-white border-end border-secondary flex-shrink-0"
             style="width:185px">
          <ul class="nav nav-pills flex-column gap-1 px-2 flex-grow-1">
            <li class="nav-item">
              <a routerLink="/dashboard" routerLinkActive="active"
                 class="nav-link text-white-50 d-flex align-items-center gap-2 px-3 py-2 rounded">
                &#127968; Accueil
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/projects" routerLinkActive="active"
                 class="nav-link text-white-50 d-flex align-items-center gap-2 px-3 py-2 rounded">
                &#128203; Projets
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/teams" routerLinkActive="active"
                 class="nav-link text-white-50 d-flex align-items-center gap-2 px-3 py-2 rounded">
                &#128101; Équipes
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/documents" routerLinkActive="active"
                 class="nav-link text-white-50 d-flex align-items-center gap-2 px-3 py-2 rounded">
                &#128193; Documents
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/channels" routerLinkActive="active"
                 class="nav-link text-white-50 d-flex align-items-center gap-2 px-3 py-2 rounded">
                <span class="fw-bold">#</span> Canaux
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/conversations" routerLinkActive="active"
                 class="nav-link text-white-50 d-flex align-items-center gap-2 px-3 py-2 rounded">
                &#128172; Conversations
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/meetings" routerLinkActive="active"
                 class="nav-link text-white-50 d-flex align-items-center gap-2 px-3 py-2 rounded">
                &#128249; Réunions
              </a>
            </li>
          </ul>

          <!-- Bouton Inviter (admin uniquement) -->
          <div *ngIf="isAdmin$ | async"
               class="px-2 pt-2 mt-auto border-top border-secondary">
            <a routerLink="/settings" [queryParams]="{tab:'members'}"
               class="btn btn-sm btn-outline-light w-100 d-flex align-items-center justify-content-center gap-1">
              &#128100;+ Inviter
            </a>
          </div>
        </nav>

        <!-- Contenu principal -->
        <main class="flex-grow-1 overflow-auto p-4">
          <router-outlet />
        </main>

      </div>
    </div>
  `,
  styles: [`
    .nav-link:hover { background: rgba(255,255,255,.08) !important; color: #fff !important; }
    .nav-link.active { background: var(--bs-primary) !important; color: #fff !important; }
    .dropdown-item:hover { background: #f8f9fa; }
  `],
})
export class MainLayoutComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  readonly user$ = this.store.select(selectUser);
  readonly isAdmin$ = this.store.select(selectUser).pipe(map(u => u?.orgRole === 'ADMIN'));

  workspaceMenuOpen = false;
  userMenuOpen = false;

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationStart),
    ).subscribe(() => this.closeMenus());
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.workspaceMenuOpen = false;
    this.userMenuOpen = false;
  }

  toggleWorkspaceMenu(): void {
    this.workspaceMenuOpen = !this.workspaceMenuOpen;
    if (this.workspaceMenuOpen) this.userMenuOpen = false;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
    if (this.userMenuOpen) this.workspaceMenuOpen = false;
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
