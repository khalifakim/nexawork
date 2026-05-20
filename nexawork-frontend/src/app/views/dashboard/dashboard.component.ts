import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectUser } from '@store/auth/auth.selectors';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe, RouterLink],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">Tableau de bord</h4>
      <span class="text-muted">Bonjour, {{ (user$ | async)?.displayName }}</span>
    </div>
    <div class="row g-4">
      <div class="col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h6 class="card-title">Projets</h6>
            <p class="card-text text-muted">Gérez vos projets et tâches Kanban</p>
            <a routerLink="/projects" class="btn btn-sm btn-outline-primary">Voir les projets</a>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h6 class="card-title">Messagerie</h6>
            <p class="card-text text-muted">Canaux et discussions d'équipe</p>
            <a routerLink="/messaging" class="btn btn-sm btn-outline-primary">Ouvrir</a>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h6 class="card-title">Réunions</h6>
            <p class="card-text text-muted">Planifiez et rejoignez des appels Jitsi</p>
            <a routerLink="/meetings" class="btn btn-sm btn-outline-primary">Voir les appels</a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  readonly user$ = inject(Store).select(selectUser);
}
