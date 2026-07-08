import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '@environment/environment';

/** Profil éditable de l'utilisateur connecté (Paramètres ▸ Profil). */
export interface UserProfile {
  firstName: string;
  lastName: string;
  /** Fonction / rôle métier (jobTitle côté backend). */
  role: string;
  /** Data URL de la photo (affichage). La persistance passe par le File Service (avatar). */
  photoDataUrl: string | null;
}

const INITIAL: UserProfile = {
  firstName: '', lastName: '', role: '', photoDataUrl: null,
};

/**
 * Profil de l'utilisateur connecté. Chargé depuis `GET /users/me` et sauvegardé
 * via `PATCH /users/me/profile`. L'avatar du header consomme ce signal → toute
 * mise à jour se propage instantanément.
 */
@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly auth = inject(AuthService);

  private readonly _profile = signal<UserProfile>({ ...INITIAL });
  readonly profile = this._profile.asReadonly();

  readonly displayName = computed(() => `${this._profile().firstName} ${this._profile().lastName}`.trim());

  /** Charge le profil réel (appelé à l'entrée de l'app). */
  load(): void {
    this.auth.me().subscribe(u => this._profile.set({
      firstName: u.firstName, lastName: u.lastName, role: u.jobTitle ?? '',
      photoDataUrl: u.photoUrl ?? null,
    }));
  }

  /**
   * Sauvegarde le profil. Prénom/nom/fonction persistés en backend ; la photo
   * (data URL) est affichée localement — sa persistance MinIO passera par le
   * File Service (avatar). Met à jour le signal de manière optimiste.
   */
  update(patch: Partial<UserProfile>): void {
    this._profile.update(p => ({ ...p, ...patch }));
    if (environment.mock.auth) return;

    const isHostedUrl = (v: string | null | undefined) => !!v && !v.startsWith('data:');
    const cur = this._profile();
    this.auth.updateProfile({
      firstName: cur.firstName,
      lastName: cur.lastName,
      jobTitle: cur.role,
      // N'envoie la photo que si c'est une vraie URL hébergée (pas un data:).
      ...(isHostedUrl(cur.photoDataUrl) ? { photoUrl: cur.photoDataUrl! } : {}),
    }).subscribe();
  }

  clearPhoto(): void { this._profile.update(p => ({ ...p, photoDataUrl: null })); }
}
