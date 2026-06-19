import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrganisationService } from '@core/services/organisation.service';
import { Store } from '@ngrx/store';
import { AuthActions } from '@store/auth/auth.actions';

@Component({
  selector: 'app-workspace-setup',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div class="card shadow" style="max-width:440px;width:100%">
        <div class="card-body p-4">
          <h4 class="card-title mb-1 text-center fw-bold text-primary">NexaWork</h4>
          <p class="text-muted text-center mb-4">Créez votre espace de travail pour commencer</p>

          @if (error()) {
            <div class="alert alert-danger py-2">{{ error() }}</div>
          }

          <form (ngSubmit)="createWorkspace()" #form="ngForm">
            <div class="mb-3">
              <label class="form-label fw-semibold">Nom de l'organisation</label>
              <input [(ngModel)]="orgName" name="orgName" required
                class="form-control" placeholder="Ex : Acme Corp, Mon Équipe..." />
            </div>
            <button type="submit" class="btn btn-primary w-100"
              [disabled]="loading() || !orgName.trim()">
              @if (loading()) {
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
              }
              Créer l'espace de travail
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class WorkspaceSetupComponent {
  private readonly orgService = inject(OrganisationService);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  orgName = '';
  loading = signal(false);
  error = signal('');

  createWorkspace(): void {
    if (!this.orgName.trim()) return;
    this.loading.set(true);
    this.error.set('');

    this.orgService.createOrganisation(this.orgName.trim()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Impossible de créer l\'espace de travail. Réessayez.');
      },
    });
  }
}
