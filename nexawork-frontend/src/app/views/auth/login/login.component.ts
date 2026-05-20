import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AsyncPipe } from '@angular/common';
import { AuthActions } from '@store/auth/auth.actions';
import { selectAuthLoading, selectAuthError } from '@store/auth/auth.selectors';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AsyncPipe],
  template: `
    <h5 class="card-title mb-4">Connexion</h5>
    @if (error$ | async; as error) {
      <div class="alert alert-danger">{{ error }}</div>
    }
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="mb-3">
        <label class="form-label">Email</label>
        <input type="email" formControlName="email" class="form-control" />
      </div>
      <div class="mb-3">
        <label class="form-label">Mot de passe</label>
        <input type="password" formControlName="password" class="form-control" />
      </div>
      <button type="submit" class="btn btn-primary w-100" [disabled]="loading$ | async">
        {{ (loading$ | async) ? 'Connexion...' : 'Se connecter' }}
      </button>
    </form>
    <p class="text-center mt-3 mb-0">
      Pas encore de compte ? <a routerLink="/auth/register">S'inscrire</a>
    </p>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  readonly loading$ = this.store.select(selectAuthLoading);
  readonly error$   = this.store.select(selectAuthError);

  readonly form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.form.valid) {
      this.store.dispatch(AuthActions.login({ request: this.form.value as any }));
    }
  }
}
