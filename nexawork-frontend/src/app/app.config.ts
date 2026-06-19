import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { routes } from './app.routes';
import { authReducer } from '@store/auth/auth.reducer';
import { AuthEffects } from '@store/auth/auth.effects';
import { projectsReducer } from '@store/projects/projects.reducer';
import { ProjectEffects } from '@store/projects/projects.effects';
import { messagingReducer } from '@store/messaging/messaging.reducer';
import { MessagingEffects } from '@store/messaging/messaging.effects';
import { meetingsReducer } from '@store/meetings/meetings.reducer';
import { MeetingEffects } from '@store/meetings/meetings.effects';
import { notificationsReducer } from '@store/notifications/notifications.reducer';
import { NotificationEffects } from '@store/notifications/notifications.effects';
import { jwtInterceptor } from '@core/interceptors/jwt.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { environment } from '@environment/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([jwtInterceptor, errorInterceptor])
    ),
    provideStore({
      auth:          authReducer,
      projects:      projectsReducer,
      messaging:     messagingReducer,
      meetings:      meetingsReducer,
      notifications: notificationsReducer,
    }),
    provideEffects([
      AuthEffects,
      ProjectEffects,
      MessagingEffects,
      MeetingEffects,
      NotificationEffects,
    ]),
    provideStoreDevtools({ maxAge: 25, logOnly: environment.production }),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};
