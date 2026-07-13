import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CreerReunionComponent } from '@features/reunions/modals/creer-reunion/creer-reunion.component';
import { ToastService } from '@core/services/toast.service';
import { SessionService } from '@core/services/session.service';
import { MeetingsService } from '@core/services/meetings.service';
import { environment } from '@environment/environment';
import { slugify } from '@core/util/ui.util';

@Component({
  selector: 'app-lancer-reunion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CreerReunionComponent],
  template: `
    <div class="wrap">
      <div class="ico"><app-icon name="video" [size]="40" [stroke]="1.8" /></div>
      <h1>Lancer une réunion</h1>
      <p>Démarrez un appel instantané et invitez les membres du workspace ou des participants externes.</p>
      <button class="cta" (click)="open.set(true)"><app-icon name="plus" [size]="18" [stroke]="2" />Créer une réunion</button>
    </div>

    @if (open()) {
      <app-creer-reunion [busy]="creating()" (closed)="open.set(false)" (created)="onCreated($event)" />
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .wrap { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; }
    .ico { width: 88px; height: 88px; border-radius: 24px; background: linear-gradient(135deg,#6C70F0,#4B3FD6); color: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 12px 32px rgba(75,63,214,.32); }
    h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -.02em; }
    p { margin: 10px 0 28px; font-size: 15px; color: var(--nx-text-500); max-width: 420px; line-height: 1.5; }
    .cta { display: flex; align-items: center; gap: 9px; padding: 14px 26px; border: none; border-radius: 12px; background: var(--nx-indigo); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; box-shadow: var(--nx-shadow-primary); }
    .cta:hover { background: var(--nx-indigo-hover); }
  `],
})
export class LancerReunionComponent {
  private router = inject(Router);
  private toast = inject(ToastService);
  private session = inject(SessionService);
  private meetings = inject(MeetingsService);
  open = signal(false);
  /** Création en cours : le modal affiche « Création… » (l'appel dure ~1-2 s). */
  creating = signal(false);

  /**
   * Créer une réunion = démarrer un appel actif (REF A). Les membres conviés sont
   * notifiés par le backend (événement `meeting.participant.invited`) ; chaque
   * invité externe reçoit par email un lien `/guest/{token}` qui lui ouvre la
   * salle **sans compte**. La salle s'ouvre ensuite dans une **fenêtre dédiée**,
   * l'application restant utilisable en arrière-plan.
   */
  onCreated(ev: { title: string; memberIds: string[]; emails: string[] }): void {
    const invites = ev.memberIds.length + ev.emails.length;
    const suffix = invites
      ? ' — ' + invites + ' invitation' + (invites > 1 ? 's' : '') + ' envoyée' + (invites > 1 ? 's' : '')
      : '';

    if (environment.mock.meetings) {
      this.open.set(false);
      this.session.startCall({
        id: slugify(ev.title) || ('meeting-' + Date.now()),
        meetingTitle: ev.title,
        context: 'Réunion en cours',
      });
      this.toast.show({ message: 'Réunion « ' + ev.title + ' » créée' + suffix });
      this.router.navigate(['/app/reunions/historique']);
      return;
    }

    this.creating.set(true);
    this.meetings.create(ev.title, ev.memberIds).pipe(
      // Invités externes : un lien à usage unique par adresse, envoyé par email.
      switchMap(room => (ev.emails.length
        ? forkJoin(ev.emails.map(email => this.meetings.inviteGuest(room.id, email, email.split('@')[0])))
            .pipe(map(() => room))
        : of(room))),
    ).subscribe({
      next: room => {
        this.creating.set(false);
        this.open.set(false);
        this.toast.show({ message: 'Réunion « ' + ev.title + ' » créée' + suffix });
        this.openRoomWindow(room.id);
        this.router.navigate(['/app/reunions/historique']);
      },
      error: () => this.creating.set(false), // message porté par l'intercepteur
    });
  }

  /** Ouvre la salle dans une fenêtre séparée ; repli sur un onglet si le popup est bloqué. */
  private openRoomWindow(callId: string): void {
    const url = '/salle/' + callId;
    const win = window.open(url, 'nexawork-reunion-' + callId, 'width=1280,height=800,noopener');
    if (!win) {
      this.toast.show({ message: 'Autorisez les fenêtres surgissantes pour ouvrir la salle.', icon: 'warning' });
    }
  }
}
