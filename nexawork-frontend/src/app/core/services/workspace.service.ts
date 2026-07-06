import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import {
  CreateWorkspacePayload, UpdateWorkspacePayload, Workspace, WorkspaceResponse,
} from '@core/models/workspace.models';
import { WORKSPACES } from '@core/mock/workspaces';

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
}

/** WorkspaceResponse (backend) → Workspace (view-model). */
function toWorkspace(r: WorkspaceResponse): Workspace {
  return { id: r.id, name: r.name, color: r.color, role: r.myRole, members: r.memberCount };
}
