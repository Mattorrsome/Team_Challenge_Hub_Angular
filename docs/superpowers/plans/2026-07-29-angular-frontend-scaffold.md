# Team Challenge Hub Angular Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold and build the Angular frontend for Team Challenge Hub per `docs/specs/2026-07-27-frontend-design.md` — challenge list, create/edit form, AI-draft-assisted detail view (problem statement + solution options with human accept gate), status stepper, and a no-auth user picker.

**Architecture:** Standalone-component Angular 22 app, feature-folder structure (`core/`, `features/`, `shared/`), Angular Material for UI primitives, `HttpClient` + functional interceptors for the `X-User-Id` header and centralized error handling, Reactive Forms for input, Angular Router for navigation. No shared library with the backend — DTO shapes are duplicated here as TypeScript interfaces per the spec.

**Tech Stack:** Angular 22, Angular Material, Angular Router, Reactive Forms, SCSS, Jasmine/Karma, Playwright.

## Global Constraints

- Node.js must satisfy `^22.22.3 || ^24.15.0 || >=26.0.0` (Angular 22 requirement). Verified: this machine runs v26.5.0 — no upgrade needed.
- Standalone components only — no NgModules.
- Component class files use the legacy `.component` suffix (e.g. `challenge-list.component.ts`), generated via `ng generate component --style=scss` (not the newer suffix-less schematic).
- Every component gets separate `.component.ts` / `.component.html` / `.component.scss` files — no inline `template`/`styles`.
- One component per file/folder; folder name matches the component selector base.
- Services use `.service.ts`; models use `.model.ts` or plain `.ts` under `models/`; route config uses `.routes.ts`.
- Standalone components declare explicit `selector`, `standalone: true`, typed `@Input`/`@Output` — no implicit `any`.
- `inject()` for DI; `ChangeDetectionStrategy.OnPush` where feasible; strict TypeScript mode enabled.
- SCSS for styling; Angular Material for responsive, accessible UI primitives.
- AI draft endpoints (`draft-problem-statement`, `draft-solution-options`) are **read-only on the server** — their responses must always be routed through an editable field and an explicit "Accept & Save" action before any persisting call. Never wire a draft response directly to a persistence call.
- The status stepper never hardcodes transition rules — it calls `PUT /api/challenges/{id}/status` and only shows the buttons for transitions the data flow defines as stepper-driven (`InReview`, `Approved`, `Rejected`); the API is the source of truth and returns 409 on an invalid transition.
- Out of scope: real authentication, real-time collaboration, notifications/email, pagination (small demo dataset — lists load all challenges at once).
- Jasmine/Karma for component tests (Angular CLI default); Playwright for E2E.

## Cross-Repo Assumptions (flag if wrong once backend exists)

