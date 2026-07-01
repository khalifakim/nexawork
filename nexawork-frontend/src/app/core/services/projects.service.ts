import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Project } from '@core/models/project.models';
import { PROJECTS_BY_WORKSPACE } from '@core/mock/projects';
import { SessionService } from './session.service';

export abstract class ProjectsService {
  abstract list(): Observable<Project[]>;
  abstract byId(id: string): Observable<Project | undefined>;
}

@Injectable()
export class ProjectsMockService extends ProjectsService {
  private readonly session = inject(SessionService);

  list(): Observable<Project[]> {
    const wsId = this.session.activeWorkspaceId();
    return of(PROJECTS_BY_WORKSPACE[wsId] ?? []).pipe(delay(80));
  }

  byId(id: string): Observable<Project | undefined> {
    const wsId = this.session.activeWorkspaceId();
    const list = PROJECTS_BY_WORKSPACE[wsId] ?? [];
    return of(list.find(p => p.id === id));
  }
}
