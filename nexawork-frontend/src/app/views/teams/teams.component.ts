import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { selectUser } from '@store/auth/auth.selectors';
import { OrganisationService, OrgMember } from '@core/services/organisation.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container-fluid py-3">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">Équipes</h4>
        <button class="btn btn-primary btn-sm" (click)="showInvite = !showInvite">
          + Inviter un membre
        </button>
      </div>

      @if (showInvite) {
        <div class="card mb-4">
          <div class="card-body">
            <h6 class="card-title">Inviter par e-mail</h6>
            <div class="d-flex gap-2">
              <input [(ngModel)]="inviteEmail" class="form-control" type="email"
                placeholder="adresse@email.com" />
              <button class="btn btn-success" (click)="sendInvite()" [disabled]="!inviteEmail.trim()">
                Envoyer
              </button>
              <button class="btn btn-outline-secondary" (click)="showInvite = false">Annuler</button>
            </div>
            @if (inviteMessage()) {
              <div class="alert alert-info mt-2 mb-0 py-2">{{ inviteMessage() }}</div>
            }
          </div>
        </div>
      }

      @if (loading()) {
        <div class="text-center py-5 text-muted">Chargement des membres...</div>
      } @else {
        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
          @for (member of members(); track member.userId) {
            <div class="col">
              <div class="card h-100">
                <div class="card-body d-flex align-items-center gap-3">
                  <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                    style="width:44px;height:44px;font-size:1.1rem;flex-shrink:0">
                    {{ member.displayName.charAt(0).toUpperCase() }}
                  </div>
                  <div class="overflow-hidden">
                    <div class="fw-semibold text-truncate">{{ member.displayName }}</div>
                    <div class="text-muted small text-truncate">{{ member.email }}</div>
                    <span class="badge" [class]="roleBadge(member.orgRole)">{{ member.orgRole }}</span>
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="col-12 text-center text-muted py-4">Aucun membre trouvé.</div>
          }
        </div>
      }
    </div>
  `,
})
export class TeamsComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly orgService = inject(OrganisationService);

  members = signal<OrgMember[]>([]);
  loading = signal(true);
  showInvite = false;
  inviteEmail = '';
  inviteMessage = signal('');

  private orgId: number | null = null;

  ngOnInit(): void {
    this.store.select(selectUser).pipe(take(1)).subscribe(user => {
      if (user?.organisationId) {
        this.orgId = user.organisationId;
        this.loadMembers();
      } else {
        this.loading.set(false);
      }
    });
  }

  loadMembers(): void {
    if (!this.orgId) return;
    this.loading.set(true);
    this.orgService.getMembers(this.orgId).subscribe({
      next: res => { this.members.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  sendInvite(): void {
    if (!this.orgId || !this.inviteEmail.trim()) return;
    this.orgService.inviteMember(this.orgId, this.inviteEmail).subscribe({
      next: () => {
        this.inviteMessage.set(`Invitation envoyée à ${this.inviteEmail}`);
        this.inviteEmail = '';
        setTimeout(() => { this.inviteMessage.set(''); this.showInvite = false; }, 3000);
      },
      error: () => this.inviteMessage.set('Échec de l\'invitation. Vérifiez l\'e-mail.'),
    });
  }

  roleBadge(role: string): string {
    return role === 'OWNER' ? 'bg-danger' : role === 'ADMIN' ? 'bg-warning text-dark' : 'bg-secondary';
  }
}