The companion backend (`../Team_Challenge_Hub_API`) is also pre-scaffold as of this plan — its exact JSON casing, draft-endpoint response shape, and dev port are not yet observable. This plan makes the following concrete assumptions; if the real backend differs, only `core/services/challenge-api.service.ts` and `core/models/*.ts` need to change (that's the whole point of isolating them there):

- JSON responses use camelCase property names (System.Text.Json default), matching the backend spec's field names verbatim (e.g. `rawNotes`, `problemStatement`, `submittedByUserId`).
- `ChallengeStatus` is serialized as its **string name** (e.g. `"Submitted"`), not a numeric enum index. If the real backend sends numeric enums, only the `ChallengeStatus` type and any mapping in `challenge-api.service.ts` need updating.
- `POST .../draft-problem-statement` returns `{ text: string }`.
- `POST .../draft-solution-options` returns `{ options: string[] }`.
- `PUT .../options/{optionId}/select` and `PUT .../status` both return the updated `Challenge` (including its `options`).
- The backend's dev HTTPS port is unknown until it's scaffolded. `proxy.conf.json` (Task 1) targets a placeholder — update it to the real port once `Team_Challenge_Hub_API/Properties/launchSettings.json` exists.

---

## Task 1: Scaffold Angular Project, Material, and Dev Proxy

**Files:**
- Create: entire Angular CLI workspace at repo root (`angular.json`, `package.json`, `tsconfig*.json`, `src/`)
- Create: `proxy.conf.json`
- Modify: `package.json` (start script to use proxy)
- Create: `src/environments/environment.ts`, `src/environments/environment.development.ts`

**Interfaces:**
- Produces: `environment.apiBaseUrl: string` — consumed by all API services from Task 5 onward.

- [ ] **Step 1: Verify Node version**

Run: `node --version`
Expected: `v26.5.0` (already verified — satisfies `>=26.0.0`). If a different machine reports an older LTS, upgrade Node before continuing.

- [ ] **Step 2: Scaffold the workspace into the current (non-empty) repo directory**

Run:
```bash
ng new team-challenge-hub-angular --directory=. --style=scss --standalone --routing --skip-git --package-manager=npm
```
Expected: Angular CLI creates `angular.json`, `package.json`, `src/app/app.ts` (root component), `src/app/app.routes.ts`, `src/app/app.config.ts`, etc. alongside the existing `docs/`, `CLAUDE.md`, `.claude/`, `.codegraph/`. `--skip-git` prevents it from creating a nested repo or auto-committing (this repo already has git history).

- [ ] **Step 3: Rename the generated root component files to match project convention**

The CLI's newest default names the root component `app.ts`/`app.html`/`app.css` (no `.component` suffix, no scss). Rename to match this project's `.component` convention:
```bash
mv src/app/app.ts src/app/app.component.ts
mv src/app/app.html src/app/app.component.html
mv src/app/app.css src/app/app.component.scss
```
Update `src/app/app.component.ts`: fix the `templateUrl`/`styleUrl` paths to `./app.component.html` / `./app.component.scss`, and rename the exported class if the CLI generated it as `App` instead of `AppComponent`. Also update the bootstrap import in `src/main.ts` to reference `AppComponent` from `./app/app.component`.

- [ ] **Step 4: Add Angular Material**

Run:
```bash
ng add @angular/material
```
When prompted: choose any Material 3 theme (e.g. Azure/Blue), **Yes** to global typography styles, **Yes** to browser animations. This wires `provideAnimationsAsync()` (or equivalent) into `app.config.ts` and adds the Material theme import to `src/styles.scss`.

- [ ] **Step 5: Generate environment files**

Run:
```bash
ng generate environments
```

Edit `src/environments/environment.ts` (production):
```typescript
export const environment = {
  production: true,
  apiBaseUrl: '/api',
};
```

Edit `src/environments/environment.development.ts`:
```typescript
export const environment = {
  production: false,
  apiBaseUrl: '/api',
};
```
Both point at the relative `/api` path — the dev proxy (next step) forwards it to the real backend so the same relative URL works in dev and in a same-origin production deployment.

- [ ] **Step 6: Add a dev proxy for the backend**

Create `proxy.conf.json`:
```json
{
  "/api": {
    "target": "https://localhost:5443",
    "secure": false,
    "changeOrigin": true
  }
}
```
This target port is a placeholder (`Team_Challenge_Hub_API` isn't scaffolded yet) — update it once the backend's real Kestrel dev port is known (check its `Properties/launchSettings.json`).

Edit `angular.json`: under `projects.team-challenge-hub-angular.architect.serve.options`, add:
```json
"proxyConfig": "proxy.conf.json"
```

- [ ] **Step 7: Verify the app builds and serves**

Run: `npm run build`
Expected: build succeeds with no errors.

Run: `npx ng serve` (Ctrl+C after confirming it compiles)
Expected: `Application bundle generation complete` and a listening port, no compile errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Angular 22 workspace with Material and dev proxy"
```

---

## Task 2: Core Models

**Files:**
- Create: `src/app/core/models/user.model.ts`
- Create: `src/app/core/models/challenge.model.ts`
- Create: `src/app/core/models/solution-option.model.ts`

**Interfaces:**
- Produces: `User`, `Challenge`, `SolutionOption`, `ChallengeStatus`, `CreateChallengeRequest`, `UpdateChallengeRequest`, `DraftProblemStatementResponse`, `DraftSolutionOptionsResponse` — consumed by every service and component from Task 3 onward.

- [ ] **Step 1: Create the User model**

`src/app/core/models/user.model.ts`:
```typescript
export interface User {
  id: number;
  name: string;
}
```

- [ ] **Step 2: Create the SolutionOption model**

`src/app/core/models/solution-option.model.ts`:
```typescript
export interface SolutionOption {
  id: number;
  challengeId: number;
  text: string;
  isSelected: boolean;
  createdAt: string;
}
```

- [ ] **Step 3: Create the Challenge model, status enum, and request/response DTOs**

`src/app/core/models/challenge.model.ts`:
```typescript
import { SolutionOption } from './solution-option.model';

export type ChallengeStatus =
  | 'Submitted'
  | 'ProblemStatementDrafted'
  | 'OptionsDrafted'
  | 'OptionSelected'
  | 'InReview'
  | 'Approved'
  | 'Rejected';

export interface Challenge {
  id: number;
  title: string;
  rawNotes: string;
  problemStatement: string | null;
  status: ChallengeStatus;
  submittedByUserId: number;
  createdAt: string;
  updatedAt: string;
  options: SolutionOption[];
}

export interface CreateChallengeRequest {
  title: string;
  rawNotes: string;
}

export interface UpdateChallengeRequest {
  title: string;
  problemStatement: string | null;
}

export interface DraftProblemStatementResponse {
  text: string;
}

export interface DraftSolutionOptionsResponse {
  options: string[];
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/models
git commit -m "feat: add core DTO models mirroring backend contract"
```

---

## Task 3: User Context Service

**Files:**
- Create: `src/app/core/user-context/user-context.service.ts`
- Test: `src/app/core/user-context/user-context.service.spec.ts` (CLI-generated smoke test, kept as-is)

**Interfaces:**
- Consumes: nothing.
- Produces: `UserContextService` with `userId: Signal<number | null>`, `setUser(id: number): void`, `clearUser(): void` — consumed by the `userIdInterceptor` (Task 4) and the user-picker component (Task 7).

- [ ] **Step 1: Generate the service**

Run:
```bash
ng generate service core/user-context/user-context --skip-tests=false
```

- [ ] **Step 2: Implement localStorage-backed signal state**

`src/app/core/user-context/user-context.service.ts`:
```typescript
import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'tch_current_user_id';

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private readonly currentUserId = signal<number | null>(this.readStoredUserId());

  readonly userId = this.currentUserId.asReadonly();

  setUser(id: number): void {
    localStorage.setItem(STORAGE_KEY, String(id));
    this.currentUserId.set(id);
  }

  clearUser(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.currentUserId.set(null);
  }

  private readStoredUserId(): number | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  }
}
```

- [ ] **Step 3: Run the generated smoke test**

Run: `ng test --include='**/user-context.service.spec.ts' --watch=false`
Expected: PASS (`should be created`).

- [ ] **Step 4: Commit**

```bash
git add src/app/core/user-context
git commit -m "feat: add localStorage-backed user context service"
```

---

## Task 4: HTTP Interceptors

**Files:**
- Create: `src/app/core/interceptors/user-id.interceptor.ts`
- Create: `src/app/core/interceptors/error-handling.interceptor.ts`
- Modify: `src/app/app.config.ts`

**Interfaces:**
- Consumes: `UserContextService.userId` (Task 3).
- Produces: registered interceptors — every subsequent `HttpClient` call from Task 5 onward automatically carries `X-User-Id` and gets centralized 409/5xx handling.

- [ ] **Step 1: Write the X-User-Id interceptor**

`src/app/core/interceptors/user-id.interceptor.ts`:
```typescript
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
```

- [ ] **Step 2: Write the error-handling interceptor**

`src/app/core/interceptors/error-handling.interceptor.ts`:
```typescript
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorHandlingInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 409) {
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

- [ ] **Step 3: Register both interceptors**

Edit `src/app/app.config.ts` — find the existing `provideHttpClient(...)` call added by `ng new --routing` (or add it if missing) and wire the interceptors:
```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { userIdInterceptor } from './core/interceptors/user-id.interceptor';
import { errorHandlingInterceptor } from './core/interceptors/error-handling.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([userIdInterceptor, errorHandlingInterceptor])),
  ],
};
```
(Keep whatever Material/animations provider `ng add @angular/material` already inserted in Task 1 — only add/merge the `provideHttpClient` line.)

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/interceptors src/app/app.config.ts
git commit -m "feat: add X-User-Id and error-handling HTTP interceptors"
```

---

## Task 5: User API Service

**Files:**
- Create: `src/app/core/services/user-api.service.ts`
- Test: `src/app/core/services/user-api.service.spec.ts` (CLI-generated smoke test, kept as-is)

**Interfaces:**
- Consumes: `User` model (Task 2), `environment.apiBaseUrl` (Task 1).
- Produces: `UserApiService.getUsers(): Observable<User[]>` — consumed by the user-picker component (Task 7).

- [ ] **Step 1: Generate the service**

Run:
```bash
ng generate service core/services/user-api --skip-tests=false
```

- [ ] **Step 2: Implement it**

`src/app/core/services/user-api.service.ts`:
```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl);
  }
}
```

- [ ] **Step 3: Run the generated smoke test**

Run: `ng test --include='**/user-api.service.spec.ts' --watch=false`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/core/services/user-api.service.ts src/app/core/services/user-api.service.spec.ts
git commit -m "feat: add user API service"
```

