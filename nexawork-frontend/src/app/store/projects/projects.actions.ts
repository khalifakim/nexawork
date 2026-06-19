import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Project, Task, CreateProjectRequest, CreateTaskRequest } from '@core/models/project.models';

export const ProjectActions = createActionGroup({
  source: 'Projects',
  events: {
    'Load Projects': emptyProps(),
    'Load Projects Success': props<{ projects: Project[] }>(),
    'Load Projects Failure': props<{ error: string }>(),
    'Select Project': props<{ project: Project }>(),
    'Create Project': props<{ request: CreateProjectRequest }>(),
    'Create Project Success': props<{ project: Project }>(),
    'Create Project Failure': props<{ error: string }>(),
    'Load Tasks': props<{ projectId: number }>(),
    'Load Tasks Success': props<{ tasks: Task[] }>(),
    'Load Tasks Failure': props<{ error: string }>(),
    'Create Task': props<{ projectId: number; request: CreateTaskRequest }>(),
    'Create Task Success': props<{ task: Task }>(),
    'Move Task': props<{ projectId: number; taskId: number; targetStatusId: number }>(),
    'Move Task Success': props<{ task: Task }>(),
  }
});
