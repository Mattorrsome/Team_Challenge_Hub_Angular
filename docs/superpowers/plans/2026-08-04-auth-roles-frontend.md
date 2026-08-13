# Auth & Roles (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the user picker and self-reported `X-User-Id` header with
real sign-up/sign-in against the API's cookie session, guard every route, and
add an admin-only user-management view.

**Architecture:** A new `core/auth/` folder holds `AuthService` (a
`currentUser` signal fed by `GET /api/auth/me`), `authGuard`, and `adminGuard`.
`UserContextService`, `user-picker`, and `userIdInterceptor` are deleted; a
tiny `credentialsInterceptor` sets `withCredentials: true` on every request so
the HttpOnly cookie rides along. Two new form components (`sign-in`,
`sign-up`) and one admin view (`user-management`) join the feature folders.

**Tech Stack:** Angular 22 (standalone components, signals, functional
guards/interceptors), Angular Material, Vitest for unit tests, Playwright for
e2e.

## Global Constraints

- Repo: `C:\Projects\Team_Challenge_Hub_Planning\Team_Challenge_Hub_Angular`.
  Currently on `main`. **`angular.json` and `proxy.conf.json` have uncommitted
  modifications** — inspect them with `git diff` first and either commit them
  separately or keep them out of this plan's commits. Then create branch
  `feat/auth-roles` (`git checkout -b feat/auth-roles`).
- **The backend plan must land first**
  (`../../../Team_Challenge_Hub_API/docs/superpowers/plans/backend-plan.md`).
  Nothing here works against the old `X-User-Id` API.
- API contract this plan codes against (source of truth: the backend spec):
  - `POST /api/auth/signup` `{username, password}` → 200 `{id, username, role}`,
    already signed in; 400 with `{errors: {Username: [...]}}` if taken or the
    password is under 8 chars.
  - `POST /api/auth/signin` `{username, password}` → 200 `{id, username, role}`;
    **401** `{error}` on bad credentials.
  - `POST /api/auth/signout` → 204.
  - `GET /api/auth/me` → 200 `{id, username, role}` or **401** when there's no
    session.
  - `GET /api/users` → 200 `[{id, name, username, role}]`, admin-only (403 for
    a collaborator).
  - `DELETE /api/users/{id}` → 204, **409** when the user owns challenges.
  - `PUT /api/users/{id}/role` `{role}` → 200 `{id, name, username, role}`.
- `role` is exactly `'Collaborator' | 'Admin'`.
- Angular conventions (from CLAUDE.md): `.component.ts`/`.component.html`/
  `.component.scss` triad — no inline templates or styles; `standalone: true`;
  `inject()` for DI; `ChangeDetectionStrategy.OnPush`; typed inputs/outputs, no
  implicit `any`.
- Test runner is **Vitest**: `npm test -- --watch=false` (equivalently
  `ng test --watch=false`). Use Vitest matchers — `.toBe(true)`, never
  Jasmine's `toBeTrue()`. Don't pass `--include=...`.
- **No hardcoded hex colors in component SCSS.** Use Material system tokens:
  `var(--mat-sys-on-surface)`, `var(--mat-sys-on-surface-variant)`,
  `var(--mat-sys-outline-variant)`, `var(--mat-sys-primary)`,
  `var(--mat-sys-error)`. If no token fits, `light-dark(<light>, <dark>)`.
- No new npm dependencies.
- Generate components with `ng generate component <path> --style=scss` (legacy
  `.component` suffix style), then edit the generated files.

---

### Task 1: `AuthService` and the auth-user model

**Files:**
- Create: `src/app/core/auth/models/auth-user.model.ts`
- Create: `src/app/core/auth/auth.service.ts`
- Test: `src/app/core/auth/auth.service.spec.ts`

**Interfaces:**
- Produces: `type UserRole = 'Collaborator' | 'Admin'` and
  `interface AuthUser { id: number; username: string; role: UserRole }` from
  `core/auth/models/auth-user.model.ts`. Guards, components, and the admin
  view all import `UserRole` from here.
- Produces: `AuthService` with
  `currentUser: Signal<AuthUser | null>`,
  `isAdmin: Signal<boolean>`,
  `loadCurrentUser(): Observable<AuthUser | null>` (401 → `null`, never
  throws),
  `signIn(username, password): Observable<AuthUser>`,
  `signUp(username, password): Observable<AuthUser>`,
  `signOut(): Observable<void>`.

- [ ] **Step 1: Write the failing test**

Create `src/app/core/auth/auth.service.spec.ts`:

