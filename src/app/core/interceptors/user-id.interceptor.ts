import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { UserContextService } from '../user-context/user-context.service';

export const userIdInterceptor: HttpInterceptorFn = (req, next) => {
  const userContext = inject(UserContextService);
  const userId = userContext.userId();

  if (userId == null) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { 'X-User-Id': String(userId) } }));
};
