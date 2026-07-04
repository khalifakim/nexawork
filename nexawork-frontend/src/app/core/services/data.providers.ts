import { Provider } from '@angular/core';
import { environment } from '@environment/environment';
import { MembersService, MembersMockService } from './members.service';
import { ProjectsService, ProjectsMockService } from './projects.service';
import { TasksService, TasksMockService } from './tasks.service';
import { GedService, GedMockService } from './ged.service';
import { ConversationsService, ConversationsMockService } from './conversations.service';
import { ChannelsService, ChannelsMockService } from './channels.service';
import { MeetingsService, MeetingsMockService } from './meetings.service';
import { NotificationsService, NotificationsMockService } from './notifications.service';
import { AccueilService, AccueilMockService } from './accueil.service';
import { SearchService, SearchMockService } from './search.service';

/**
 * Single point of truth for domain-data wiring. Every feature reads its data
 * through an `abstract *Service`; here we bind each one to its concrete impl.
 *
 * Today every service is bound to its mock (workspace-scoped fixtures under
 * `core/mock/*`). To connect the backend, implement the matching `*HttpService`
 * classes and bind them in the `else` branch — **no component changes required**
 * (components only ever import the abstract class).
 */
export function provideDataServices(): Provider[] {
  if (environment.useMock) {
    return [
      { provide: MembersService,       useClass: MembersMockService },
      { provide: ProjectsService,      useClass: ProjectsMockService },
      { provide: TasksService,         useClass: TasksMockService },
      { provide: GedService,           useClass: GedMockService },
      { provide: ConversationsService, useClass: ConversationsMockService },
      { provide: ChannelsService,      useClass: ChannelsMockService },
      { provide: MeetingsService,      useClass: MeetingsMockService },
      { provide: NotificationsService, useClass: NotificationsMockService },
      { provide: AccueilService,       useClass: AccueilMockService },
      { provide: SearchService,        useClass: SearchMockService },
    ];
  }
  return [
    // Phase backend : remplacer par les implémentations HTTP, p.ex.
    // { provide: MembersService,       useClass: MembersHttpService },
    // { provide: ProjectsService,      useClass: ProjectsHttpService },
    // { provide: TasksService,         useClass: TasksHttpService },
    // { provide: GedService,           useClass: GedHttpService },
    // { provide: ConversationsService, useClass: ConversationsHttpService },
    // { provide: ChannelsService,      useClass: ChannelsHttpService },
    // { provide: MeetingsService,      useClass: MeetingsHttpService },
    // { provide: NotificationsService, useClass: NotificationsHttpService },
    // { provide: AccueilService,       useClass: AccueilHttpService },
    // { provide: SearchService,        useClass: SearchHttpService },
  ];
}