```ts
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
    service.signIn('alex.kim', 'wrong').subscribe({ error: (e) => (status = e.status) });
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — cannot resolve `./auth.service`.

- [ ] **Step 3: Add the model**

Create `src/app/core/auth/models/auth-user.model.ts`:

```ts
export type UserRole = 'Collaborator' | 'Admin';

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}
```

- [ ] **Step 4: Add the service**

Create `src/app/core/auth/auth.service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser } from './models/auth-user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private readonly user = signal<AuthUser | null>(null);

  readonly currentUser = this.user.asReadonly();
  readonly isAdmin = computed(() => this.user()?.role === 'Admin');

  /**
   * Resolves the session cookie to a user on app start. A 401 (no cookie, or
   * an expired one) is a normal outcome, not an error — it maps to null so the
   * app initializer never rejects and the guards simply redirect.
   */
  loadCurrentUser(): Observable<AuthUser | null> {
    return this.http.get<AuthUser>(`${this.baseUrl}/me`).pipe(
      catchError(() => of(null)),
      tap((user) => this.user.set(user)),
    );
  }

  signIn(username: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${this.baseUrl}/signin`, { username, password })
      .pipe(tap((user) => this.user.set(user)));
  }

  /** The API signs the new account in as part of signup, so the response body is the session user. */
  signUp(username: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${this.baseUrl}/signup`, { username, password })
      .pipe(tap((user) => this.user.set(user)));
  }

  signOut(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/signout`, {})
      .pipe(tap(() => this.user.set(null)));
  }

  /**
   * Drops the cached identity without calling the API — for when the server has
   * already invalidated the session (a 401 on any authenticated request), so the
   * guards and header stop trusting state the server has thrown away.
   */
  clearCurrentUser(): void {
    this.user.set(null);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS — 7 new `AuthService` tests, no other suite affected.

Post-review addendum: `clearCurrentUser()` was added after the initial
implementation (whole-branch review, 2026-08-04) — `errorHandlingInterceptor`'s
401 branch calls it so a redirect to `/sign-in` also drops the stale
`currentUser`, not just `signOut()`. See Task 2's Step 4.

- [ ] **Step 6: Commit**

```bash
git add src/app/core/auth
git commit -m "feat: add AuthService backed by the API session cookie"
```

---

### Task 2: Credentials interceptor, global 401 handling, app initializer

Swaps `userIdInterceptor` for `credentialsInterceptor`, resolves the session
before the first navigation, and redirects globally on an expired session.

**Files:**
- Create: `src/app/core/interceptors/credentials.interceptor.ts`
- Delete: `src/app/core/interceptors/user-id.interceptor.ts`
- Modify: `src/app/core/interceptors/error-handling.interceptor.ts`
- Modify: `src/app/app.config.ts`
- Test: `src/app/core/interceptors/credentials.interceptor.spec.ts`

**Interfaces:**
- Consumes: `AuthService.loadCurrentUser()` (Task 1).
- Produces: `credentialsInterceptor` — sets `withCredentials: true` on every
  outgoing request.
- Produces: `errorHandlingInterceptor` additionally redirects to `/sign-in` on
  a 401 for any URL that is **not** under `/auth/` (sign-in and `/auth/me`
  handle their own 401s), and skips its 409 snackbar for `/users/` URLs so the
  admin view can show a user-specific message (Task 6).
- Produces: `provideAppInitializer` in `app.config.ts` awaiting
  `loadCurrentUser()`, so `authGuard` sees a resolved `currentUser` on the
  first navigation instead of racing it.

- [ ] **Step 1: Write the failing test**

Create `src/app/core/interceptors/credentials.interceptor.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends every request with credentials so the session cookie rides along', () => {
    http.get('/api/challenges').subscribe();

    const req = httpMock.expectOne('/api/challenges');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — cannot resolve `./credentials.interceptor`.

- [ ] **Step 3: Add the credentials interceptor**

Create `src/app/core/interceptors/credentials.interceptor.ts`:

```ts
import { HttpInterceptorFn } from '@angular/common/http';

/**
 * The session is an HttpOnly cookie the browser only attaches when the request
 * opts into credentials. No token handling anywhere in application code.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));
```

- [ ] **Step 4: Handle 401 and scope the 409 snackbar**

Replace `src/app/core/interceptors/error-handling.interceptor.ts`:

```ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorHandlingInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const router = inject(Router);
  const auth = inject(AuthService);

  // /auth/me returns 401 when there's simply no session yet, and /auth/signin
  // returns 401 for bad credentials — both are handled by their callers.
  const isAuthCall = req.url.includes('/auth/');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthCall) {
        auth.clearCurrentUser();
        router.navigate(['/sign-in']);
      } else if (error.status === 409 && !req.url.includes('/users/')) {
        // /users/ 409s mean "that user still owns challenges" — the admin view
        // surfaces its own message for those.
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
```

Post-review addendum (whole-branch review, 2026-08-04): the API revalidates
the session on every request, so a stale `currentUser` signal after a 401
redirect let a deleted/demoted user's toolbar and route guards keep trusting
cached state the server had already discarded. `auth.clearCurrentUser()` was
added to the 401 branch above to fix that — see Task 1's `clearCurrentUser()`
addendum.

- [ ] **Step 5: Rewire `app.config.ts`**

Replace `src/app/app.config.ts`:

```ts
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { errorHandlingInterceptor } from './core/interceptors/error-handling.interceptor';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([credentialsInterceptor, errorHandlingInterceptor])),
    // Resolve the session before the first navigation, so authGuard reads a
    // settled currentUser instead of racing the /auth/me response.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).loadCurrentUser())),
  ],
};
```

- [ ] **Step 6: Delete the header interceptor**

```bash
git rm src/app/core/interceptors/user-id.interceptor.ts
```

(`UserContextService` itself still has one consumer — `challenge-list` — and
goes in Task 5.)

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- --watch=false`
Expected: PASS — including the new interceptor test. Existing suites are
unaffected (they configure their own providers, not `appConfig`).

- [ ] **Step 8: Commit**

```bash
git add -A src/app/core/interceptors src/app/app.config.ts
git commit -m "feat: send credentials on every request and resolve the session at startup"
```

---

### Task 3: Route guards

**Files:**
- Create: `src/app/core/auth/auth.guard.ts`
- Create: `src/app/core/auth/admin.guard.ts`
- Test: `src/app/core/auth/auth.guard.spec.ts`
- Test: `src/app/core/auth/admin.guard.spec.ts`

**Interfaces:**
- Consumes: `AuthService.currentUser` (Task 1).
- Produces: `authGuard: CanActivateFn` — `true` when signed in, otherwise a
  `UrlTree` for `/sign-in`.
- Produces: `adminGuard: CanActivateFn` — `true` when
  `currentUser()?.role === 'Admin'`, otherwise a `UrlTree` for `/challenges`.

- [ ] **Step 1: Write the failing tests**

Create `src/app/core/auth/auth.guard.spec.ts`:

```ts
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
```

Create `src/app/core/auth/admin.guard.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --watch=false`
Expected: FAIL — cannot resolve `./auth.guard` / `./admin.guard`.

- [ ] **Step 3: Add the guards**

Create `src/app/core/auth/auth.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  // currentUser is already resolved here: the app initializer awaits
  // /auth/me before the first navigation.
  return auth.currentUser() ? true : inject(Router).createUrlTree(['/sign-in']);
};
```

Create `src/app/core/auth/admin.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAdmin() ? true : inject(Router).createUrlTree(['/challenges']);
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --watch=false`
Expected: PASS — 4 new guard tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth
git commit -m "feat: add authGuard and adminGuard route guards"
```

