import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectUser } from '@store/auth/auth.selectors';
import { AuthActions } from '@store/auth/auth.actions';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <h4 class="mb-4">Mon profil</h4>
    @if (user$ | async; as user) {
      <div class="card" style="max-width:400px">
        <div class="card-body">
          <div class="mb-3 text-center">
            @if (user.avatarUrl) {
              <img [src]="user.avatarUrl" class="rounded-circle mb-2" width="80" height="80" alt="avatar" />
            } @else {
              <div class="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-2"
                style="width:80px;height:80px;font-size:2rem">
                {{ user.displayName[0] }}
              </div>
            }
            <h5 class="mb-0">{{ user.displayName }}</h5>
            <p class="text-muted">{{ user.email }}</p>
          </div>
          <hr />
          <p><strong>Organisation ID :</strong> {{ user.organisationId ?? '—' }}</p>
          <p><strong>Rôle :</strong> <span class="badge bg-secondary">{{ user.orgRole ?? '—' }}</span></p>
          <button class="btn btn-danger btn-sm w-100 mt-3" (click)="logout()">
            Se déconnecter
          </button>
        </div>
      </div>
    }
  `,
})
export class ProfileComponent {
  private readonly store = inject(Store);
  readonly user$ = this.store.select(selectUser);

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
