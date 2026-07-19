import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { SessionService } from '@core/services/session.service';
import { WorkspaceService } from '@core/services/workspace.service';
import { ToastService } from '@core/services/toast.service';
import { WorkspaceInvitation } from '@core/models/member.models';

interface Inv { id: string; email: string; role: 'Administrateur' | 'Membre'; by: string; date: string; }

@Component({
  selector: 'app-param-invitations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="set-page"><div class="set-inner">
      <h1 class="set-h1">Invitations</h1>
      <p class="set-desc">Les invitations envoyées, en attente d'acceptation.</p>
      <div class="bar">
        <span class="cnt">
          @if (loading()) { Chargement… } @else { {{ all().length }} invitations en attente }
        </span>
        <span style="flex:1"></span>
        <button class="set-btn set-btn--primary" (click)="bus.openInvite()"><app-icon name="plus" [size]="16" />Inviter des personnes</button>
      </div>
      <div class="set-card">
        @if (loading()) {
          <!-- Squelette : sans lui, « Aucune invitation » s'affichait pendant le chargement. -->
          @for (s of [1,2,3]; track s) {
            <div class="row" [class.row--first]="s===1">
              <span class="sk sk--ic"></span>
              <div class="b" style="flex:1"><span class="sk sk--l"></span><span class="sk sk--s"></span></div>
            </div>
          }
        } @else {
          @for (inv of all(); track inv.id; let i = $index) {
            <div class="row" [class.row--first]="i===0">
              <span class="ic"><app-icon name="mail" [size]="18" /></span>
              <div class="b"><div class="e">{{ inv.email }}</div><div class="m">Invité par {{ inv.by }} · {{ inv.date }}</div></div>
              <span class="set-badge" [class.set-badge--admin]="inv.role==='Administrateur'" [class.set-badge--member]="inv.role==='Membre'">{{ inv.role }}</span>
              <span class="status"><span class="status__d"></span>En attente</span>
              <button class="rs" (click)="resend(inv)"><app-icon name="refresh" [size]="15" />Relancer</button>
              <button class="cx" (click)="cancel(inv)"><app-icon name="x" [size]="15" /></button>
            </div>
          } @empty {
            <div class="row row--first" style="justify-content:center;color:var(--nx-text-500);font-size:13px;padding:20px 0;">
              Aucune invitation en attente.
            </div>
          }
        }
      </div>
    </div></div>
  `,
  styleUrl: './invitations.component.scss',
})
export class ParamInvitationsComponent implements OnInit {
  bus = inject(ShellBus);
  private session = inject(SessionService);
  private workspaceService = inject(WorkspaceService);
  private toast = inject(ToastService);

  all = signal<Inv[]>([]);
  loading = signal(true);

  ngOnInit(): void { this.reload(); }

  private reload(): void {
    this.loading.set(true);
    this.workspaceService.invitations(this.session.activeWorkspaceId()).subscribe({
      next: list => {
        this.all.set(list.map((i: WorkspaceInvitation) => ({
          id: i.id, email: i.email, role: i.role === 'ADMIN' ? 'Administrateur' : 'Membre',
          by: i.invitedBy, date: this.relative(i.createdAt),
        })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resend(inv: Inv): void {
    this.workspaceService.resendInvitation(inv.id).subscribe(() =>
      this.toast.show({ message: 'Invitation relancée à ' + inv.email }));
  }

  cancel(inv: Inv): void {
    this.workspaceService.cancelInvitation(inv.id).subscribe(() => {
      this.all.update(list => list.filter(x => x.id !== inv.id));
      this.toast.show({ message: 'Invitation annulée' });
    });
  }

  private relative(iso: string): string {
    const d = new Date(iso).getTime();
    if (isNaN(d)) return '';
    const days = Math.floor((Date.now() - d) / 86_400_000);
    if (days <= 0) return "Aujourd'hui";
    if (days === 1) return 'Il y a 1 jour';
    if (days < 7) return `Il y a ${days} jours`;
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? 'Il y a 1 semaine' : `Il y a ${weeks} semaines`;
  }
}