---

### Task 4: Sign-in and sign-up components

**Files:**
- Create: `src/app/features/auth/sign-in/sign-in.component.{ts,html,scss}`
- Create: `src/app/features/auth/sign-up/sign-up.component.{ts,html,scss}`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/auth/sign-in/sign-in.component.spec.ts`
- Test: `src/app/features/auth/sign-up/sign-up.component.spec.ts`

**Interfaces:**
- Consumes: `AuthService.signIn`/`signUp` (Task 1), `authGuard` (Task 3).
- Produces: routes `/sign-in` and `/sign-up` (both **unguarded**), plus
  `authGuard` on every existing route. Both components navigate to
  `/challenges` on success.

- [ ] **Step 1: Generate the component skeletons**

```bash
npx ng generate component features/auth/sign-in --style=scss
npx ng generate component features/auth/sign-up --style=scss
```

- [ ] **Step 2: Write the failing tests**

Replace `src/app/features/auth/sign-in/sign-in.component.spec.ts`:

```ts
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
});
```

Replace `src/app/features/auth/sign-up/sign-up.component.spec.ts`:

```ts
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
    expect(fixture.componentInstance.serverErrors()).toEqual([]);

    // The username's own mat-error already shows this message inline — the
    // generic .auth-form__error block must not repeat it.
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    const errorEls = Array.from(nativeElement.querySelectorAll('.auth-form__error'));
    expect(
      errorEls.some((el) => el.textContent?.includes('That username is already taken.')),
    ).toBe(false);
    httpMock.verify();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- --watch=false`
Expected: FAIL — the generated components have no `form`, `onSubmit`,
`serverError`, or `serverErrors`.

- [ ] **Step 4: Implement the sign-in component**

Replace `src/app/features/auth/sign-in/sign-in.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  readonly serverError = signal<string | null>(null);

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError.set(null);
    const { username, password } = this.form.getRawValue();

    this.auth.signIn(username, password).subscribe({
      next: () => this.router.navigate(['/challenges']),
      error: (err: HttpErrorResponse) => {
        // Only a 401 means bad credentials. 5xx is already surfaced globally by
        // errorHandlingInterceptor — claiming "invalid password" there would lie.
        if (err.status !== 401) {
          return;
        }
        // The API deliberately doesn't say whether the username exists, so the
        // message stays generic. Inline, not a snackbar — same as other forms.
        this.serverError.set('Invalid username or password.');
      },
    });
  }
}
```

Replace `src/app/features/auth/sign-in/sign-in.component.html`:

```html
<form class="auth-form" [formGroup]="form" (ngSubmit)="onSubmit()">
  <h1 class="auth-form__title">Sign in</h1>

  <mat-form-field>
    <mat-label>Username</mat-label>
    <input matInput formControlName="username" autocomplete="username" />
    @if (form.controls.username.touched && form.controls.username.hasError('required')) {
      <mat-error>Username is required.</mat-error>
    }
  </mat-form-field>

  <mat-form-field>
    <mat-label>Password</mat-label>
    <input matInput type="password" formControlName="password" autocomplete="current-password" />
    @if (form.controls.password.touched && form.controls.password.hasError('required')) {
      <mat-error>Password is required.</mat-error>
    }
  </mat-form-field>

  @if (serverError()) {
    <p class="auth-form__error">{{ serverError() }}</p>
  }

  <button mat-flat-button type="submit">Sign in</button>

  <p class="auth-form__switch">
    No account yet? <a routerLink="/sign-up">Create one</a>
  </p>
