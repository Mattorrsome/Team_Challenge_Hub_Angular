import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { SignInComponent } from './sign-in.component';
import { environment } from '../../../../environments/environment';

describe('SignInComponent', () => {
  let httpMock: HttpTestingController;

  const signInUrl = `${environment.apiBaseUrl}/auth/signin`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignInComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  it('does not submit while the form is empty', () => {
    const fixture = TestBed.createComponent(SignInComponent);
    fixture.componentInstance.onSubmit();

    httpMock.expectNone(signInUrl);
    expect(fixture.componentInstance.form.controls.username.touched).toBe(true);
  });

  it('posts the credentials and navigates to the challenge list', async () => {
    const fixture = TestBed.createComponent(SignInComponent);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');

    fixture.componentInstance.form.setValue({ username: 'alex.kim', password: 'ChangeMe123!' });
    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(signInUrl);
    expect(req.request.body).toEqual({ username: 'alex.kim', password: 'ChangeMe123!' });
    req.flush({ id: 1, username: 'alex.kim', role: 'Admin' });

    expect(navigate).toHaveBeenCalledWith(['/challenges']);
    httpMock.verify();
  });

  it('shows an inline error when the credentials are rejected', () => {
    const fixture = TestBed.createComponent(SignInComponent);

    fixture.componentInstance.form.setValue({ username: 'alex.kim', password: 'nope' });
    fixture.componentInstance.onSubmit();

    httpMock
      .expectOne(signInUrl)
      .flush({ error: 'Invalid username or password.' }, { status: 401, statusText: 'Unauthorized' });

    expect(fixture.componentInstance.serverError()).toBe('Invalid username or password.');
    httpMock.verify();
  });

  it('does not show the inline credentials error for a 500', () => {
    const fixture = TestBed.createComponent(SignInComponent);

    fixture.componentInstance.form.setValue({ username: 'alex.kim', password: 'ChangeMe123!' });
    fixture.componentInstance.onSubmit();

    httpMock
      .expectOne(signInUrl)
      .flush({ error: 'Something went wrong.' }, { status: 500, statusText: 'Internal Server Error' });

    expect(fixture.componentInstance.serverError()).toBeNull();
    httpMock.verify();
  });
});
