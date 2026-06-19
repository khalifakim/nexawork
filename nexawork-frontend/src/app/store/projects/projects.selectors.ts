import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProjectsState } from './projects.reducer';

export const selectProjectsState = createFeatureSelector<ProjectsState>('projects');
export const selectProjects     = createSelector(selectProjectsState, s => s.projects);
export const selectCurrentProject = createSelector(selectProjectsState, s => s.currentProject);
export const selectTasks        = createSelector(selectProjectsState, s => s.tasks);
export const selectProjectsLoading = createSelector(selectProjectsState, s => s.loading);
export const selectProjectsError   = createSelector(selectProjectsState, s => s.error);