</form>
```

Replace `src/app/features/auth/sign-in/sign-in.component.scss`:

```scss
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 22rem;
  margin: 3rem auto;
  padding: 0 1rem;

  &__title {
    margin: 0;
    color: var(--mat-sys-on-surface);
  }

  &__error {
    margin: 0;
    color: var(--mat-sys-error);
  }

  &__switch {
    margin: 0;
    color: var(--mat-sys-on-surface-variant);
  }
}
```

- [ ] **Step 5: Implement the sign-up component**

Replace `src/app/features/auth/sign-up/sign-up.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';

// ASP.NET Core's ValidationProblemDetails shape, same as challenge-form parses.
interface ValidationProblemDetails {
  errors?: Record<string, string[]>;
}

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly serverErrors = signal<string[]>([]);

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverErrors.set([]);
    const { username, password } = this.form.getRawValue();

    this.auth.signUp(username, password).subscribe({
      next: () => this.router.navigate(['/challenges']),
      error: (err: HttpErrorResponse) => this.handleServerError(err),
    });
  }

  private handleServerError(err: HttpErrorResponse): void {
    if (err.status !== 400) {
      return; // 5xx already surfaced globally by errorHandlingInterceptor.
    }

    const body = err.error as ValidationProblemDetails;
    const usernameErrors = body?.errors?.['Username'] ?? [];
    if (usernameErrors.length > 0) {
      this.form.controls.username.setErrors({ server: usernameErrors[0] });
    }

    // Everything without its own inline field error, so a username conflict
    // isn't rendered twice (once by the field's mat-error, once here).
    const otherErrors = body?.errors
      ? Object.entries(body.errors)
          .filter(([field]) => field !== 'Username')
          .flatMap(([, messages]) => messages)
      : ['Please check the form and try again.'];
    this.serverErrors.set(otherErrors);
  }
}
```

Replace `src/app/features/auth/sign-up/sign-up.component.html`:

```html
<form class="auth-form" [formGroup]="form" (ngSubmit)="onSubmit()">
  <h1 class="auth-form__title">Create an account</h1>

  <mat-form-field>
    <mat-label>Username</mat-label>
    <input matInput formControlName="username" autocomplete="username" />
    @if (form.controls.username.hasError('server')) {
      <mat-error>{{ form.controls.username.getError('server') }}</mat-error>
    } @else if (form.controls.username.touched && form.controls.username.hasError('required')) {
      <mat-error>Username is required.</mat-error>
    } @else if (form.controls.username.hasError('maxlength')) {
      <mat-error>Username must be 50 characters or fewer.</mat-error>
    }
  </mat-form-field>

  <mat-form-field>
    <mat-label>Password</mat-label>
    <input matInput type="password" formControlName="password" autocomplete="new-password" />
    @if (form.controls.password.touched && form.controls.password.hasError('required')) {
      <mat-error>Password is required.</mat-error>
    } @else if (form.controls.password.hasError('minlength')) {
      <mat-error>Password must be at least 8 characters.</mat-error>
    }
  </mat-form-field>

  @if (serverErrors().length > 0) {
    <p class="auth-form__error">{{ serverErrors()[0] }}</p>
  }

  <button mat-flat-button type="submit">Create account</button>

  <p class="auth-form__switch">
    Already have an account? <a routerLink="/sign-in">Sign in</a>
  </p>
