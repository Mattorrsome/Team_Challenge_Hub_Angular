import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorHandlingInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 409) {
        snackBar.open(
          'That action is not allowed in the challenge\'s current status.',
          'Dismiss',
          { duration: 5000 },
        );
      } else if (error.status >= 500) {
        snackBar.open('Something went wrong. Please try again.', 'Dismiss', { duration: 5000 });
      }
      // 400s are intentionally passed through uncaught so the calling
      // component can surface field-level validation errors inline.
      return throwError(() => error);
    }),
  );
};
