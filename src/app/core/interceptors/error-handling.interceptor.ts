import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorHandlingInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const router = inject(Router);
  const auth = inject(AuthService);

  // /auth/me returns 401 when there's simply no session yet, and /auth/signin
  // returns 401 for bad credentials — both are handled by their callers.
  const isAuthCall = req.url.includes('/auth/');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthCall) {
        auth.clearCurrentUser();
        router.navigate(['/sign-in']);
      } else if (error.status === 403) {
        // Deliberately no redirect — that's 401's job. Bouncing on a 403 would
        // throw an admin off /admin/users over one transient failure.
        snackBar.open("You don't have permission to do that.", 'Dismiss', { duration: 5000 });
      } else if (error.status === 409 && !req.url.includes('/users/')) {
        // /users/ 409s mean "that user still owns challenges" — the admin view
        // surfaces its own message for those.
        snackBar.open(
          'That action is not allowed in the challenge\'s current status.',
          'Dismiss',
          { duration: 5000 },
        );
      } else if (error.status >= 500 && !req.url.includes('/draft-')) {
        // The two AI draft endpoints answer 503 with a specific message, which
        // the draft panels render inline next to their generate button. A
        // snackbar on top of that would say "something went wrong" over an
        // explanation the user can already read.
        snackBar.open('Something went wrong. Please try again.', 'Dismiss', { duration: 5000 });
      }
      // 400s are intentionally passed through uncaught so the calling
      // component can surface field-level validation errors inline.
      return throwError(() => error);
    }),
  );
};
