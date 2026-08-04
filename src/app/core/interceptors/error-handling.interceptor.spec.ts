import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { errorHandlingInterceptor } from './error-handling.interceptor';

describe('errorHandlingInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;
  let snackBar: MatSnackBar;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorHandlingInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    snackBar = TestBed.inject(MatSnackBar);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(snackBar, 'open').mockReturnValue({} as ReturnType<MatSnackBar['open']>);
  });

  afterEach(() => httpMock.verify());

  it('redirects to /sign-in on a 401 for a non-auth URL', () => {
    http.get('/api/challenges').subscribe({ error: () => {} });

    httpMock.expectOne('/api/challenges').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('does not redirect on a 401 for /auth/me — the caller handles it', () => {
    http.get('/api/auth/me').subscribe({ error: () => {} });

    httpMock.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not open a snackbar on a 409 for a /users/ URL', () => {
    http.delete('/api/users/2').subscribe({ error: () => {} });

    httpMock.expectOne('/api/users/2').flush(null, { status: 409, statusText: 'Conflict' });

    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('opens the challenge-status snackbar on a 409 for any other URL', () => {
    http.put('/api/challenges/1/status', {}).subscribe({ error: () => {} });

    httpMock
      .expectOne('/api/challenges/1/status')
      .flush(null, { status: 409, statusText: 'Conflict' });

    expect(snackBar.open).toHaveBeenCalledWith(
      'That action is not allowed in the challenge\'s current status.',
      'Dismiss',
      { duration: 5000 },
    );
  });
});
