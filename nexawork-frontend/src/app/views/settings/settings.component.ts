import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { combineLatest, map, take } from 'rxjs';
import { selectUser } from '@store/auth/auth.selectors';

type SettingsTab = 'general' | 'members' | 'profile' | 'workspaces';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [AsyncPipe, NgIf, NgClass, ReactiveFormsModule, RouterLink],
  template: `
    <div class="d-flex" style="height:100%;min-height:calc(100vh - 56px - 2rem)">

      <!-- ═══ Sidebar paramètres ═══ -->
      <aside class="border-end bg-light flex-shrink-0" style="width:220px">
        <div class="px-3 py-3 border-bottom">
          <h6 class="text-muted fw-semibold mb-0 text-uppercase" style="font-size:.68rem;letter-spacing:.06em">Paramètres</h6>
        </div>

        <!-- Groupe Administrateur (admin uniquement) -->
        <ng-container *ngIf="isAdmin$ | async">
          <div class="px-3 pt-3 pb-1">
            <small class="text-muted fw-semibold text-uppercase" style="font-size:.65rem;letter-spacing:.06em">Administrateur</small>
          </div>
          <ul class="nav flex-column px-2 mb-1">
            <li class="nav-item">
              <button class="nav-link w-100 text-start rounded px-2 py-2 border-0 bg-transparent"
                      [ngClass]="activeTab === 'general' ? 'active bg-primary text-white' : 'text-dark'"
                      (click)="setTab('general')">
                Général
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link w-100 text-start rounded px-2 py-2 border-0 bg-transparent"
                      [ngClass]="activeTab === 'members' ? 'active bg-primary text-white' : 'text-dark'"
                      (click)="setTab('members')">
                Personnes
              </button>
            </li>
          </ul>
          <hr class="mx-3 my-2">
        </ng-container>

        <!-- Groupe Mes paramètres -->
        <div class="px-3 pt-2 pb-1">
          <small class="text-muted fw-semibold text-uppercase" style="font-size:.65rem;letter-spacing:.06em">Mes paramètres</small>
        </div>
        <ul class="nav flex-column px-2">
          <li class="nav-item">
            <button class="nav-link w-100 text-start rounded px-2 py-2 border-0 bg-transparent"
                    [ngClass]="activeTab === 'profile' ? 'active bg-primary text-white' : 'text-dark'"
                    (click)="setTab('profile')">
              Profil
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link w-100 text-start rounded px-2 py-2 border-0 bg-transparent"
                    [ngClass]="activeTab === 'workspaces' ? 'active bg-primary text-white' : 'text-dark'"
                    (click)="setTab('workspaces')">
              Environnement de travail
            </button>
          </li>
        </ul>
      </aside>

      <!-- ═══ Contenu onglet ═══ -->
      <div class="flex-grow-1 overflow-auto p-4" style="max-width:700px">

        <!-- ── Général (admin) ── -->
        <ng-container *ngIf="activeTab === 'general' && (isAdmin$ | async)">
          <h4 class="fw-bold mb-1">Général</h4>
          <p class="text-muted small mb-4">Informations et configuration du workspace.</p>

          <div class="card border-0 shadow-sm mb-4">
            <div class="card-body">
              <h6 class="fw-semibold mb-3">Nom du workspace</h6>
              <form [formGroup]="renameForm" (ngSubmit)="renameWorkspace()" class="d-flex gap-2 align-items-start">
                <input type="text" class="form-control" formControlName="name"
                       placeholder="Nom du workspace" style="max-width:320px">
                <button type="submit" class="btn btn-primary"
                        [disabled]="renameForm.invalid || renameForm.pristine">
                  Enregistrer
                </button>
              </form>
            </div>
          </div>

          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <h6 class="fw-semibold text-danger mb-2">Zone de danger</h6>
              <p class="text-muted small mb-3">
                La suppression du workspace est irréversible. Tous les projets, fichiers,
                tâches et données associés seront définitivement supprimés.
                Les comptes des membres ne sont pas supprimés.
              </p>
              <button class="btn btn-outline-danger btn-sm" (click)="confirmDeleteWorkspace()">
                Supprimer ce workspace
              </button>
            </div>
          </div>
        </ng-container>

        <!-- ── Personnes (admin) ── -->
        <ng-container *ngIf="activeTab === 'members' && (isAdmin$ | async)">
          <div class="d-flex align-items-center justify-content-between mb-1">
            <h4 class="fw-bold mb-0">Personnes</h4>
            <button class="btn btn-primary btn-sm">+ Inviter des membres</button>
          </div>
          <p class="text-muted small mb-4">Gérez les membres de votre workspace.</p>

          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="mb-3">
                <input type="text" class="form-control form-control-sm" placeholder="Rechercher un membre...">
              </div>
              <div class="text-center text-muted py-4 small">
                <div class="mb-2" style="font-size:2rem">&#128101;</div>
                Liste des membres à charger depuis l'API
              </div>
            </div>
          </div>
        </ng-container>

        <!-- ── Profil ── -->
        <ng-container *ngIf="activeTab === 'profile'">
          <h4 class="fw-bold mb-1">Profil</h4>
          <p class="text-muted small mb-4">Modifiez vos informations personnelles.</p>

          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <!-- Avatar + nom -->
              <div class="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                <span class="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                      style="width:56px;height:56px;font-size:1.2rem">
                  {{ (user$ | async)?.displayName?.charAt(0)?.toUpperCase() || '?' }}
                </span>
                <div>
                  <div class="fw-bold fs-6">{{ (user$ | async)?.displayName }}</div>
                  <small class="text-muted">{{ (user$ | async)?.email }}</small>
                  <br>
                  <small class="text-muted">
                    {{ (user$ | async)?.organisationName || 'Workspace actuel' }} ·
                    <span [class]="(isAdmin$ | async) ? 'text-danger fw-semibold' : 'text-secondary'">
                      {{ (isAdmin$ | async) ? 'Administrateur' : 'Membre' }}
                    </span>
                  </small>
                </div>
              </div>

              <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
                <div class="mb-3">
                  <label class="form-label fw-semibold">Nom complet</label>
                  <input type="text" class="form-control" formControlName="displayName">
                </div>
                <div class="mb-3">
                  <label class="form-label fw-semibold">Email</label>
                  <input type="email" class="form-control bg-light" formControlName="email" readonly>
                  <div class="form-text">L'email est lié à votre identité et ne peut pas être modifié.</div>
                </div>
                <hr class="my-3">
                <h6 class="fw-semibold mb-3">Changer le mot de passe</h6>
                <div class="mb-3">
                  <label class="form-label">Nouveau mot de passe</label>
                  <input type="password" class="form-control" formControlName="newPassword"
                         placeholder="Laisser vide pour ne pas modifier" autocomplete="new-password">
                </div>
                <button type="submit" class="btn btn-primary"
                        [disabled]="profileForm.invalid || profileForm.pristine">
                  Enregistrer les modifications
                </button>
              </form>
            </div>
          </div>
        </ng-container>

        <!-- ── Environnement de travail ── -->
        <ng-container *ngIf="activeTab === 'workspaces'">
          <h4 class="fw-bold mb-1">Environnement de travail</h4>
          <p class="text-muted small mb-4">Workspaces auxquels vous appartenez.</p>

          <div class="card border-0 shadow-sm">
            <ul class="list-group list-group-flush">
              <li class="list-group-item d-flex align-items-center justify-content-between py-3">
                <div>
                  <div class="fw-semibold">{{ (user$ | async)?.organisationName || 'Workspace actuel' }}</div>
                  <small class="text-muted">
                    <ng-container *ngIf="isAdmin$ | async; else memberRole">
                      Administrateur · Propriétaire
                    </ng-container>
                    <ng-template #memberRole>Membre</ng-template>
                  </small>
                </div>
                <div class="d-flex gap-2">
                  <a *ngIf="isAdmin$ | async"
                     routerLink="/settings" [queryParams]="{tab:'general'}"
                     class="btn btn-sm btn-outline-secondary">
                    Paramètres
                  </a>
                  <button *ngIf="!(isAdmin$ | async)" class="btn btn-sm btn-outline-danger">
                    Quitter
                  </button>
                </div>
              </li>
            </ul>
            <div class="card-footer bg-transparent text-center py-3">
              <a routerLink="/workspace/setup" class="text-primary text-decoration-none small">
                + Créer un nouveau workspace
              </a>
            </div>
          </div>
        </ng-container>

      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; height: 100%; }
    .nav-link:hover:not(.active) { background: rgba(0,0,0,.06) !important; }
  `],
})
export class SettingsComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly user$ = this.store.select(selectUser);
  readonly isAdmin$ = this.store.select(selectUser).pipe(map(u => u?.orgRole === 'ADMIN'));

  activeTab: SettingsTab = 'profile';

  readonly renameForm = this.fb.group({
    name: ['', Validators.required],
  });

  readonly profileForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: [{ value: '', disabled: true }],
    newPassword: [''],
  });

  ngOnInit(): void {
    combineLatest([this.route.queryParams, this.user$]).pipe(take(1)).subscribe(([params, user]) => {
      const requested = params['tab'] as SettingsTab;
      const isAdmin = user?.orgRole === 'ADMIN';

      if (requested === 'general' || requested === 'members') {
        this.activeTab = isAdmin ? requested : 'profile';
      } else if (requested === 'workspaces') {
        this.activeTab = 'workspaces';
      } else {
        this.activeTab = requested ?? 'profile';
      }

      if (user) {
        this.profileForm.patchValue({ displayName: user.displayName, email: user.email });
        this.renameForm.patchValue({ name: user.organisationName ?? '' });
      }
    });
  }

  setTab(tab: SettingsTab): void {
    this.activeTab = tab;
  }

  renameWorkspace(): void {
    // TODO: dispatcher l'action de renommage du workspace
  }

  saveProfile(): void {
    // TODO: dispatcher l'action de mise à jour du profil
  }

  confirmDeleteWorkspace(): void {
    // TODO: ouvrir le ConfirmDialogComponent puis dispatcher la suppression
  }
}
