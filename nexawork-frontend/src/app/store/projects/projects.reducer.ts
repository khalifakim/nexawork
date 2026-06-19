import { createReducer, on } from '@ngrx/store';
import { Project, Task } from '@core/models/project.models';
import { ProjectActions } from './projects.actions';

export interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

const initialState: ProjectsState = {
  projects: [],
  currentProject: null,
  tasks: [],
  loading: false,
  error: null,
};

export const projectsReducer = createReducer(
  initialState,
  on(ProjectActions.loadProjects, state => ({ ...state, loading: true, error: null })),
  on(ProjectActions.loadProjectsSuccess, (state, { projects }) => ({ ...state, projects, loading: false })),
  on(ProjectActions.loadProjectsFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(ProjectActions.selectProject, (state, { project }) => ({ ...state, currentProject: project, tasks: [] })),
  on(ProjectActions.createProjectSuccess, (state, { project }) => ({
    ...state, projects: [...state.projects, project]
  })),
  on(ProjectActions.loadTasksSuccess, (state, { tasks }) => ({ ...state, tasks })),
  on(ProjectActions.createTaskSuccess, (state, { task }) => ({ ...state, tasks: [...state.tasks, task] })),
  on(ProjectActions.moveTaskSuccess, (state, { task }) => ({
    ...state,
    tasks: state.tasks.map(t => t.id === task.id ? task : t)
  })),
);
