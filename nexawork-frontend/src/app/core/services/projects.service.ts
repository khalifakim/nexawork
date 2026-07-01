import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Project } from '@core/models/project.models';
import { PROJECTS } from '@core/mock/projects';

export abstract class ProjectsService {
  abstract list(): Observable<Project[]>;
  abstract byId(id: string): Observable<Project | undefined>;
}

@Injectable()
export class ProjectsMockService extends ProjectsService {
  list(): Observable<Project[]> { return of(PROJECTS).pipe(delay(80)); }
  byId(id: string): Observable<Project | undefined> { return of(PROJECTS.find(p => p.id === id)); }
}
