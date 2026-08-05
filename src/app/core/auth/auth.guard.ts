import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  // currentUser is already resolved here: the app initializer awaits
  // /auth/me before the first navigation.
  return auth.currentUser() ? true : inject(Router).createUrlTree(['/sign-in']);
};
