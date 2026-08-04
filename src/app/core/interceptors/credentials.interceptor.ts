import { HttpInterceptorFn } from '@angular/common/http';

/**
 * The session is an HttpOnly cookie the browser only attaches when the request
 * opts into credentials. No token handling anywhere in application code.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));