---

## Task 6: Challenge API Service

**Files:**
- Create: `src/app/core/services/challenge-api.service.ts`
- Test: `src/app/core/services/challenge-api.service.spec.ts` (CLI-generated smoke test, kept as-is)

**Interfaces:**
- Consumes: `Challenge`, `ChallengeStatus`, `CreateChallengeRequest`, `UpdateChallengeRequest`, `DraftProblemStatementResponse`, `DraftSolutionOptionsResponse`, `SolutionOption` (Task 2), `environment.apiBaseUrl` (Task 1).
- Produces: `ChallengeApiService` with methods below — consumed by challenge-list (Task 8), challenge-form (Task 9), status-stepper (Task 10), problem-statement-panel (Task 11), solution-options-panel (Task 12), challenge-detail (Task 13).

- [ ] **Step 1: Generate the service**

Run:
```bash
ng generate service core/services/challenge-api --skip-tests=false
```

- [ ] **Step 2: Implement it**

`src/app/core/services/challenge-api.service.ts`:
```typescript
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Challenge,
  ChallengeStatus,
  CreateChallengeRequest,
  DraftProblemStatementResponse,
  DraftSolutionOptionsResponse,
  UpdateChallengeRequest,
} from '../models/challenge.model';
import { SolutionOption } from '../models/solution-option.model';

@Injectable({ providedIn: 'root' })
export class ChallengeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/challenges`;

  getChallenges(status?: ChallengeStatus): Observable<Challenge[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Challenge[]>(this.baseUrl, { params });
  }

  getChallenge(id: number): Observable<Challenge> {
    return this.http.get<Challenge>(`${this.baseUrl}/${id}`);
  }

  createChallenge(request: CreateChallengeRequest): Observable<Challenge> {
    return this.http.post<Challenge>(this.baseUrl, request);
  }

  updateChallenge(id: number, request: UpdateChallengeRequest): Observable<Challenge> {
    return this.http.put<Challenge>(`${this.baseUrl}/${id}`, request);
  }

  draftProblemStatement(id: number): Observable<DraftProblemStatementResponse> {
    return this.http.post<DraftProblemStatementResponse>(
      `${this.baseUrl}/${id}/draft-problem-statement`,
      {},
    );
  }

  draftSolutionOptions(id: number): Observable<DraftSolutionOptionsResponse> {
    return this.http.post<DraftSolutionOptionsResponse>(
      `${this.baseUrl}/${id}/draft-solution-options`,
      {},
    );
  }

  addOption(challengeId: number, text: string): Observable<SolutionOption> {
    return this.http.post<SolutionOption>(`${this.baseUrl}/${challengeId}/options`, { text });
  }

  selectOption(challengeId: number, optionId: number): Observable<Challenge> {
    return this.http.put<Challenge>(
      `${this.baseUrl}/${challengeId}/options/${optionId}/select`,
      {},
    );
  }

  updateStatus(challengeId: number, status: ChallengeStatus): Observable<Challenge> {
    return this.http.put<Challenge>(`${this.baseUrl}/${challengeId}/status`, { status });
  }
}
```

- [ ] **Step 3: Run the generated smoke test**

Run: `ng test --include='**/challenge-api.service.spec.ts' --watch=false`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/core/services/challenge-api.service.ts src/app/core/services/challenge-api.service.spec.ts
git commit -m "feat: add challenge API service"
```

---

## Task 7: App Shell, User Picker, and Routing

**Files:**
- Create: `src/app/features/user-picker/user-picker.component.{ts,html,scss}`
- Modify: `src/app/app.component.{ts,html,scss}`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `UserApiService.getUsers()` (Task 5), `UserContextService` (Task 3), `User` model (Task 2).
- Produces: app shell that gates the router-outlet behind a selected user; route paths `/challenges`, `/challenges/new`, `/challenges/:id`, `/challenges/:id/edit` referenced by every feature component's `routerLink` from Task 8 onward.

- [ ] **Step 1: Generate the user-picker component**

Run:
```bash
ng generate component features/user-picker --style=scss
```

- [ ] **Step 2: Implement the user-picker component**

`src/app/features/user-picker/user-picker.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { UserApiService } from '../../core/services/user-api.service';
import { UserContextService } from '../../core/user-context/user-context.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-user-picker',
  standalone: true,
  imports: [],
  templateUrl: './user-picker.component.html',
  styleUrl: './user-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPickerComponent implements OnInit {
  private readonly userApi = inject(UserApiService);
  readonly userContext = inject(UserContextService);

  readonly users = signal<User[]>([]);

  ngOnInit(): void {
    this.userApi.getUsers().subscribe((users) => this.users.set(users));
  }

  selectUser(id: number): void {
    this.userContext.setUser(id);
  }
}
```
Add `MatButtonModule`, `MatCardModule`, `MatIconModule` to `imports` if used in the template below.

`src/app/features/user-picker/user-picker.component.html`:
```html
@if (userContext.userId() === null) {
  <div class="user-picker">
    <h2>Who's working today?</h2>
    <div class="user-picker__list">
      @for (user of users(); track user.id) {
        <button mat-stroked-button (click)="selectUser(user.id)">{{ user.name }}</button>
      }
    </div>
  </div>
} @else {
  <button mat-button (click)="userContext.clearUser()">
    Switch user
  </button>
}
```

`src/app/features/user-picker/user-picker.component.scss`:
```scss
.user-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;

  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }
}
```
Import `MatButtonModule` in the component's `imports` array (`import { MatButtonModule } from '@angular/material/button';`).

- [ ] **Step 3: Define routes**

