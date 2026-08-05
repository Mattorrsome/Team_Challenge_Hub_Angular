import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { UserRole } from './models/auth-user.model';
import { environment } from '../../../environments/environment';

describe('adminGuard', () => {
  let httpMock: HttpTestingController;

  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  const signIn = (role: UserRole) => {
    TestBed.inject(AuthService).loadCurrentUser().subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/me`)
      .flush({ id: 1, username: 'someone', role });
  };

  it('redirects a collaborator to the challenge list', () => {
    signIn('Collaborator');

    const result = TestBed.runInInjectionContext(() => adminGuard(route, state));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/challenges');
    httpMock.verify();
  });

  it('allows an admin through', () => {
    signIn('Admin');

    expect(TestBed.runInInjectionContext(() => adminGuard(route, state))).toBe(true);
    httpMock.verify();
  });
});
