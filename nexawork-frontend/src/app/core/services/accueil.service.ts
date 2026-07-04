import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Dashboard, MyTaskSection, ReceivedMention } from '@core/models/accueil.models';
import { MY_TASKS_BY_WORKSPACE, MENTIONS_BY_WORKSPACE, DASHBOARD_BY_WORKSPACE } from '@core/mock/accueil';
import { SessionService } from './session.service';

const EMPTY_DASHBOARD: Dashboard = {
  kpis: { projectsActive: 0, projectsLate: 0, projectsArchived: 0, tasksDone: 0, tasksTotal: 0, tasksOverdue: 0, tasksOverdueProjects: 0, members: 0, membersOnline: 0 },
  charge: [], alerts: [], overdueProjects: [], projects: [],
};

/**
 * Accueil data (workspace-scoped): mes tâches, mentions reçues, tableau de bord.
 * Swap `AccueilMockService` for an HTTP impl when the backend is connected —
 * components depend only on this abstract class.
 */
export abstract class AccueilService {
  abstract myTasks(): Observable<MyTaskSection[]>;
  abstract mentions(): Observable<ReceivedMention[]>;
  abstract dashboard(): Observable<Dashboard>;
}

@Injectable()
export class AccueilMockService extends AccueilService {
  private readonly session = inject(SessionService);

  myTasks(): Observable<MyTaskSection[]> {
    return of(MY_TASKS_BY_WORKSPACE[this.session.activeWorkspaceId()] ?? []).pipe(delay(80));
  }
  mentions(): Observable<ReceivedMention[]> {
    return of(MENTIONS_BY_WORKSPACE[this.session.activeWorkspaceId()] ?? []).pipe(delay(80));
  }
  dashboard(): Observable<Dashboard> {
    return of(DASHBOARD_BY_WORKSPACE[this.session.activeWorkspaceId()] ?? EMPTY_DASHBOARD).pipe(delay(80));
  }
}
