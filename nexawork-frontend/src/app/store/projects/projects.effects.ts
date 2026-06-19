import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ProjectService } from '@core/services/project.service';
import { ProjectActions } from './projects.actions';

@Injectable()
export class ProjectEffects {
  private readonly actions$ = inject(Actions);
  private readonly projectService = inject(ProjectService);

  loadProjects$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectActions.loadProjects),
      switchMap(() =>
        this.projectService.getProjects().pipe(
          map(res => ProjectActions.loadProjectsSuccess({ projects: res.data })),
          catchError(err => of(ProjectActions.loadProjectsFailure({ error: err.message })))
        )
      )
    )
  );

  loadTasks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectActions.loadTasks),
      switchMap(({ projectId }) =>
        this.projectService.getTasks(projectId).pipe(
          map(res => ProjectActions.loadTasksSuccess({ tasks: res.data })),
          catchError(err => of(ProjectActions.loadTasksFailure({ error: err.message })))
        )
      )
    )
  );

  createProject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectActions.createProject),
      switchMap(({ request }) =>
        this.projectService.createProject(request).pipe(
          map(res => ProjectActions.createProjectSuccess({ project: res.data })),
          catchError(err => of(ProjectActions.createProjectFailure({ error: err.message })))
        )
      )
    )
  );

  moveTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectActions.moveTask),
      switchMap(({ projectId, taskId, targetStatusId }) =>
        this.projectService.moveTask(projectId, taskId, targetStatusId).pipe(
          map(res => ProjectActions.moveTaskSuccess({ task: res.data })),
          catchError(() => of())
        )
      )
    )
  );
}
