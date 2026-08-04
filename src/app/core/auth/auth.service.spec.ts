import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const authUrl = `${environment.apiBaseUrl}/auth`;
  const alex = { id: 1, username: 'alex.kim', role: 'Admin' as const };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts with no current user', () => {
    expect(service.currentUser()).toBe(null);
    expect(service.isAdmin()).toBe(false);
  });

  it('loadCurrentUser populates currentUser from /auth/me', () => {
    service.loadCurrentUser().subscribe();
    httpMock.expectOne(`${authUrl}/me`).flush(alex);

    expect(service.currentUser()).toEqual(alex);
    expect(service.isAdmin()).toBe(true);
  });

  it('loadCurrentUser leaves currentUser null on 401 without throwing', () => {
    let errored = false;
    service.loadCurrentUser().subscribe({ error: () => (errored = true) });
    httpMock
      .expectOne(`${authUrl}/me`)
      .flush({ error: 'no session' }, { status: 401, statusText: 'Unauthorized' });

    expect(errored).toBe(false);
    expect(service.currentUser()).toBe(null);
  });

  it('signIn posts the credentials and sets currentUser', () => {
    service.signIn('alex.kim', 'ChangeMe123!').subscribe();

    const req = httpMock.expectOne(`${authUrl}/signin`);
    expect(req.request.body).toEqual({ username: 'alex.kim', password: 'ChangeMe123!' });
    req.flush(alex);

    expect(service.currentUser()).toEqual(alex);
  });

  it('signIn leaves currentUser null when the credentials are rejected', () => {
    let status = 0;
    service.signIn('alex.kim', 'wrong').subscribe({ error: (e: any) => (status = e.status) });
    httpMock
      .expectOne(`${authUrl}/signin`)
      .flush({ error: 'Invalid username or password.' }, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(service.currentUser()).toBe(null);
  });

  it('signUp sets currentUser from the response (server auto-signs-in)', () => {
    const fresh = { id: 6, username: 'new.person', role: 'Collaborator' as const };
    service.signUp('new.person', 'SuperSecret1').subscribe();

    const req = httpMock.expectOne(`${authUrl}/signup`);
    expect(req.request.body).toEqual({ username: 'new.person', password: 'SuperSecret1' });
    req.flush(fresh);

    expect(service.currentUser()).toEqual(fresh);
    expect(service.isAdmin()).toBe(false);
  });

  it('signOut clears currentUser', () => {
    service.loadCurrentUser().subscribe();
    httpMock.expectOne(`${authUrl}/me`).flush(alex);

    service.signOut().subscribe();
    httpMock.expectOne(`${authUrl}/signout`).flush(null, { status: 204, statusText: 'No Content' });

    expect(service.currentUser()).toBe(null);
  });
});
