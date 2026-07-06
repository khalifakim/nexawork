import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import {
  CreateWorkspacePayload, UpdateWorkspacePayload, Workspace, WorkspaceResponse,
} from '@core/models/workspace.models';
import { WorkspaceInvitation, WorkspaceMemberAdmin } from '@core/models/member.models';
import { WORKSPACES } from '@core/mock/workspaces';

/** Réponses backend brutes pour l'administration des membres/invitations. */
interface MemberResponse {
  id: string; userId: string; email: string; firstName: string; lastName: string;
  displayName: string; jobTitle?: string; photoUrl?: string;
  orgRole: 'OWNER' | 'ADMIN' | 'MEMBER'; joinedAt: string; isOwner: boolean; isDeactivated: boolean;
}
interface InvitationResponse {
  id: string; email: string; role: 'ADMIN' | 'MEMBER'; status: string;
  expiresAt: string; invitedByDisplayName?: string; createdDate: string;
}

const AVATAR_COLORS = ['#6C70F0', '#2BB673', '#E0497B', '#3AA9E0', '#F2693C', '#8E5AD6', '#E89A2C', '#8E8AA0'];
function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/**
 * Espaces de travail (Auth Service §13.1). Fournit le catalogue consommé par
 * `SessionService` (header, sélecteur, Paramètres ▸ Espaces). Mock ↔ HTTP lié
 * dans `app.config.ts` selon `environment.mock.auth`.
 */
export abstract class WorkspaceService {
  abstract list(): Observable<Workspace[]>;
  abstract create(payload: CreateWorkspacePayload): Observable<Workspace>;
  abstract update(id: string, patch: UpdateWorkspacePayload): Observable<Workspace>;
  /** DELETE /workspaces/{id} (REF H : OWNER uniquement, 403 sinon). */
  abstract remove(id: string): Observable<void>;
  /** POST /workspace-members/leave — retourne si le workspace quitté était l'actif. */
  abstract leave(workspaceId: string): Observable<{ wasActive: boolean }>;

  // ─── Administration des membres (Paramètres ▸ Membres, R18) ─────────────────
  abstract members(workspaceId: string): Observable<WorkspaceMemberAdmin[]>;
  abstract changeMemberRole(memberId: string, role: 'ADMIN' | 'MEMBER'): Observable<void>;
  abstract toggleMemberActive(memberId: string, active: boolean): Observable<void>;
  abstract removeMember(memberId: string): Observable<void>;

  // ─── Invitations (Paramètres ▸ Invitations, modal §4.7) ─────────────────────
  abstract invitations(workspaceId: string): Observable<WorkspaceInvitation[]>;
  abstract sendInvitations(workspaceId: string, emails: string[], role: 'ADMIN' | 'MEMBER'): Observable<void>;
  abstract resendInvitation(invitationId: string): Observable<void>;
  abstract cancelInvitation(invitationId: string): Observable<void>;
}

@Injectable()
export class WorkspaceMockService extends WorkspaceService {
  private catalog: Workspace[] = WORKSPACES.map(w => ({ ...w }));

  list(): Observable<Workspace[]> {
    return of(this.catalog.map(w => ({ ...w }))).pipe(delay(60));
  }
  create(payload: CreateWorkspacePayload): Observable<Workspace> {
    const ws: Workspace = {
      id: (payload.slug || payload.name.trim().toLowerCase().replace(/\s+/g, '-')) + '-' + Date.now(),
      name: payload.name.trim(), color: payload.color, role: 'OWNER', members: 1,
    };
    this.catalog = [...this.catalog, ws];
    return of({ ...ws }).pipe(delay(60));
  }
  update(id: string, patch: UpdateWorkspacePayload): Observable<Workspace> {
    this.catalog = this.catalog.map(w => w.id === id ? { ...w, ...patch } : w);
    return of({ ...this.catalog.find(w => w.id === id)! }).pipe(delay(60));
  }
  remove(id: string): Observable<void> {
    this.catalog = this.catalog.filter(w => w.id !== id);
    return of(void 0).pipe(delay(60));
  }
  leave(id: string): Observable<{ wasActive: boolean }> {
    this.catalog = this.catalog.filter(w => w.id !== id);
    return of({ wasActive: true }).pipe(delay(60));
  }

  private membersList: WorkspaceMemberAdmin[] = [
    { memberId: 'm1', userId: 'u1', name: 'Akim Koné', email: 'akim.kone@nexa.io', color: '#F2693C', role: 'OWNER', isOwner: true, active: true },
    { memberId: 'm2', userId: 'u2', name: 'Sarah Diallo', email: 'sarah.diallo@nexa.io', color: '#6C70F0', role: 'ADMIN', isOwner: false, active: true },
    { memberId: 'm3', userId: 'u3', name: 'Moussa Bâ', email: 'moussa.ba@nexa.io', color: '#2BB673', role: 'MEMBER', isOwner: false, active: true },
    { memberId: 'm4', userId: 'u4', name: 'Aïda Ndiaye', email: 'aida.ndiaye@nexa.io', color: '#E0497B', role: 'MEMBER', isOwner: false, active: false },
  ];
  private invites: WorkspaceInvitation[] = [
    { id: 'i1', email: 'yacine.sow@nexa.io', role: 'MEMBER', invitedBy: 'Akim Koné', createdAt: new Date().toISOString() },
  ];