`src/app/app.routes.ts`:
```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'challenges', pathMatch: 'full' },
  {
    path: 'challenges',
    loadComponent: () =>
      import('./features/challenge-list/challenge-list.component').then(
        (m) => m.ChallengeListComponent,
      ),
  },
  {
    path: 'challenges/new',
    loadComponent: () =>
      import('./features/challenge-form/challenge-form.component').then(
        (m) => m.ChallengeFormComponent,
      ),
    data: { mode: 'create' },
  },
  {
    path: 'challenges/:id/edit',
    loadComponent: () =>
      import('./features/challenge-form/challenge-form.component').then(
        (m) => m.ChallengeFormComponent,
      ),
    data: { mode: 'edit' },
  },
  {
    path: 'challenges/:id',
    loadComponent: () =>
      import('./features/challenge-detail/challenge-detail.component').then(
        (m) => m.ChallengeDetailComponent,
      ),
  },
];
```
(These lazy-loaded components don't exist until Tasks 8, 9, and 13 — the app won't fully build until then. That's expected; Step 5 below only checks that the shell itself compiles in isolation is not possible with dangling imports, so full verification of this task happens implicitly once Task 8's list route exists. Note this dependency and move on — do not stub fake components.)

- [ ] **Step 4: Wire the app shell**

`src/app/app.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { UserPickerComponent } from './features/user-picker/user-picker.component';
import { UserContextService } from './core/user-context/user-context.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatToolbarModule, UserPickerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly userContext = inject(UserContextService);
}
```

`src/app/app.component.html`:
```html
<mat-toolbar color="primary">
  <span>Team Challenge Hub</span>
  <span class="spacer"></span>
  <app-user-picker />
</mat-toolbar>

@if (userContext.userId() !== null) {
  <router-outlet />
}
```

`src/app/app.component.scss`:
```scss
.spacer {
  flex: 1 1 auto;
}
```

- [ ] **Step 5: Note build status**

This task alone will not produce a green `npm run build` because `app.routes.ts` references components created in later tasks. That's expected in this incremental plan — full build verification happens at the end of Task 9 (once list, form components exist) and finally Task 13. Do not create placeholder/stub components to force an early green build; that would violate the "no placeholders" rule and create throwaway code the later tasks would have to delete.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/user-picker src/app/app.component.ts src/app/app.component.html src/app/app.component.scss src/app/app.routes.ts
git commit -m "feat: add app shell, user picker, and route table"
```

---

## Task 8: Status Badge and Challenge List

**Files:**
- Create: `src/app/shared/status-badge/status-badge.component.{ts,html,scss}`
- Create: `src/app/features/challenge-list/challenge-list.component.{ts,html,scss}`

**Interfaces:**
- Consumes: `ChallengeApiService.getChallenges()` (Task 6), `Challenge`/`ChallengeStatus` models (Task 2).
- Produces: `StatusBadgeComponent` with `@Input({required: true}) status!: ChallengeStatus` — reused by challenge-detail (Task 13). `ChallengeListComponent` is the `/challenges` route target from Task 7.

- [ ] **Step 1: Generate both components**

Run:
```bash
ng generate component shared/status-badge --style=scss
ng generate component features/challenge-list --style=scss
```

- [ ] **Step 2: Implement the status badge**

`src/app/shared/status-badge/status-badge.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { ChallengeStatus } from '../../core/models/challenge.model';

const LABELS: Record<ChallengeStatus, string> = {
  Submitted: 'Submitted',
  ProblemStatementDrafted: 'Problem Statement Drafted',
  OptionsDrafted: 'Options Drafted',
  OptionSelected: 'Option Selected',
  InReview: 'In Review',
  Approved: 'Approved',
  Rejected: 'Rejected',
};

