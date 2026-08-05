import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { errorHandlingInterceptor } from './core/interceptors/error-handling.interceptor';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([credentialsInterceptor, errorHandlingInterceptor])),
    // Resolve the session before the first navigation, so authGuard reads a
    // settled currentUser instead of racing the /auth/me response.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).loadCurrentUser())),
  ],
};