</form>
```

Replace `src/app/features/auth/sign-up/sign-up.component.scss` with the same
content as `sign-in.component.scss` (Step 4) — the two forms share the
`.auth-form` block; duplicating ~20 lines of SCSS beats introducing a shared
partial for two consumers.

- [ ] **Step 6: Add the routes and guard the existing ones**

Replace `src/app/app.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'challenges', pathMatch: 'full' },
  {
    path: 'sign-in',
    loadComponent: () =>
      import('./features/auth/sign-in/sign-in.component').then((m) => m.SignInComponent),
  },
  {
    path: 'sign-up',
    loadComponent: () =>
      import('./features/auth/sign-up/sign-up.component').then((m) => m.SignUpComponent),
  },
  {
    path: 'challenges',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/challenge-list/challenge-list.component').then(
        (m) => m.ChallengeListComponent,
      ),
  },
  {
    path: 'challenges/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/challenge-form/challenge-form.component').then(
        (m) => m.ChallengeFormComponent,
      ),
    data: { mode: 'create' },
  },
  {
    path: 'challenges/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/challenge-form/challenge-form.component').then(
        (m) => m.ChallengeFormComponent,
      ),
    data: { mode: 'edit' },
  },
  {
    path: 'challenges/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/challenge-detail/challenge-detail.component').then(
        (m) => m.ChallengeDetailComponent,
      ),
  },
];
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- --watch=false`
Expected: PASS — 6 new component tests.

- [ ] **Step 8: Commit**

```bash
git add src/app/features/auth src/app/app.routes.ts
git commit -m "feat: add sign-in and sign-up screens with guarded routes"
```

---

### Task 5: Retire the user picker and user context

The app shell switches to showing the signed-in username with a sign-out
action; `challenge-list` scopes on the session user; `UserContextService` and
`user-picker` are deleted.

**Files:**
- Modify: `src/app/app.component.ts`
- Modify: `src/app/app.component.html`
- Modify: `src/app/app.component.spec.ts`
- Modify: `src/app/features/challenge-list/challenge-list.component.ts:8,39,47-50`
- Modify: `src/app/features/challenge-list/challenge-list.component.spec.ts`
- Delete: `src/app/features/user-picker/` (4 files)
- Delete: `src/app/core/user-context/` (2 files)

**Interfaces:**
- Consumes: `AuthService` (Task 1), `/sign-in` route (Task 4).
- Produces: `AppComponent.auth` (public, for the template) and
  `AppComponent.onSignOut()` — signs out, then navigates to `/sign-in`.
- Produces: the header exposes `.app-username`, `.app-sign-out`, and (admin
  only) `.app-admin-link`; Task 6 points that link at the admin route.

- [ ] **Step 1: Update the challenge-list test**

In `src/app/features/challenge-list/challenge-list.component.spec.ts`:

Replace the `UserContextService` import with:

```ts
import { AuthService } from '../../core/auth/auth.service';
```

Replace the `beforeEach` body's user setup — drop `userContext` entirely and
sign in through `AuthService`, flushing the sign-in response:

```ts
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    // Establish a signed-in user (id 1) before any component is created.
    TestBed.inject(AuthService).signIn('alex.kim', 'ChangeMe123!').subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/signin`)
      .flush({ id: 1, username: 'alex.kim', role: 'Admin' });
  });
```

Delete the `afterEach(() => localStorage.clear())` block (nothing writes to
`localStorage` any more) and **delete the whole
`'re-fetches for the new user when the acting user switches'` test** — user
switching is gone with the picker. Leave the other four tests as they are:
`'scopes the fetch to the current user'` still asserts `userId === '1'`, now
sourced from the session.

- [ ] **Step 2: Update the app-shell test**

In `src/app/app.component.spec.ts`, add these two tests inside the existing
`describe`:

```ts
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
```

Add the imports it needs at the top of the file:

```ts
import { HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './core/auth/auth.service';
import { environment } from '../environments/environment';
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- --watch=false`
Expected: FAIL — `.app-username` doesn't exist, and `challenge-list` still
injects the (now un-set) `UserContextService`, so no `userId` param is sent.

- [ ] **Step 4: Update the app shell**

Replace `src/app/app.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  onSignOut(): void {
    this.auth.signOut().subscribe({
      next: () => this.router.navigate(['/sign-in']),
      // A failed sign-out leaves the server session live, so staying put is the
      // honest outcome — navigating to /sign-in would claim we signed out when
      // we didn't. errorHandlingInterceptor already snackbars the 5xx.
      error: () => {},
    });
  }
}
```

Replace `src/app/app.component.html`:

```html
<mat-toolbar color="primary">
  <a class="app-title" routerLink="/">Team Challenge Hub</a>
  <span class="spacer"></span>
  <button
    class="app-theme-toggle"
    mat-icon-button
    type="button"
    [attr.aria-label]="
      themeService.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    "
    (click)="themeService.toggle()"
  >
    <mat-icon>{{ themeService.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
  </button>

  @if (auth.currentUser(); as user) {
    @if (auth.isAdmin()) {
      <a class="app-admin-link" mat-button routerLink="/admin/users">Users</a>
    }
    <span class="app-username">{{ user.username }}</span>
    <button class="app-sign-out" mat-button type="button" (click)="onSignOut()">Sign out</button>
  }
</mat-toolbar>

<router-outlet />
```

The old `@if (userContext.userId() === null)` shell-level branch is gone —
`authGuard` now sends unauthenticated visitors to `/sign-in`, so the outlet
always renders.

- [ ] **Step 5: Scope the challenge list on the session user**

In `src/app/features/challenge-list/challenge-list.component.ts`:

Replace the import:

```ts
import { UserContextService } from '../../core/user-context/user-context.service';
```

