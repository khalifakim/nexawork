import { Provider } from '@angular/core';
import { environment } from '@environment/environment';
import { MembersService, MembersMockService, MembersHttpService } from './members.service';
import { ProjectsService, ProjectsMockService, ProjectsHttpService } from './projects.service';
import { TasksService, TasksMockService, TasksHttpService } from './tasks.service';
import { GedService, GedMockService, GedHttpService } from './ged.service';
import { ConversationsService, ConversationsMockService, ConversationsHttpService } from './conversations.service';
import { ChannelsService, ChannelsMockService, ChannelsHttpService } from './channels.service';
import { MeetingsService, MeetingsMockService, MeetingsHttpService } from './meetings.service';
import { NotificationsService, NotificationsMockService, NotificationsHttpService } from './notifications.service';
import { AccueilService, AccueilMockService, AccueilHttpService } from './accueil.service';
import { SearchService, SearchMockService, SearchHttpService } from './search.service';

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
    { provide: MembersService,       useClass: m.members ? MembersMockService : MembersHttpService },
    { provide: ProjectsService,      useClass: m.projects ? ProjectsMockService : ProjectsHttpService },
    { provide: TasksService,         useClass: m.tasks ? TasksMockService : TasksHttpService },
    { provide: GedService,           useClass: m.ged ? GedMockService : GedHttpService }, // I5 (flag flippé quand écritures réelles)
    { provide: ConversationsService, useClass: m.conversations ? ConversationsMockService : ConversationsHttpService },
    { provide: ChannelsService,      useClass: m.channels ? ChannelsMockService : ChannelsHttpService },
    { provide: MeetingsService,      useClass: m.meetings ? MeetingsMockService : MeetingsHttpService },
    { provide: NotificationsService, useClass: m.notifications ? NotificationsMockService : NotificationsHttpService },
    { provide: AccueilService,       useClass: m.accueil ? AccueilMockService : AccueilHttpService },
    { provide: SearchService,        useClass: m.search ? SearchMockService : SearchHttpService },
  ];
}
