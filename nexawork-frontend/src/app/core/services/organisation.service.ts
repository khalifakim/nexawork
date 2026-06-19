import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';

export interface OrgMember {
  userId: number;
  email: string;
  displayName: string;
  orgRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  avatarUrl?: string;
}

export interface InviteRequest {
  email: string;
}

@Injectable({ providedIn: 'root' })
export class OrganisationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/nexawork-auth-api-v1/api/v1/organisations`;

  getMembers(orgId: number): Observable<{ data: OrgMember[] }> {
    return this.http.get<{ data: OrgMember[] }>(`${this.base}/${orgId}/members`);
  }

  inviteMember(orgId: number, email: string): Observable<{ data: any }> {
    return this.http.post<{ data: any }>(`${this.base}/${orgId}/invite`, { email } as InviteRequest);
  }

  createOrganisation(name: string): Observable<{ data: any }> {
    return this.http.post<{ data: any }>(this.base, { name });
  }
}
