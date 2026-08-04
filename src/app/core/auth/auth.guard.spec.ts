import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('authGuard', () => {
  let httpMock: HttpTestingController;

  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('redirects to /sign-in when there is no session', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/sign-in');
  });

  it('allows activation when a user is signed in', () => {
    const auth = TestBed.inject(AuthService);
    auth.loadCurrentUser().subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/me`)
      .flush({ id: 2, username: 'jordan.patel', role: 'Collaborator' });

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBe(true);
    httpMock.verify();
  });
});
