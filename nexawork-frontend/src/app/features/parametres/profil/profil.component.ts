import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
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

  dirty = computed(() => {
    const cur = this.p();
    return this.firstName() !== cur.firstName
      || this.lastName() !== cur.lastName
      || this.role() !== cur.role
      || this.photoUrl() !== cur.photoDataUrl;
  });

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
      this.photoUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removePhoto(): void { this.photoUrl.set(null); }

  save(): void {
    this.profileSvc.update({
      firstName: this.firstName().trim() || 'Akim',
      lastName: this.lastName().trim() || 'Koné',
      role: this.role().trim(),
      photoDataUrl: this.photoUrl(),
    });
    this.toast.show({ message: 'Profil mis à jour' });
  }
}