  members(_ws: string): Observable<WorkspaceMemberAdmin[]> { return of(this.membersList.map(m => ({ ...m }))).pipe(delay(60)); }
  changeMemberRole(id: string, role: 'ADMIN' | 'MEMBER'): Observable<void> {
    this.membersList = this.membersList.map(m => m.memberId === id ? { ...m, role } : m); return of(void 0).pipe(delay(60));
  }
  toggleMemberActive(id: string, active: boolean): Observable<void> {
    this.membersList = this.membersList.map(m => m.memberId === id ? { ...m, active } : m); return of(void 0).pipe(delay(60));
  }
  removeMember(id: string): Observable<void> {
    this.membersList = this.membersList.filter(m => m.memberId !== id); return of(void 0).pipe(delay(60));
  }
  invitations(_ws: string): Observable<WorkspaceInvitation[]> { return of(this.invites.map(i => ({ ...i }))).pipe(delay(60)); }
  sendInvitations(_ws: string, emails: string[], role: 'ADMIN' | 'MEMBER'): Observable<void> {
    this.invites = [...this.invites, ...emails.map((email, k) => ({ id: 'i' + Date.now() + k, email, role, invitedBy: 'Moi', createdAt: new Date().toISOString() }))];
    return of(void 0).pipe(delay(60));
  }
  resendInvitation(_id: string): Observable<void> { return of(void 0).pipe(delay(60)); }
  cancelInvitation(id: string): Observable<void> { this.invites = this.invites.filter(i => i.id !== id); return of(void 0).pipe(delay(60)); }
}

@Injectable()
export class WorkspaceHttpService extends BaseHttpService implements WorkspaceService {
  list(): Observable<Workspace[]> {
    return this.get$<WorkspaceResponse[]>('auth', '/workspaces').pipe(map(rs => rs.map(toWorkspace)));
  }
  create(payload: CreateWorkspacePayload): Observable<Workspace> {
    return this.post$<WorkspaceResponse>('auth', '/workspaces', payload).pipe(map(toWorkspace));
  }
  update(id: string, patch: UpdateWorkspacePayload): Observable<Workspace> {
    return this.patch$<WorkspaceResponse>('auth', `/workspaces/${id}`, patch).pipe(map(toWorkspace));
  }
  remove(id: string): Observable<void> {
    return this.delete$<void>('auth', `/workspaces/${id}`);
  }
  leave(workspaceId: string): Observable<{ wasActive: boolean }> {
    return this.post$<{ wasActive: boolean }>('auth', '/workspace-members/leave', { workspaceId });
  }

  members(workspaceId: string): Observable<WorkspaceMemberAdmin[]> {
    return this.get$<MemberResponse[]>('auth', `/workspaces/${workspaceId}/members`).pipe(map(rs => rs.map(toMemberAdmin)));
  }
  changeMemberRole(memberId: string, role: 'ADMIN' | 'MEMBER'): Observable<void> {
    return this.patch$<void>('auth', `/workspace-members/${memberId}/role`, { role });
  }
  toggleMemberActive(memberId: string, active: boolean): Observable<void> {
    return this.patch$<void>('auth', `/workspace-members/${memberId}/active`, { active });
  }
  removeMember(memberId: string): Observable<void> {
    return this.delete$<void>('auth', `/workspace-members/${memberId}`);
  }
  invitations(workspaceId: string): Observable<WorkspaceInvitation[]> {
    return this.get$<InvitationResponse[]>('auth', `/workspaces/${workspaceId}/invitations`).pipe(map(rs => rs.map(toInvitation)));
  }
  sendInvitations(workspaceId: string, emails: string[], role: 'ADMIN' | 'MEMBER'): Observable<void> {
    return this.post$<void>('auth', `/workspaces/${workspaceId}/invitations`, { emails, role });
  }
  resendInvitation(invitationId: string): Observable<void> {
    return this.post$<void>('auth', `/invitations/${invitationId}/resend`, {});
  }
  cancelInvitation(invitationId: string): Observable<void> {
    return this.delete$<void>('auth', `/invitations/${invitationId}`);
  }
}

function toMemberAdmin(r: MemberResponse): WorkspaceMemberAdmin {
  return {
    memberId: r.id, userId: r.userId, name: r.displayName, email: r.email,
    color: colorFor(r.userId), role: r.orgRole, isOwner: r.isOwner, active: !r.isDeactivated,
  };
}
function toInvitation(r: InvitationResponse): WorkspaceInvitation {
  return { id: r.id, email: r.email, role: r.role, invitedBy: r.invitedByDisplayName ?? '—', createdAt: r.createdDate };
}

/** WorkspaceResponse (backend) → Workspace (view-model). */
function toWorkspace(r: WorkspaceResponse): Workspace {
  return { id: r.id, name: r.name, color: r.color, role: r.myRole, members: r.memberCount };
}
