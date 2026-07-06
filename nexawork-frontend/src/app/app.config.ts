import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { routes } from './app.routes';
import { authReducer } from '@store/auth/auth.reducer';
import { AuthEffects } from '@store/auth/auth.effects';
import { jwtInterceptor } from '@core/interceptors/jwt.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { provideDataServices } from '@core/services/data.providers';
import { AuthService, AuthMockService, AuthHttpService } from '@core/services/auth.service';
import { environment } from '@environment/environment';

/**
 * Frontend (mock) phase: only the `auth` slice is wired into NgRx — guards and
 * the shell read the session from it. Feature views consume in-memory mock
 * services directly. The other slices are reinstated when the real backend is
 * connected.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),
    provideStore({ auth: authReducer }),
    provideEffects([AuthEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: environment.production }),
    ...provideDataServices(),
    // Auth suit le même pattern mock↔HTTP que les services de domaine (Phase I0).
    { provide: AuthService, useClass: environment.useMock ? AuthMockService : AuthHttpService },
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};