with:

```ts
import { AuthService } from '../../core/auth/auth.service';
```

Replace the injection:

```ts
  private readonly userContext = inject(UserContextService);
```

with:

```ts
  private readonly auth = inject(AuthService);
```

Replace the resource's filter callback and its comment:

```ts
  // Re-fetches whenever the signed-in user or the status filter changes. The
  // resource supersedes any in-flight request.
  private readonly challengesResource = this.challengeApi.challengesResource(() => ({
    status: this.statusFilter(),
    userId: this.auth.currentUser()?.id ?? null,
  }));
```

- [ ] **Step 6: Delete the picker and the user context**

```bash
git rm -r src/app/features/user-picker src/app/core/user-context
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- --watch=false`
Expected: PASS. If anything still fails to compile, check for leftover
`UserContextService` references:
Run: `npx tsc --noEmit -p tsconfig.spec.json`

- [ ] **Step 8: Commit**

```bash
git add -A src/app
git commit -m "feat: replace the user picker with the session identity"
```

---

### Task 6: Admin user-management view

**Files:**
- Modify: `src/app/core/models/user.model.ts`
- Modify: `src/app/core/services/user-api.service.ts`
- Create: `src/app/features/admin/user-management/user-management.component.{ts,html,scss}`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/admin/user-management/user-management.component.spec.ts`

**Interfaces:**
- Consumes: `UserRole` (Task 1), `adminGuard` (Task 3), the 409-snackbar
  exemption for `/users/` URLs (Task 2), the `.app-admin-link` pointing at
  `/admin/users` (Task 5).
- Produces: `interface User { id: number; name: string; username: string; role: UserRole }`.
- Produces: `UserApiService.getUsers(): Observable<User[]>` (unchanged
  signature, new payload shape), `deleteUser(id: number): Observable<void>`,
  `updateRole(id: number, role: UserRole): Observable<User>`.
- Produces: route `/admin/users`, guarded by `authGuard` **and** `adminGuard`.

- [ ] **Step 1: Generate the component skeleton**

```bash
npx ng generate component features/admin/user-management --style=scss
```

- [ ] **Step 2: Write the failing test**

Replace `src/app/features/admin/user-management/user-management.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';

import { UserManagementComponent } from './user-management.component';
import { environment } from '../../../../environments/environment';

