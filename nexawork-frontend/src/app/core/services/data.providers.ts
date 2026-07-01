import { Provider } from '@angular/core';
import { environment } from '@environment/environment';
import { MembersService, MembersMockService } from './members.service';
import { ProjectsService, ProjectsMockService } from './projects.service';
import { TasksService, TasksMockService } from './tasks.service';
import { GedService, GedMockService } from './ged.service';

/**
 * Single point of truth for domain-data wiring. Today every abstract service is
 * bound to its mock implementation. To connect the backend, add the `*HttpService`
 * classes and bind them in the `else` branch — **no component changes required**.
 */
export function provideDataServices(): Provider[] {
  if (environment.useMock) {
    return [
      { provide: MembersService, useClass: MembersMockService },
      { provide: ProjectsService, useClass: ProjectsMockService },
      { provide: TasksService, useClass: TasksMockService },
      { provide: GedService, useClass: GedMockService },
    ];
  }
  return [
    // Phase backend : remplacer par les implémentations HTTP, p.ex.
    // { provide: MembersService, useClass: MembersHttpService },
    // { provide: ProjectsService, useClass: ProjectsHttpService },
    // { provide: TasksService, useClass: TasksHttpService },
    // { provide: GedService, useClass: GedHttpService },
  ];
}
