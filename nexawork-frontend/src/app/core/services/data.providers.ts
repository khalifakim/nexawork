import { Provider } from '@angular/core';
import { environment } from '@environment/environment';
import { MembersService, MembersMockService } from './members.service';
import { ProjectsService, ProjectsMockService, ProjectsHttpService } from './projects.service';
import { TasksService, TasksMockService, TasksHttpService } from './tasks.service';
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
 * **Bascule progressive par domaine** (plan d'intégration I0-I10) : chaque phase
 * livre son `*HttpService` puis remplace la ligne de son domaine par
 * `{ provide: XService, useClass: m.x ? XMockService : XHttpService }` et passe
 * son drapeau `environment.mock.x` à `false` — le domaine se teste aussitôt en
 * réel, le reste continue en mock. Aucun changement de composant requis.
 */
export function provideDataServices(): Provider[] {
  const m = environment.mock;
  return [
    { provide: MembersService,       useClass: MembersMockService },       // I3 → MembersHttpService
    { provide: ProjectsService,      useClass: m.projects ? ProjectsMockService : ProjectsHttpService },
    { provide: TasksService,         useClass: m.tasks ? TasksMockService : TasksHttpService },
    { provide: GedService,           useClass: GedMockService },           // I5 → GedHttpService
    { provide: ConversationsService, useClass: ConversationsMockService }, // I4 → ConversationsHttpService
    { provide: ChannelsService,      useClass: ChannelsMockService },      // I4 → ChannelsHttpService
    { provide: MeetingsService,      useClass: MeetingsMockService },      // I8 → MeetingsHttpService
    { provide: NotificationsService, useClass: NotificationsMockService }, // I6 → NotificationsHttpService
    { provide: AccueilService,       useClass: AccueilMockService },       // I7 → AccueilHttpService
    { provide: SearchService,        useClass: SearchMockService },        // I9 → SearchHttpService
  ];
}
