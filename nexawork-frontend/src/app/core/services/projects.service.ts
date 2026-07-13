import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import {
  CreateProjectPayload, Project, ProjectMember, ProjectResponse, ProjectTeam, UpdateProjectPayload,
} from '@core/models/project.models';
import { ARCHIVED_PROJECTS, PROJECTS_BY_WORKSPACE } from '@core/mock/projects';
import { SessionService } from './session.service';

/**
 * Projets (Project Service §13.4). `list()` ne renvoie que les projets **actifs
 * et visibles** par l'appelant ; les archivés passent par `listArchived()`
 * (réservé ADMIN/OWNER — REF E, R6).
 */
export abstract class ProjectsService {
  abstract list(): Observable<Project[]>;
  abstract byId(id: string): Observable<Project | undefined>;
  abstract create(payload: CreateProjectPayload): Observable<Project>;
  abstract update(id: string, patch: UpdateProjectPayload): Observable<Project>;
  abstract archive(id: string): Observable<void>;
  abstract restore(id: string): Observable<void>;
  abstract remove(id: string): Observable<void>;
  abstract listArchived(): Observable<Project[]>;
  /** Équipes d'un projet (bénéficiaires possibles d'un partage GED). */
  abstract teams(projectId: string): Observable<ProjectTeam[]>;
  /** Membres d'un projet — R16 : périmètre des bénéficiaires d'un document projet. */
  abstract members(projectId: string): Observable<ProjectMember[]>;
  /** Crée une équipe dans un projet (nom + couleur). */
  abstract createTeam(projectId: string, name: string, color: string): Observable<ProjectTeam>;
  /** Renomme / recolore une équipe. */
  abstract updateTeam(projectId: string, teamId: string, patch: { name?: string; color?: string }): Observable<ProjectTeam>;
  /** Supprime une équipe (ses membres repassent « sans équipe »). */
  abstract deleteTeam(projectId: string, teamId: string): Observable<void>;
  /** Assigne un membre à une équipe (`teamId = null` → le retire de son équipe). */
  abstract setMemberTeam(projectId: string, userId: string, teamId: string | null): Observable<void>;
}

@Injectable()
export class ProjectsMockService extends ProjectsService {
  private readonly session = inject(SessionService);
  private overrides: Record<string, Project[]> = {};
  private archived: Project[] = ARCHIVED_PROJECTS.map(p => ({ ...p }));

  private current(): Project[] {
    const wsId = this.session.activeWorkspaceId();
    return this.overrides[wsId] ?? PROJECTS_BY_WORKSPACE[wsId] ?? [];
  }
  private setCurrent(list: Project[]): void {
    this.overrides[this.session.activeWorkspaceId()] = list;
  }

  list(): Observable<Project[]> {
    return of(this.current().map(p => ({ ...p }))).pipe(delay(80));
  }

  byId(id: string): Observable<Project | undefined> {
    const found = this.current().find(p => p.id === id) ?? this.archived.find(p => p.id === id);
    return of(found ? { ...found } : undefined);
  }

  create(payload: CreateProjectPayload): Observable<Project> {
    const project: Project = {
      id: payload.name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: payload.name.trim(),
      color: payload.color ?? '#5B5FE9',
      prefix: payload.prefix || payload.name.trim().slice(0, 3).toUpperCase(),
      status: 'ACTIVE',
      ownerUserId: 'u1',
      memberCount: 1,
      startDate: payload.startDate,
      endDate: payload.endDate,
      enforceWorkflowOrder: false,
      createdDate: new Date().toISOString(),
    };
    this.setCurrent([...this.current(), project]);
    return of({ ...project }).pipe(delay(80));
  }

  update(id: string, patch: UpdateProjectPayload): Observable<Project> {
    this.setCurrent(this.current().map(p => p.id === id ? { ...p, ...patch } : p));
    return of({ ...this.current().find(p => p.id === id)! }).pipe(delay(80));
  }

  archive(id: string): Observable<void> {
    const project = this.current().find(p => p.id === id);
    if (project) {
      this.archived = [...this.archived, { ...project, status: 'ARCHIVED', lastModifiedDate: new Date().toISOString() }];
      this.setCurrent(this.current().filter(p => p.id !== id));
    }
    return of(void 0).pipe(delay(80));
  }

  restore(id: string): Observable<void> {
    const project = this.archived.find(p => p.id === id);
    if (project) {
      this.setCurrent([...this.current(), { ...project, status: 'ACTIVE' }]);
      this.archived = this.archived.filter(p => p.id !== id);
    }
    return of(void 0).pipe(delay(80));
  }

  remove(id: string): Observable<void> {
    this.setCurrent(this.current().filter(p => p.id !== id));
    this.archived = this.archived.filter(p => p.id !== id);
    return of(void 0).pipe(delay(80));
  }

