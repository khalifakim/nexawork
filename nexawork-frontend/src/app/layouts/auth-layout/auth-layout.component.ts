import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div class="col-12 col-md-5 col-lg-4">
        <div class="text-center mb-4">
          <h2 class="fw-bold text-primary">NexaWork</h2>
          <p class="text-muted">Plateforme collaborative unifiée</p>
        </div>
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <router-outlet />
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {}
