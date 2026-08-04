import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { SignUpComponent } from './sign-up.component';
import { environment } from '../../../../environments/environment';

describe('SignUpComponent', () => {
  let httpMock: HttpTestingController;

  const signUpUrl = `${environment.apiBaseUrl}/auth/signup`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignUpComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  it('requires a password of at least 8 characters', () => {
    const fixture = TestBed.createComponent(SignUpComponent);
    fixture.componentInstance.form.setValue({ username: 'new.person', password: 'short' });

    fixture.componentInstance.onSubmit();

    httpMock.expectNone(signUpUrl);
    expect(fixture.componentInstance.form.controls.password.hasError('minlength')).toBe(true);
  });

  it('posts the new account and navigates to the challenge list', () => {
    const fixture = TestBed.createComponent(SignUpComponent);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    fixture.componentInstance.form.setValue({ username: 'new.person', password: 'SuperSecret1' });
    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(signUpUrl);
    expect(req.request.body).toEqual({ username: 'new.person', password: 'SuperSecret1' });
    req.flush({ id: 6, username: 'new.person', role: 'Collaborator' });

    expect(navigate).toHaveBeenCalledWith(['/challenges']);
    httpMock.verify();
  });

  it('surfaces a taken username as an inline field error', () => {
    const fixture = TestBed.createComponent(SignUpComponent);

    fixture.componentInstance.form.setValue({ username: 'alex.kim', password: 'SuperSecret1' });
    fixture.componentInstance.onSubmit();

    httpMock.expectOne(signUpUrl).flush(
      { errors: { Username: ['That username is already taken.'] } },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(fixture.componentInstance.form.controls.username.hasError('server')).toBe(true);
    expect(fixture.componentInstance.serverErrors()).toEqual(['That username is already taken.']);
    httpMock.verify();
  });

  it('renders a non-username validation error in the template', () => {
    const fixture = TestBed.createComponent(SignUpComponent);

    fixture.componentInstance.form.setValue({ username: 'new.person', password: 'weakpass' });
    fixture.componentInstance.onSubmit();

    httpMock.expectOne(signUpUrl).flush(
      { errors: { Password: ['Password is too weak.'] } },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(fixture.componentInstance.serverErrors()).toEqual(['Password is too weak.']);

    fixture.detectChanges();
    const errorEl = fixture.nativeElement.querySelector('.auth-form__error');
    expect(errorEl?.textContent?.trim()).toBe('Password is too weak.');
    httpMock.verify();
  });
});