  listArchived(): Observable<Project[]> {
    return of(this.archived.map(p => ({ ...p }))).pipe(delay(80));
  }

  teams(_projectId: string): Observable<ProjectTeam[]> {
    return of([
      { id: 't1', name: 'Design produit', color: '#6C70F0' },
      { id: 't2', name: 'Développement',  color: '#2BB673' },
      { id: 't3', name: 'QA & Tests',     color: '#E89A2C' },
    ]).pipe(delay(60));
  }
  members(_projectId: string): Observable<ProjectMember[]> {
    return of([]).pipe(delay(60));
  }
  createTeam(_projectId: string, name: string, color: string): Observable<ProjectTeam> {
    return of({ id: 't' + Date.now(), name, color }).pipe(delay(60));
  }
  updateTeam(_projectId: string, teamId: string, patch: { name?: string; color?: string }): Observable<ProjectTeam> {
    return of({ id: teamId, name: patch.name ?? '', color: patch.color }).pipe(delay(60));
  }
  deleteTeam(_projectId: string, _teamId: string): Observable<void> { return of(void 0).pipe(delay(60)); }
  setMemberTeam(_projectId: string, _userId: string, _teamId: string | null): Observable<void> { return of(void 0).pipe(delay(60)); }
}

@Injectable()
export class ProjectsHttpService extends BaseHttpService implements ProjectsService {
  list(): Observable<Project[]> {
    return this.get$<ProjectResponse[]>('project', '/projects').pipe(map(rs => rs.map(toProject)));
  }
  /** `GET /projects/{id}` accepte aussi un projet archivé (contrôle d'appartenance, pas de statut). */
  byId(id: string): Observable<Project | undefined> {
    return this.get$<ProjectResponse>('project', `/projects/${id}`).pipe(map(toProject));
  }
  create(payload: CreateProjectPayload): Observable<Project> {
    return this.post$<ProjectResponse>('project', '/projects', payload).pipe(map(toProject));
  }
  update(id: string, patch: UpdateProjectPayload): Observable<Project> {
    return this.patch$<ProjectResponse>('project', `/projects/${id}`, patch).pipe(map(toProject));
  }
  archive(id: string): Observable<void> {
    return this.post$<void>('project', `/projects/${id}/archive`, {});
  }
  restore(id: string): Observable<void> {
    return this.post$<void>('project', `/projects/${id}/restore`, {});
  }
  remove(id: string): Observable<void> {
    return this.delete$<void>('project', `/projects/${id}`);
  }
  listArchived(): Observable<Project[]> {
    return this.get$<ProjectResponse[]>('project', '/archived-projects').pipe(map(rs => rs.map(toProject)));
  }
  teams(projectId: string): Observable<ProjectTeam[]> {
    return this.get$<ProjectTeam[]>('project', `/projects/${projectId}/teams`);
  }
  members(projectId: string): Observable<ProjectMember[]> {
    return this.get$<ProjectMember[]>('project', `/projects/${projectId}/members`);
  }
  createTeam(projectId: string, name: string, color: string): Observable<ProjectTeam> {
    return this.post$<ProjectTeam>('project', `/projects/${projectId}/teams`, { name, color });
  }
  updateTeam(projectId: string, teamId: string, patch: { name?: string; color?: string }): Observable<ProjectTeam> {
    return this.patch$<ProjectTeam>('project', `/projects/${projectId}/teams/${teamId}`, patch);
  }
  deleteTeam(projectId: string, teamId: string): Observable<void> {
    return this.delete$<void>('project', `/projects/${projectId}/teams/${teamId}`);
  }
  setMemberTeam(projectId: string, userId: string, teamId: string | null): Observable<void> {
    const body = teamId ? { teamId } : { clearTeam: true };
    return this.patch$<unknown>('project', `/projects/${projectId}/members/${userId}`, body).pipe(map(() => void 0));
  }
}

/** Couleur de repli quand le backend n'en porte pas. */
const DEFAULT_PROJECT_COLOR = '#5B5FE9';

/** `ProjectResponse` (backend) → `Project` (view-model). */
function toProject(r: ProjectResponse): Project {
  return {
    id: r.id,
    name: r.name,
    color: r.color || DEFAULT_PROJECT_COLOR,
    prefix: r.prefix,
    description: r.description,
    status: r.status,
    ownerUserId: r.ownerUserId,
    memberCount: r.memberCount ?? 0,
    startDate: r.startDate,
    endDate: r.endDate,
    enforceWorkflowOrder: r.enforceWorkflowOrder ?? false,
    createdDate: r.createdDate,
    lastModifiedDate: r.lastModifiedDate,
  };
}
