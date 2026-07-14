import { Injectable, computed, inject, signal } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { FilesHttpService } from '@core/http/files.http.service';
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
  private readonly session = inject(SessionService);
  private readonly files = inject(FilesHttpService);

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

    const cur = this._profile();
    const photo = cur.photoDataUrl;
    const isHostedUrl = !!photo && !photo.startsWith('data:');

    // `PATCH /users/me/profile` ignore les champs NULS (payload atomique) : envoyer
    // `null` ne retirerait donc rien. Pour EFFACER la photo, il faut une valeur
    // non nulle — la chaîne vide. Un `data:` n'est jamais envoyé : c'est un aperçu
    // local, `uploadPhoto()` se charge de la vraie persistance (File Service).
    const photoPatch =
      isHostedUrl ? { photoUrl: photo! }
      : photo == null ? { photoUrl: '' }   // retrait explicite
      : {};                                // data: en cours d'upload → on n'y touche pas

    this.auth.updateProfile({
      firstName: cur.firstName,
      lastName: cur.lastName,
      jobTitle: cur.role,
      ...photoPatch,
    }).subscribe();
  }

  clearPhoto(): void { this._profile.update(p => ({ ...p, photoDataUrl: null })); }

  /**
   * Persiste la photo de profil : le binaire est poussé au File Service
   * (contexte `avatar`), puis son URL de téléchargement stable est enregistrée
   * comme `photoUrl` de l'utilisateur (`PATCH /users/me/profile`).
   * En mock, l'aperçu local (data URL) suffit.
   */
  uploadPhoto(file: File, dataUrl: string): void {
    // Aperçu immédiat, quel que soit le mode.
    this._profile.update(p => ({ ...p, photoDataUrl: dataUrl }));
    if (environment.mock.auth) return;

    const userId = this.session.user()?.id;
    this.files.upload('avatar', file, { ...(userId ? { userId } : {}) }).pipe(
      switchMap(stored => {
        const cur = this._profile();
        return this.auth.updateProfile({
          firstName: cur.firstName,
          lastName: cur.lastName,
          jobTitle: cur.role,
          photoUrl: stored.downloadUrl,
        });
      }),
    ).subscribe({
      next: u => this._profile.update(p => ({ ...p, photoDataUrl: u.photoUrl ?? p.photoDataUrl })),
      error: () => of(null),
    });
  }
}