describe('UserManagementComponent', () => {
  let httpMock: HttpTestingController;

  const usersUrl = `${environment.apiBaseUrl}/users`;
  const seeded = [
    { id: 1, name: 'Alex Kim', username: 'alex.kim', role: 'Admin' as const },
    { id: 2, name: 'Jordan Patel', username: 'jordan.patel', role: 'Collaborator' as const },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  const create = () => {
    const fixture = TestBed.createComponent(UserManagementComponent);
    httpMock.expectOne(usersUrl).flush(seeded);
    fixture.detectChanges();
    return fixture;
  };

  it('lists the users returned by the API', () => {
    const fixture = create();

    expect(fixture.componentInstance.users().length).toBe(2);
    httpMock.verify();
  });

  it('changing a role puts the new role and reloads', () => {
    const fixture = create();

    fixture.componentInstance.onRoleChange(seeded[1], 'Admin');

    const put = httpMock.expectOne(`${usersUrl}/2/role`);
    expect(put.request.body).toEqual({ role: 'Admin' });
    put.flush({ ...seeded[1], role: 'Admin' });

    httpMock.expectOne(usersUrl).flush(seeded);
    httpMock.verify();
  });

  it('deleting a user reloads the list', () => {
    const fixture = create();

    fixture.componentInstance.onDelete(seeded[1]);

    httpMock
      .expectOne(`${usersUrl}/2`)
      .flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne(usersUrl).flush([seeded[0]]);

    expect(fixture.componentInstance.users().length).toBe(1);
    httpMock.verify();
  });

  it('explains the block when deleting a user who owns challenges', () => {
    const fixture = create();
    const snackBar = TestBed.inject(MatSnackBar);
    const open = vi.spyOn(snackBar, 'open');

    fixture.componentInstance.onDelete(seeded[1]);

    httpMock.expectOne(`${usersUrl}/2`).flush(
      { error: 'That user still owns challenges. Remove those first.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(open).toHaveBeenCalled();
    expect(open.mock.calls[0][0]).toContain('challenges');
    expect(open.mock.calls[0][0]).toContain('jordan.patel');
    httpMock.verify();
  });

  it('shows a snackbar when deleting a user is forbidden', () => {
    const fixture = create();
    const snackBar = TestBed.inject(MatSnackBar);
    const open = vi.spyOn(snackBar, 'open');

    fixture.componentInstance.onDelete(seeded[1]);

    httpMock.expectOne(`${usersUrl}/2`).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(open).toHaveBeenCalled();
    httpMock.verify();
  });

  it('does not open a local snackbar for a 500 on delete', () => {
    const fixture = create();
    const snackBar = TestBed.inject(MatSnackBar);
    const open = vi.spyOn(snackBar, 'open');

    fixture.componentInstance.onDelete(seeded[1]);

    httpMock
      .expectOne(`${usersUrl}/2`)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(open).not.toHaveBeenCalled();
    httpMock.verify();
  });

  it('shows a snackbar and does not reload when a role change fails', () => {
    const fixture = create();
    const snackBar = TestBed.inject(MatSnackBar);
    const open = vi.spyOn(snackBar, 'open');

    fixture.componentInstance.onRoleChange(seeded[1], 'Admin');

    httpMock
      .expectOne(`${usersUrl}/2/role`)
      .flush(null, { status: 403, statusText: 'Forbidden' });

    expect(open).toHaveBeenCalled();
    httpMock.verify();
  });

  it('shows a snackbar and keeps the stale list when the reload fails', () => {
    const fixture = create();
    const snackBar = TestBed.inject(MatSnackBar);
    const open = vi.spyOn(snackBar, 'open');

    fixture.componentInstance.onDelete(seeded[1]);

    httpMock
      .expectOne(`${usersUrl}/2`)
      .flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne(usersUrl).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(open).toHaveBeenCalled();
    expect(fixture.componentInstance.users().length).toBe(2);
    httpMock.verify();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — the generated component has no `users`, `onRoleChange`, or
`onDelete`.

- [ ] **Step 4: Extend the user model and API service**

Replace `src/app/core/models/user.model.ts`:

```ts
import { UserRole } from '../auth/models/auth-user.model';

export interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
}
```

Replace `src/app/core/services/user-api.service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { UserRole } from '../auth/models/auth-user.model';

/** Every endpoint here is admin-only server-side (403 otherwise). */
@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  updateRole(id: number, role: UserRole): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}/role`, { role });
  }
}
```

- [ ] **Step 5: Implement the component**

Replace `src/app/features/admin/user-management/user-management.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserApiService } from '../../../core/services/user-api.service';
import { User } from '../../../core/models/user.model';
import { UserRole } from '../../../core/auth/models/auth-user.model';

const ROLES: UserRole[] = ['Collaborator', 'Admin'];

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagementComponent {
  private readonly userApi = inject(UserApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly roles = ROLES;
  readonly users = signal<User[]>([]);

  constructor() {
    this.reload();
  }

  onRoleChange(user: User, role: UserRole): void {
    if (role === user.role) return;
    this.userApi.updateRole(user.id, role).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) =>
        this.notifyFailure(err, `Could not change ${user.username}'s role.`),
    });
  }

  onDelete(user: User): void {
    this.userApi.deleteUser(user.id).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => {
        // The API blocks deleting an owner rather than cascading. The global
        // interceptor skips 409s on /users/ so this message wins.
        const message =
          err.status === 409
            ? `${user.username} still owns challenges — remove those first.`
            : `Could not delete ${user.username}.`;
        this.notifyFailure(err, message);
      },
    });
  }

  private reload(): void {
    this.userApi.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (err: HttpErrorResponse) => this.notifyFailure(err, 'Could not load users.'),
    });
  }

  /**
   * Surfaces failures the global interceptor deliberately leaves alone: it
   * redirects on 401 and snackbars 5xx, and skips 409 entirely for /users/
   * URLs so this view can speak for itself.
   */
  private notifyFailure(err: HttpErrorResponse, message: string): void {
    if (err.status === 401 || err.status >= 500) {
      return;
    }
    this.snackBar.open(message, 'Dismiss', { duration: 5000 });
  }
}
```

Replace `src/app/features/admin/user-management/user-management.component.html`:

```html
<section class="user-management">
  <h1 class="user-management__title">Users</h1>

  <ul class="user-management__list">
    @for (user of users(); track user.id) {
      <li class="user-management__row">
        <span class="user-management__username">{{ user.username }}</span>
        <span class="user-management__name">{{ user.name }}</span>

        <mat-form-field>
          <mat-label>Role</mat-label>
          <mat-select [value]="user.role" (valueChange)="onRoleChange(user, $event)">
            @for (role of roles; track role) {
              <mat-option [value]="role">{{ role }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <button mat-button type="button" (click)="onDelete(user)">Delete</button>
      </li>
    } @empty {
      <li class="user-management__row">No users.</li>
    }
  </ul>
</section>
```

Replace `src/app/features/admin/user-management/user-management.component.scss`:

```scss
.user-management {
  padding: 1.5rem;

  &__title {
    margin: 0 0 1rem;
    color: var(--mat-sys-on-surface);
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--mat-sys-outline-variant);
  }

  &__username {
    min-width: 10rem;
    color: var(--mat-sys-on-surface);
  }

  &__name {
    flex: 1;
    color: var(--mat-sys-on-surface-variant);
  }
}
```

- [ ] **Step 6: Add the guarded route**

In `src/app/app.routes.ts`, add the `adminGuard` import:

```ts
import { adminGuard } from './core/auth/admin.guard';
```

and add this route after the `challenges/:id` entry:

```ts
  {
    path: 'admin/users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/user-management/user-management.component').then(
        (m) => m.UserManagementComponent,
      ),
  },
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- --watch=false`
Expected: PASS — 8 new user-management tests, full suite green.

- [ ] **Step 8: Commit**

```bash
git add src/app
git commit -m "feat: add admin user-management view"
```

---

### Task 7: End-to-end flow and documentation

**Files:**
- Modify: `e2e/challenge-flow.spec.ts`
- Create: `e2e/auth-flow.spec.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything above. Needs the API running with the backend plan
  applied.

