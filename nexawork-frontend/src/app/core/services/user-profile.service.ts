import { Injectable, computed, signal } from '@angular/core';

/** Editable profile of the demo user — front-only mock. */
export interface UserProfile {
  firstName: string;
  lastName: string;
  role: string;
  /** Base64 data URL of the profile picture, or null if using initials. */
  photoDataUrl: string | null;
}

const INITIAL: UserProfile = {
  firstName: 'Akim',
  lastName: 'Koné',
  role: 'Lead Designer',
  photoDataUrl: null,
};

/**
 * Editable profile of the currently signed-in user. Kept independent from the
 * auth store because the demo tweaks profile locally (photo upload, save)
 * without touching authentication.
 */
@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly _profile = signal<UserProfile>({ ...INITIAL });
  readonly profile = this._profile.asReadonly();

  /** Full display name derived from first + last. */
  readonly displayName = computed(() => `${this._profile().firstName} ${this._profile().lastName}`.trim());

  update(patch: Partial<UserProfile>): void {
    this._profile.update(p => ({ ...p, ...patch }));
  }

  clearPhoto(): void { this._profile.update(p => ({ ...p, photoDataUrl: null })); }
}