const CSS_CLASSES: Record<ChallengeStatus, string> = {
  Submitted: 'status-badge--neutral',
  ProblemStatementDrafted: 'status-badge--info',
  OptionsDrafted: 'status-badge--info',
  OptionSelected: 'status-badge--warning',
  InReview: 'status-badge--warning',
  Approved: 'status-badge--success',
  Rejected: 'status-badge--danger',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  private readonly statusSignal = signal<ChallengeStatus>('Submitted');

  @Input({ required: true })
  set status(value: ChallengeStatus) {
    this.statusSignal.set(value);
  }

  readonly label = computed(() => LABELS[this.statusSignal()]);
  readonly cssClass = computed(() => CSS_CLASSES[this.statusSignal()]);
}
```

`src/app/shared/status-badge/status-badge.component.html`:
```html
<span class="status-badge" [ngClass]="cssClass()">{{ label() }}</span>
```
Add `import { NgClass } from '@angular/common';` and include `NgClass` in the component's `imports` array.

`src/app/shared/status-badge/status-badge.component.scss`:
```scss
.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;

  &--neutral { background: #e0e0e0; color: #424242; }
  &--info { background: #bbdefb; color: #0d47a1; }
  &--warning { background: #ffe0b2; color: #e65100; }
  &--success { background: #c8e6c9; color: #1b5e20; }
  &--danger { background: #ffcdd2; color: #b71c1c; }
}
```

- [ ] **Step 3: Implement the challenge list component**

`src/app/features/challenge-list/challenge-list.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChallengeApiService } from '../../core/services/challenge-api.service';
import { Challenge, ChallengeStatus } from '../../core/models/challenge.model';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

const ALL_STATUSES: ChallengeStatus[] = [
  'Submitted',
  'ProblemStatementDrafted',
  'OptionsDrafted',
  'OptionSelected',
  'InReview',
  'Approved',
  'Rejected',
];

@Component({
  selector: 'app-challenge-list',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    StatusBadgeComponent,
  ],
  templateUrl: './challenge-list.component.html',
  styleUrl: './challenge-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengeListComponent implements OnInit {
  private readonly challengeApi = inject(ChallengeApiService);

  readonly statuses = ALL_STATUSES;
  readonly challenges = signal<Challenge[]>([]);
  readonly loading = signal(true);
  readonly statusFilter = signal<ChallengeStatus | null>(null);

  ngOnInit(): void {
    this.load();
  }

  onFilterChange(status: ChallengeStatus | null): void {
    this.statusFilter.set(status);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.challengeApi.getChallenges(this.statusFilter() ?? undefined).subscribe((challenges) => {
      this.challenges.set(challenges);
      this.loading.set(false);
    });
  }
}
```

`src/app/features/challenge-list/challenge-list.component.html`:
```html
<div class="challenge-list">
  <div class="challenge-list__header">
    <mat-select
      placeholder="Filter by status"
      [value]="statusFilter()"
      (selectionChange)="onFilterChange($event.value)"
    >
      <mat-option [value]="null">All statuses</mat-option>
      @for (status of statuses; track status) {
        <mat-option [value]="status">{{ status }}</mat-option>
      }
    </mat-select>
    <a mat-raised-button color="primary" routerLink="/challenges/new">New Challenge</a>
  </div>

  @if (loading()) {
    <mat-spinner diameter="32" />
  } @else if (challenges().length === 0) {
    <p class="challenge-list__empty">No challenges yet.</p>
  } @else {
    <div class="challenge-list__grid">
      @for (challenge of challenges(); track challenge.id) {
        <a class="challenge-list__card-link" [routerLink]="['/challenges', challenge.id]">
          <mat-card>
            <mat-card-title>{{ challenge.title }}</mat-card-title>
            <mat-card-content>
              <app-status-badge [status]="challenge.status" />
            </mat-card-content>
          </mat-card>
        </a>
      }
    </div>
  }
</div>
```

`src/app/features/challenge-list/challenge-list.component.scss`:
```scss
.challenge-list {
  padding: 1rem;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
  }

  &__card-link {
    text-decoration: none;
    color: inherit;
  }

  &__empty {
    color: #757575;
  }

  @media (max-width: 600px) {
    &__grid {
      grid-template-columns: 1fr;
    }
  }
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: still fails only on the missing `challenge-form` and `challenge-detail` imports in `app.routes.ts` (Tasks 9 and 13) — no other errors. Confirm the error output names only those two missing modules.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/status-badge src/app/features/challenge-list
git commit -m "feat: add status badge and challenge list view"
```

---

## Task 9: Challenge Form (Create/Edit)

**Files:**
- Create: `src/app/features/challenge-form/challenge-form.component.{ts,html,scss}`
- Test: `src/app/features/challenge-form/challenge-form.component.spec.ts`

**Interfaces:**
- Consumes: `ChallengeApiService.createChallenge()`, `.updateChallenge()`, `.getChallenge()` (Task 6), `CreateChallengeRequest`/`UpdateChallengeRequest`/`Challenge` models (Task 2), route `data.mode` and `paramMap.id` (Task 7).
- Produces: `ChallengeFormComponent` with `@Output() formSubmit = new EventEmitter<CreateChallengeRequest>()` — this is what Step 1's test observes.

- [ ] **Step 1: Write the failing component test**

Run:
```bash
ng generate component features/challenge-form --style=scss
```

Replace `src/app/features/challenge-form/challenge-form.component.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ChallengeFormComponent } from './challenge-form.component';

describe('ChallengeFormComponent', () => {
  let fixture: ComponentFixture<ChallengeFormComponent>;
  let component: ChallengeFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeFormComponent, ReactiveFormsModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { mode: 'create' }, paramMap: { get: () => null } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChallengeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not emit when required fields are empty', () => {
    const emitted: unknown[] = [];
    component.formSubmit.subscribe((value) => emitted.push(value));

    component.onSubmit();

    expect(emitted.length).toBe(0);
    expect(component.form.invalid).toBeTrue();
  });

  it('emits the correct payload on valid submit', () => {
    const emitted: unknown[] = [];
    component.formSubmit.subscribe((value) => emitted.push(value));

    component.form.setValue({ title: 'Improve deploy pipeline', rawNotes: 'Deploys take too long.' });
    component.onSubmit();

    expect(emitted).toEqual([
      { title: 'Improve deploy pipeline', rawNotes: 'Deploys take too long.' },
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `ng test --include='**/challenge-form.component.spec.ts' --watch=false`
Expected: FAIL — `ChallengeFormComponent` doesn't yet have a `form` property, `formSubmit` output, or `onSubmit()` method (compile error).

- [ ] **Step 3: Implement the component**

`src/app/features/challenge-form/challenge-form.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ChallengeApiService } from '../../core/services/challenge-api.service';
import { Challenge, CreateChallengeRequest } from '../../core/models/challenge.model';

type FormMode = 'create' | 'edit';

// ASP.NET Core's default validation failure body shape
// (ValidationProblemDetails) — assumption, adjust once the real API responds.
interface ValidationProblemDetails {
  errors?: Record<string, string[]>;
}

@Component({
  selector: 'app-challenge-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './challenge-form.component.html',
  styleUrl: './challenge-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly challengeApi = inject(ChallengeApiService);

  @Output() formSubmit = new EventEmitter<CreateChallengeRequest>();

  readonly mode = signal<FormMode>('create');
  private editingChallenge: Challenge | null = null;

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    rawNotes: ['', Validators.required],
  });

  readonly serverErrors = signal<string[]>([]);

  ngOnInit(): void {
    const mode = (this.route.snapshot.data['mode'] as FormMode) ?? 'create';
    this.mode.set(mode);

    if (mode === 'edit') {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.form.controls.rawNotes.disable();
      this.challengeApi.getChallenge(id).subscribe((challenge) => {
        this.editingChallenge = challenge;
        this.form.patchValue({ title: challenge.title, rawNotes: challenge.rawNotes });
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverErrors.set([]);
    const { title, rawNotes } = this.form.getRawValue();

    if (this.mode() === 'edit' && this.editingChallenge) {
      this.challengeApi
        .updateChallenge(this.editingChallenge.id, {
          title,
          problemStatement: this.editingChallenge.problemStatement,
        })
        .subscribe({
          next: (challenge) => this.router.navigate(['/challenges', challenge.id]),
          error: (err: HttpErrorResponse) => this.handleServerError(err),
        });
      return;
    }

    const payload: CreateChallengeRequest = { title, rawNotes };
    this.formSubmit.emit(payload);
    this.challengeApi.createChallenge(payload).subscribe({
      next: (challenge) => this.router.navigate(['/challenges', challenge.id]),
      error: (err: HttpErrorResponse) => this.handleServerError(err),
    });
  }

  private handleServerError(err: HttpErrorResponse): void {
    if (err.status !== 400) {
      return; // 409/5xx already surfaced globally by errorHandlingInterceptor.
    }
    const body = err.error as ValidationProblemDetails;
    const messages = body?.errors ? Object.values(body.errors).flat() : ['Please check the form and try again.'];
    this.serverErrors.set(messages);
  }
}
```

`src/app/features/challenge-form/challenge-form.component.html`:
```html
<form class="challenge-form" [formGroup]="form" (ngSubmit)="onSubmit()">
  <mat-form-field appearance="outline">
    <mat-label>Title</mat-label>
    <input matInput formControlName="title" />
    @if (form.controls.title.invalid && form.controls.title.touched) {
      <mat-error>Title is required.</mat-error>
    }
  </mat-form-field>

  <mat-form-field appearance="outline">
    <mat-label>Raw notes</mat-label>
    <textarea matInput formControlName="rawNotes" rows="6"></textarea>
    @if (form.controls.rawNotes.invalid && form.controls.rawNotes.touched) {
      <mat-error>Raw notes are required.</mat-error>
    }
  </mat-form-field>

  @if (serverErrors().length > 0) {
    <div class="challenge-form__server-errors">
      @for (message of serverErrors(); track message) {
        <p>{{ message }}</p>
      }
    </div>
  }

  <button mat-raised-button color="primary" type="submit">
    {{ mode() === 'edit' ? 'Save' : 'Create Challenge' }}
  </button>
</form>
```

`src/app/features/challenge-form/challenge-form.component.scss`:
```scss
.challenge-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 480px;
  padding: 1rem;

  &__server-errors {
    color: #b71c1c;
    font-size: 0.875rem;
  }

  @media (max-width: 600px) {
    max-width: 100%;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `ng test --include='**/challenge-form.component.spec.ts' --watch=false`
Expected: PASS (both specs).

- [ ] **Step 5: Verify full build**

Run: `npm run build`
Expected: fails only on the missing `challenge-detail` import (Task 13). Confirm no other errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/challenge-form
git commit -m "feat: add challenge create/edit form with validation"
```

---

## Task 10: Status Stepper

**Files:**
- Create: `src/app/features/challenge-detail/status-stepper/status-stepper.component.{ts,html,scss}`

**Interfaces:**
- Consumes: `ChallengeApiService.updateStatus()` (Task 6), `Challenge`/`ChallengeStatus` models (Task 2).
- Produces: `StatusStepperComponent` with `@Input({required: true}) challenge!: Challenge` and `@Output() challengeUpdated = new EventEmitter<Challenge>()` — consumed by challenge-detail (Task 13).

- [ ] **Step 1: Generate the component**

Run:
```bash
ng generate component features/challenge-detail/status-stepper --style=scss
```

- [ ] **Step 2: Implement it**

`src/app/features/challenge-detail/status-stepper/status-stepper.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ChallengeApiService } from '../../../core/services/challenge-api.service';
import { Challenge, ChallengeStatus } from '../../../core/models/challenge.model';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';

const STEP_ORDER: ChallengeStatus[] = [
  'Submitted',
  'ProblemStatementDrafted',
  'OptionsDrafted',
  'OptionSelected',
  'InReview',
  'Approved',
];

@Component({
  selector: 'app-status-stepper',
  standalone: true,
  imports: [MatButtonModule, StatusBadgeComponent],
  templateUrl: './status-stepper.component.html',
  styleUrl: './status-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusStepperComponent {
  private readonly challengeApi = inject(ChallengeApiService);

  private readonly challengeSignal = signal<Challenge | null>(null);

  @Input({ required: true })
  set challenge(value: Challenge) {
    this.challengeSignal.set(value);
  }
  get challenge(): Challenge {
    return this.challengeSignal()!;
  }

  @Output() challengeUpdated = new EventEmitter<Challenge>();

  readonly steps = STEP_ORDER;

  transition(status: ChallengeStatus): void {
    this.challengeApi.updateStatus(this.challenge.id, status).subscribe((updated) => {
      this.challengeUpdated.emit(updated);
    });
  }
}
```

`src/app/features/challenge-detail/status-stepper/status-stepper.component.html`:
```html
<div class="status-stepper">
  <div class="status-stepper__steps">
    @for (step of steps; track step) {
      <app-status-badge [status]="step" />
    }
    @if (challenge.status === 'Rejected') {
      <app-status-badge status="Rejected" />
    }
  </div>

  <div class="status-stepper__actions">
    @if (challenge.status === 'OptionSelected') {
      <button mat-raised-button color="primary" (click)="transition('InReview')">
        Move to In Review
      </button>
    }
    @if (challenge.status === 'InReview') {
      <button mat-raised-button color="primary" (click)="transition('Approved')">Approve</button>
      <button mat-raised-button color="warn" (click)="transition('Rejected')">Reject</button>
    }
  </div>
</div>
```

`src/app/features/challenge-detail/status-stepper/status-stepper.component.scss`:
```scss
.status-stepper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 0;

  &__steps {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__actions {
    display: flex;
    gap: 0.5rem;
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no new errors beyond the still-missing `challenge-detail` route target.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/challenge-detail/status-stepper
git commit -m "feat: add status stepper component"
```

---

## Task 11: Problem Statement Panel

**Files:**
- Create: `src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.{ts,html,scss}`

**Interfaces:**
- Consumes: `ChallengeApiService.draftProblemStatement()`, `.updateChallenge()` (Task 6), `Challenge`/`DraftProblemStatementResponse` models (Task 2).
- Produces: `ProblemStatementPanelComponent` with `@Input({required: true}) challenge!: Challenge` and `@Output() challengeUpdated = new EventEmitter<Challenge>()` — consumed by challenge-detail (Task 13).

- [ ] **Step 1: Generate the component**

Run:
```bash
ng generate component features/challenge-detail/problem-statement-panel --style=scss
```

- [ ] **Step 2: Implement it**

`src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ChallengeApiService } from '../../../core/services/challenge-api.service';
import { Challenge } from '../../../core/models/challenge.model';

@Component({
  selector: 'app-problem-statement-panel',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './problem-statement-panel.component.html',
  styleUrl: './problem-statement-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProblemStatementPanelComponent {
  private readonly challengeApi = inject(ChallengeApiService);

  private readonly challengeSignal = signal<Challenge | null>(null);

  @Input({ required: true })
  set challenge(value: Challenge) {
    this.challengeSignal.set(value);
    this.draftText.set(value.problemStatement ?? '');
  }
  get challenge(): Challenge {
    return this.challengeSignal()!;
  }

  @Output() challengeUpdated = new EventEmitter<Challenge>();

  readonly draftText = signal('');
  readonly isDrafting = signal(false);

  requestDraft(): void {
    this.isDrafting.set(true);
    this.challengeApi.draftProblemStatement(this.challenge.id).subscribe((response) => {
      this.draftText.set(response.text);
      this.isDrafting.set(false);
    });
  }

  acceptAndSave(): void {
    this.challengeApi
      .updateChallenge(this.challenge.id, {
        title: this.challenge.title,
        problemStatement: this.draftText(),
      })
      .subscribe((updated) => this.challengeUpdated.emit(updated));
  }
}
```

`src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.html`:
```html
<div class="problem-statement-panel">
  <h3>Problem Statement</h3>

  @if (!challenge.problemStatement && !draftText()) {
    <button mat-raised-button (click)="requestDraft()" [disabled]="isDrafting()">
      {{ isDrafting() ? 'Drafting…' : 'Draft Problem Statement' }}
    </button>
  } @else {
    <mat-form-field appearance="outline" class="problem-statement-panel__field">
      <mat-label>Problem statement (editable)</mat-label>
      <textarea matInput rows="8" [ngModel]="draftText()" (ngModelChange)="draftText.set($event)"></textarea>
    </mat-form-field>
    <button mat-raised-button color="primary" (click)="acceptAndSave()">Accept & Save</button>
  }
</div>
```

`src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.scss`:
```scss
.problem-statement-panel {
  padding: 1rem 0;

  &__field {
    width: 100%;
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/challenge-detail/problem-statement-panel
git commit -m "feat: add problem statement panel with AI-draft accept gate"
```

---

## Task 12: Solution Options Panel

**Files:**
- Create: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.{ts,html,scss}`

**Interfaces:**
- Consumes: `ChallengeApiService.draftSolutionOptions()`, `.addOption()`, `.selectOption()` (Task 6), `Challenge`/`SolutionOption`/`DraftSolutionOptionsResponse` models (Task 2).
- Produces: `SolutionOptionsPanelComponent` with `@Input({required: true}) challenge!: Challenge` and `@Output() challengeUpdated = new EventEmitter<Challenge>()` — consumed by challenge-detail (Task 13).

- [ ] **Step 1: Generate the component**

Run:
```bash
ng generate component features/challenge-detail/solution-options-panel --style=scss
```

- [ ] **Step 2: Implement it**

`src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ChallengeApiService } from '../../../core/services/challenge-api.service';
import { Challenge } from '../../../core/models/challenge.model';

@Component({
  selector: 'app-solution-options-panel',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './solution-options-panel.component.html',
  styleUrl: './solution-options-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolutionOptionsPanelComponent {
  private readonly challengeApi = inject(ChallengeApiService);

  private readonly challengeSignal = signal<Challenge | null>(null);

  @Input({ required: true })
  set challenge(value: Challenge) {
    this.challengeSignal.set(value);
  }
  get challenge(): Challenge {
    return this.challengeSignal()!;
  }

  @Output() challengeUpdated = new EventEmitter<Challenge>();

  readonly draftOptions = signal<string[]>([]);
  readonly isDrafting = signal(false);

  requestDrafts(): void {
    this.isDrafting.set(true);
    this.challengeApi.draftSolutionOptions(this.challenge.id).subscribe((response) => {
      this.draftOptions.set(response.options);
      this.isDrafting.set(false);
    });
  }

  updateDraft(index: number, text: string): void {
    const next = [...this.draftOptions()];
    next[index] = text;
    this.draftOptions.set(next);
  }

  acceptDraft(index: number): void {
    const text = this.draftOptions()[index];
    this.challengeApi.addOption(this.challenge.id, text).subscribe((option) => {
      const remaining = this.draftOptions().filter((_, i) => i !== index);
      this.draftOptions.set(remaining);
      this.challengeUpdated.emit({
        ...this.challenge,
        status: 'OptionsDrafted',
        options: [...this.challenge.options, option],
      });
    });
  }

  selectOption(optionId: number): void {
    this.challengeApi.selectOption(this.challenge.id, optionId).subscribe((updated) => {
      this.challengeUpdated.emit(updated);
    });
  }
}
```

`src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.html`:
```html
<div class="solution-options-panel">
  <h3>Solution Options</h3>

  @if (challenge.problemStatement) {
    <button mat-raised-button (click)="requestDrafts()" [disabled]="isDrafting()">
      {{ isDrafting() ? 'Drafting…' : 'Draft Solution Options' }}
    </button>
  }

  @for (draft of draftOptions(); track $index) {
    <div class="solution-options-panel__draft">
      <mat-form-field appearance="outline" class="solution-options-panel__field">
        <mat-label>Option (editable)</mat-label>
        <textarea
          matInput
          rows="3"
          [ngModel]="draft"
          (ngModelChange)="updateDraft($index, $event)"
        ></textarea>
      </mat-form-field>
      <button mat-raised-button color="primary" (click)="acceptDraft($index)">Accept & Save</button>
    </div>
  }

  @if (challenge.options.length > 0) {
    <ul class="solution-options-panel__accepted">
      @for (option of challenge.options; track option.id) {
        <li>
          <span>{{ option.text }}</span>
          @if (option.isSelected) {
            <strong>Selected</strong>
          } @else if (challenge.status === 'OptionsDrafted') {
            <button mat-button (click)="selectOption(option.id)">Select</button>
          }
        </li>
      }
    </ul>
  }
</div>
```

`src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.scss`:
```scss
.solution-options-panel {
  padding: 1rem 0;

  &__field {
    width: 100%;
  }

  &__draft {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  &__accepted {
    list-style: none;
    padding: 0;

    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e0e0e0;
    }
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/challenge-detail/solution-options-panel
git commit -m "feat: add solution options panel with AI-draft accept gate and selection"
```

---

## Task 13: Challenge Detail (Compose)

**Files:**
- Create: `src/app/features/challenge-detail/challenge-detail.component.{ts,html,scss}`

**Interfaces:**
- Consumes: `ChallengeApiService.getChallenge()` (Task 6), `StatusBadgeComponent` (Task 8), `StatusStepperComponent` (Task 10), `ProblemStatementPanelComponent` (Task 11), `SolutionOptionsPanelComponent` (Task 12).
- Produces: `ChallengeDetailComponent` — the `/challenges/:id` route target referenced in `app.routes.ts` (Task 7).

- [ ] **Step 1: Generate the component**

Run:
```bash
ng generate component features/challenge-detail --style=scss
```

- [ ] **Step 2: Implement it**

`src/app/features/challenge-detail/challenge-detail.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChallengeApiService } from '../../core/services/challenge-api.service';
import { Challenge } from '../../core/models/challenge.model';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { StatusStepperComponent } from './status-stepper/status-stepper.component';
import { ProblemStatementPanelComponent } from './problem-statement-panel/problem-statement-panel.component';
import { SolutionOptionsPanelComponent } from './solution-options-panel/solution-options-panel.component';

@Component({
  selector: 'app-challenge-detail',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatProgressSpinnerModule,
    StatusBadgeComponent,
    StatusStepperComponent,
    ProblemStatementPanelComponent,
    SolutionOptionsPanelComponent,
  ],
  templateUrl: './challenge-detail.component.html',
  styleUrl: './challenge-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly challengeApi = inject(ChallengeApiService);

  readonly challenge = signal<Challenge | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.challengeApi.getChallenge(id).subscribe((challenge) => this.challenge.set(challenge));
  }

  onChallengeUpdated(updated: Challenge): void {
    this.challenge.set(updated);
  }
}
```

`src/app/features/challenge-detail/challenge-detail.component.html`:
```html
@if (challenge(); as c) {
  <div class="challenge-detail">
    <div class="challenge-detail__header">
      <h2>{{ c.title }}</h2>
      <app-status-badge [status]="c.status" />
      <a mat-button [routerLink]="['/challenges', c.id, 'edit']">Edit Title</a>
    </div>

    <p class="challenge-detail__raw-notes">{{ c.rawNotes }}</p>

    <app-status-stepper [challenge]="c" (challengeUpdated)="onChallengeUpdated($event)" />
    <app-problem-statement-panel [challenge]="c" (challengeUpdated)="onChallengeUpdated($event)" />

    @if (c.problemStatement) {
      <app-solution-options-panel [challenge]="c" (challengeUpdated)="onChallengeUpdated($event)" />
    }
  </div>
} @else {
  <mat-spinner diameter="32" />
}
```

`src/app/features/challenge-detail/challenge-detail.component.scss`:
```scss
.challenge-detail {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 720px;

  &__header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__raw-notes {
    white-space: pre-wrap;
    color: #616161;
  }

  @media (max-width: 600px) {
    padding: 0.5rem;
  }
}
```

- [ ] **Step 3: Verify the full app builds**

Run: `npm run build`
Expected: build succeeds with no errors — every route in `app.routes.ts` now resolves to a real component.

Run: `ng test --watch=false`
Expected: all specs pass, including `challenge-form.component.spec.ts` from Task 9.

- [ ] **Step 4: Manually smoke-test the app**

Run: `npx ng serve` and open the printed local URL in a browser.
Expected: user picker shows (or a fetch error if the backend isn't running yet — that's expected since `Team_Challenge_Hub_API` isn't scaffolded). Confirm there are no console errors unrelated to the failed API calls (e.g. no Angular template/binding errors).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/challenge-detail/challenge-detail.component.ts src/app/features/challenge-detail/challenge-detail.component.html src/app/features/challenge-detail/challenge-detail.component.scss
git commit -m "feat: compose challenge detail view from stepper and panels"
```

---

## Task 14: Playwright E2E Test

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/challenge-flow.spec.ts`
- Modify: `package.json` (add `e2e` script)

**Interfaces:**
- Consumes: the full running app (all prior tasks) plus a running instance of `Team_Challenge_Hub_API` — this test cannot pass in this repo alone until that sibling backend exists and both are running together. This is a real, documented prerequisite, not a placeholder.

- [ ] **Step 1: Install Playwright**

Run:
```bash
npm init playwright@latest -- --quiet --browser=chromium --no-examples
```
When prompted, use TypeScript, keep tests in `e2e/`, and skip installing a GitHub Actions workflow (not requested by the spec).

- [ ] **Step 2: Configure the base URL and dev server**

Edit `playwright.config.ts` to point at the Angular dev server:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:4200',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Write the end-to-end flow test**

`e2e/challenge-flow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('create challenge, draft problem statement, edit, accept, appears in list', async ({ page }) => {
  await page.goto('/');

  // Select the first seeded user from the picker.
  await page.getByRole('button').first().click();

  // Create a challenge.
  await page.getByRole('link', { name: 'New Challenge' }).click();
  await page.getByLabel('Title').fill('Reduce flaky CI builds');
  await page.getByLabel('Raw notes').fill('CI fails intermittently on the integration suite.');
  await page.getByRole('button', { name: 'Create Challenge' }).click();

  // Draft, edit, and accept the problem statement.
  await page.getByRole('button', { name: 'Draft Problem Statement' }).click();
  const textarea = page.getByLabel('Problem statement (editable)');
  await expect(textarea).not.toHaveValue('');
  await textarea.fill('Problem: CI is flaky. Impact: slows every merge. Context: integration suite only.');
  await page.getByRole('button', { name: 'Accept & Save' }).click();

  await expect(page.getByText('Problem Statement Drafted')).toBeVisible();

  // Verify it appears in the list with the updated status.
  await page.getByRole('link', { name: 'Team Challenge Hub' }).click().catch(() => {});
  await page.goto('/challenges');
  const card = page.getByText('Reduce flaky CI builds').locator('..');
  await expect(card.getByText('Problem Statement Drafted')).toBeVisible();
});
```

- [ ] **Step 4: Add the npm script**

Edit `package.json`, add to `"scripts"`:
```json
"e2e": "playwright test"
```

- [ ] **Step 5: Attempt a run and document the expected outcome**

Run: `npm run e2e`
Expected: FAILS at the API calls (`GET /api/users` etc.) because `Team_Challenge_Hub_API` doesn't exist yet in this environment. Confirm the failure is specifically a network/API error, not a Playwright config or selector error — that distinguishes "correctly written, blocked by a real external dependency" from "broken test." Do not mark this task complete by weakening the test or mocking the backend; the spec requires it to run against the real backend.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e package.json package-lock.json
git commit -m "test: add Playwright E2E flow test (requires backend to run)"
```

---

## Post-Plan Follow-Up

Once `Team_Challenge_Hub_API` is scaffolded and runnable:
1. Update `proxy.conf.json`'s target port (Task 1) to match its real Kestrel dev port.
2. Run `npm run e2e` for real and confirm Task 14's test passes.
3. Revisit the "Cross-Repo Assumptions" section above against the actual API responses; adjust `challenge-api.service.ts` and `core/models/*.ts` if the real JSON shape differs (enum casing, draft-endpoint response field names, select/status response body).
