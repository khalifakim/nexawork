import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { UserProfileService } from '@core/services/user-profile.service';
import { ToastService } from '@core/services/toast.service';

/** « Profil » — editable name/role + working photo picker. */
@Component({
  selector: 'app-param-profil',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent],
  template: `
    <div class="set-page"><div class="set-inner">
      <h1 class="set-h1">Profil</h1>
      <p class="set-desc">Vos informations personnelles.</p>
      <div class="set-card">
        <div class="set-row set-row--first set-row--top">
          <div class="set-rlabel"><b>Photo de profil</b></div>
          <div class="set-rctrl" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            <app-avatar [name]="displayName()" color="#F5A623" [size]="54" [online]="true" [photoUrl]="photoUrl()" />
            <input #file type="file" accept="image/*" hidden (change)="onPick($event)" />
            <button class="set-btn set-btn--ghost" (click)="file.click()">
              {{ photoUrl() ? 'Changer la photo' : 'Ajouter une photo' }}
            </button>
            @if (photoUrl()) {
              <button class="set-btn set-btn--ghost" (click)="removePhoto()">Retirer</button>
            }
          </div>
        </div>
        <div class="set-row">
          <div class="set-rlabel"><b>Prénom</b></div>
          <div class="set-rctrl">
            <input class="set-input" [value]="firstName()" (input)="firstName.set($any($event.target).value)" />
          </div>
        </div>
        <div class="set-row">
          <div class="set-rlabel"><b>Nom</b></div>
          <div class="set-rctrl">
            <input class="set-input" [value]="lastName()" (input)="lastName.set($any($event.target).value)" />
          </div>
        </div>
        <div class="set-row set-row--top">
          <div class="set-rlabel"><b>Fonction</b><small>Affichée sur votre profil et dans les équipes.</small></div>
          <div class="set-rctrl">
            <input class="set-input" [value]="role()" (input)="role.set($any($event.target).value)" />
          </div>
        </div>
        <div class="set-row">
          <div class="set-rlabel"></div>
          <div class="set-rctrl">
            <button class="set-btn set-btn--primary" [disabled]="!dirty()" (click)="save()">Enregistrer les modifications</button>
          </div>
        </div>
      </div>
    </div></div>
  `,
  styles: [`
    .set-input { display: flex; align-items: center; }
    .set-btn:disabled { opacity: .55; cursor: not-allowed; }
  `],
})
export class ParamProfilComponent {
  private profileSvc = inject(UserProfileService);
  private toast = inject(ToastService);
  @ViewChild('file') private fileInput?: ElementRef<HTMLInputElement>;

  private p = this.profileSvc.profile;

  firstName = signal(this.p().firstName);
  lastName = signal(this.p().lastName);
  role = signal(this.p().role);
  photoUrl = signal(this.p().photoDataUrl);

  displayName = computed(() => `${this.firstName()} ${this.lastName()}`.trim() || 'Akim Koné');

  /**
   * La photo compte comme une modification du formulaire à part entière.
   *
   * Comparer `photoUrl()` à `p().photoDataUrl` ne pouvait PAS marcher : `uploadPhoto()`
   * met à jour le profil **immédiatement** (aperçu instantané), si bien que les deux
   * valeurs devenaient égales au même instant et que `dirty` ne basculait jamais. Et
   * après l'upload, `p()` porte l'URL hébergée alors que la vue garde la data URL —
   * la comparaison serait alors vraie *en permanence*. On suit donc l'intention de
   * l'utilisateur, pas l'égalité des valeurs.
   */
  private photoTouched = signal(false);
  /** Retrait EXPLICITE — jamais déduit d'une photo locale absente (cf. UserProfileService). */
  private photoRemoved = signal(false);

  dirty = computed(() => {
    const cur = this.p();
    return this.photoTouched()
      || this.firstName() !== cur.firstName
      || this.lastName() !== cur.lastName
      || this.role() !== cur.role;
  });

  /**
   * Le profil est chargé de façon **asynchrone** (`GET /users/me`) : ces signaux
   * sont initialisés AVANT sa réponse et resteraient donc vides au rechargement de
   * la page — d'où « la photo n'apparaît pas ». On les réaligne à l'arrivée du
   * profil, **sans jamais écraser une saisie en cours** (`dirty`).
   *
   * Déclaré APRÈS `dirty` : un champ de classe n'existe pas avant sa ligne.
   */
  private readonly syncFromProfile = effect(() => {
    const cur = this.p();
    if (this.dirty()) return;
    this.firstName.set(cur.firstName);
    this.lastName.set(cur.lastName);
    this.role.set(cur.role);
    this.photoUrl.set(cur.photoDataUrl);
  }, { allowSignalWrites: true });

  onPick(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    // Reject files bigger than ~2 MB (browsers still work, but the data URL gets huge in-memory).
    if (file.size > 2 * 1024 * 1024) {
      this.toast.show({ message: 'Image trop volumineuse — 2 Mo max.', icon: 'warning' });
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.photoUrl.set(dataUrl);
      this.photoTouched.set(true);
      this.photoRemoved.set(false);
      // Persistance réelle : upload File Service (avatar) → photoUrl du profil.
      this.profileSvc.uploadPhoto(file, dataUrl);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removePhoto(): void {
    this.photoUrl.set(null);
    this.photoTouched.set(true);
    this.photoRemoved.set(true);
  }

  save(): void {
    const removed = this.photoRemoved();
    this.profileSvc.update({
      firstName: this.firstName().trim() || 'Akim',
      lastName: this.lastName().trim() || 'Koné',
      role: this.role().trim(),
      // La photo n'est écrite QUE si l'utilisateur y a touché : sinon on laisserait
      // un aperçu périmé écraser l'URL hébergée déjà en base.
      ...(this.photoTouched() ? { photoDataUrl: this.photoUrl() } : {}),
    }, { removePhoto: removed });
    this.photoTouched.set(false);
    this.photoRemoved.set(false);
    this.toast.show({ message: 'Profil mis à jour' });
  }
}
