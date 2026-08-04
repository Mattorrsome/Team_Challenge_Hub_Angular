import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { ThemeService } from './core/theme/theme.service';
import { AuthService } from './core/auth/auth.service';
import { environment } from '../environments/environment';

@Component({ standalone: true, template: 'dummy' })
class DummyComponent {}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: DummyComponent },
          { path: 'other', component: DummyComponent },
        ]),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.style.colorScheme = '';
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('clicking the header title navigates home', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    fixture.detectChanges();

    await router.navigateByUrl('/other');
    fixture.detectChanges();
    expect(location.path()).toBe('/other');

    const titleLink: HTMLAnchorElement = fixture.debugElement.query(
      By.css('.app-title'),
    ).nativeElement;
    titleLink.click();
    await fixture.whenStable();
    fixture.detectChanges();

    // Location.path() strips the base href, so the root route reads as '' —
    // NOT '/'. Asserting '/' here fails with "expected '' to be '/'".
    expect(location.path()).toBe('');
  });

  it('the header toggle button flips the theme', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const themeService = TestBed.inject(ThemeService);
    fixture.detectChanges();

    expect(themeService.theme()).toBe('light');

    const toggle: HTMLButtonElement = fixture.debugElement.query(
      By.css('.app-theme-toggle'),
    ).nativeElement;
    toggle.click();
    fixture.detectChanges();

    expect(themeService.theme()).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('shows a sign-in prompt and no username when signed out', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.app-username'))).toBe(null);
    expect(fixture.debugElement.query(By.css('.app-sign-out'))).toBe(null);
  });

  it('shows the username and hides the admin link for a collaborator', () => {
    const auth = TestBed.inject(AuthService);
    auth.signIn('jordan.patel', 'ChangeMe123!').subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiBaseUrl}/auth/signin`)
      .flush({ id: 2, username: 'jordan.patel', role: 'Collaborator' });

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('.app-username')).nativeElement.textContent,
    ).toContain('jordan.patel');
    expect(fixture.debugElement.query(By.css('.app-admin-link'))).toBe(null);
  });
});