- [ ] **Step 1: Write the failing e2e test**

Create `e2e/auth-flow.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('sign up, create a challenge, sign out, sign back in, challenge persists', async ({ page }) => {
  // Unique per run: the dev database persists between runs.
  const username = `e2e.user.${Date.now()}`;
  const password = 'SuperSecret1';
  const title = `E2E challenge ${username}`;

  // Any route redirects to sign-in when unauthenticated.
  await page.goto('/challenges');
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByRole('link', { name: 'Create one' }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  // Landed on the list, scoped to this brand-new user — so it's empty.
  await expect(page).toHaveURL(/\/challenges$/);
  // A brand-new user's list is empty because the fetch is scoped to their id.
  // An unscoped list would show the seeded users' challenges instead.
  await expect(page.getByText('No challenges yet.')).toBeVisible();

  await page.getByRole('link', { name: 'New Challenge' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Raw notes').fill('Created by the auth e2e flow.');
  await page.getByRole('button', { name: 'Create Challenge' }).click();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/challenges$/);
  await expect(page.getByText(title)).toBeVisible();
});

test('a collaborator gets no admin link and is redirected away from /admin/users', async ({ page }) => {
  const username = `e2e.collab.${Date.now()}`;

  await page.goto('/sign-up');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('SuperSecret1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/challenges$/);

  // Wait for the toolbar to render before asserting the admin link's absence,
  // so a not-yet-painted nav can't make this pass for the wrong reason.
  await expect(page.locator('.app-username')).toHaveText(username);
  await expect(page.getByRole('link', { name: 'Users' })).toBeHidden();

  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/challenges$/);
});
```

- [ ] **Step 2: Update the existing e2e test's entry point**

In `e2e/challenge-flow.spec.ts`, replace the picker step:

```ts
  await page.goto('/');

  // Select the first seeded user from the picker.
  await page.getByRole('button').first().click();
```

with a sign-in as the seeded admin:

```ts
  await page.goto('/sign-in');
  await page.getByLabel('Username').fill('alex.kim');
  await page.getByLabel('Password').fill('ChangeMe123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/challenges$/);
```

- [ ] **Step 3: Run the e2e tests**

Start the API first (in the sibling repo, on the branch from the backend plan):

```bash
dotnet run --project src/TeamChallengeHub.Api --launch-profile https
```

Then, in this repo:
Run: `npm run e2e`
Expected: PASS — 3 tests. `playwright.config.ts` starts `ng serve` itself and
reuses an existing server.

Note: these tests write to the API's dev SQLite database, so the users and
challenges they create persist there.

- [ ] **Step 4: Update CLAUDE.md**

In `CLAUDE.md`:

Replace the `core/user-context/` line in the architecture tree with:

```
    auth/                # auth.service.ts, auth.guard.ts, admin.guard.ts, models/auth-user.model.ts
```

Add to the `features/` part of the tree:

```
    auth/
      sign-in/
      sign-up/
    admin/
      user-management/    # admin-only: list users, change role, delete
```

and remove the `user-picker/` entry if it is listed.

Replace the first bullet of the **Data flow** section:

```markdown
- No real auth. On load, a user picker (`GET /api/users`) selects an acting
  user, stored in `localStorage` and attached as `X-User-Id` on every request
  via an `HttpInterceptor`.
```

with:

```markdown
- Real credential auth. `AuthService` resolves the session via `GET
  /api/auth/me` in an app initializer before the first navigation; the session
  is an HttpOnly cookie, so `credentialsInterceptor` sets `withCredentials:
  true` on every request and no token is ever handled in application code.
  `authGuard` protects every route except `/sign-in` and `/sign-up`;
  `adminGuard` protects `/admin/users`. A 401 on any non-`/auth/` call
  redirects to `/sign-in`. Two roles: `Collaborator` (default) and `Admin` —
  only user management is role-gated.
```

In the **Scope boundaries** section, replace "real authentication/authorization"
in the out-of-scope list with "password reset, email verification, MFA, and
sign-in rate limiting".

- [ ] **Step 5: Verify the unit suite one last time**

Run: `npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e CLAUDE.md
git commit -m "test: cover the auth flow end to end"
```

---

## Deferred / accepted gaps

Not built here, per the spec: password reset, email verification, MFA, sign-in
rate limiting, and multi-session management. The sign-out button clears only
the current session's cookie.
