# UX/Behavior Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four behavior gaps: challenge-detail shows every step's panel at
once instead of one at a time, there's no way back to the list from the
header, the list shows every user's challenges instead of just the current
user's, and switching the acting user doesn't refresh the list.

**Architecture:** Small, targeted changes to three existing Angular
components (`challenge-detail`, `app` shell, `challenge-list`) plus one
additive backend query-param filter the list-scoping change depends on. No
new components, no new services.

**Tech Stack:** Angular 22 (standalone components, signals), Vitest for unit
tests, ASP.NET Core 8 + EF Core (backend filter addition), xUnit.

## Global Constraints

- **Two repositories.** Task 1 is in
  `C:\Projects\Team_Challenge_Hub_Planning\Team_Challenge_Hub_API`; Tasks 2-4
  are in `C:\Projects\Team_Challenge_Hub_Planning\Team_Challenge_Hub_Angular`
  (where this plan file lives). Both are on branch
  `feat/ux-behavior-update`. Commit in the repo the task's files belong to.
- Angular components: `.component.ts`/`.component.html`/`.component.scss`
  triad, standalone, `inject()` for DI, `OnPush` change detection, typed
  inputs/outputs — no implicit `any`.
- Vitest is the test runner (`ng test --watch=false`); use Vitest matchers
  (`.toBe(true)`, not Jasmine's `toBeTrue()`).
- Backend: ASP.NET Core 8 controller-based Web API, EF Core + SQLite, xUnit
  for unit/integration tests, `WebApplicationFactory<Program>` for
  integration tests.
- No new npm/NuGet dependencies required for this plan.

---

### Task 1: Backend — filter challenges by `userId`

The Angular list-scoping task (Task 3) needs the API to filter by owner.
`GET /api/challenges` currently only supports `?status=`; this adds
`?userId=` as an independent, combinable filter.

**Files:**
- Modify: `src/TeamChallengeHub.Api/Services/IChallengeService.cs`
- Modify: `src/TeamChallengeHub.Api/Services/ChallengeService.cs:61-66`
- Modify: `src/TeamChallengeHub.Api/Controllers/ChallengesController.cs:22-27`
- Test: `tests/TeamChallengeHub.Api.Tests/Unit/ChallengeServiceTests.cs`
- Test: `tests/TeamChallengeHub.Api.Tests/Integration/ChallengesEndpointTests.cs`

**Interfaces:**
- Produces: `IChallengeService.GetAllAsync(ChallengeStatus? status, int? userId)`
  — existing callers pass `userId: null` for "no filter" (unchanged
  behavior when the param is omitted).

- [ ] **Step 1: Write the failing unit test**

Add to `tests/TeamChallengeHub.Api.Tests/Unit/ChallengeServiceTests.cs`:

```csharp
[Fact]
public async Task GetAllAsync_filters_by_userId()
{
    var service = CreateService();
    // CreateAsync persists via the real DbContext the service holds.
    var mine = await service.CreateAsync("Mine", "Notes", submittedByUserId: 1);
    var theirs = await service.CreateAsync("Theirs", "Notes", submittedByUserId: 2);

    var result = await service.GetAllAsync(status: null, userId: 1);

    Assert.Contains(result, c => c.Id == mine.Id);
    Assert.DoesNotContain(result, c => c.Id == theirs.Id);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test --filter GetAllAsync_filters_by_userId`
Expected: FAIL — build error, `GetAllAsync` has no `userId` parameter.

- [ ] **Step 3: Add `userId` to the interface, service, and controller**

In `IChallengeService.cs`, change:

```csharp
    Task<List<Challenge>> GetAllAsync(ChallengeStatus? status);
```

to:

```csharp
    Task<List<Challenge>> GetAllAsync(ChallengeStatus? status, int? userId);
```

In `ChallengeService.cs`, change the `GetAllAsync` method (currently at
lines 61-66) to:

```csharp
    public async Task<List<Challenge>> GetAllAsync(ChallengeStatus? status, int? userId)
    {
        var query = _db.Challenges.Include(c => c.Options).AsQueryable();
        if (status.HasValue) query = query.Where(c => c.Status == status.Value);
        if (userId.HasValue) query = query.Where(c => c.SubmittedByUserId == userId.Value);
        return await query.ToListAsync();
    }
```

In `ChallengesController.cs`, change the `GetAll` action (currently at
lines 22-27) to:

```csharp
    [HttpGet]
    public async Task<ActionResult<List<ChallengeDto>>> GetAll([FromQuery] ChallengeStatus? status, [FromQuery] int? userId)
    {
        var challenges = await _challengeService.GetAllAsync(status, userId);
        return Ok(challenges.Select(ToDto).ToList());
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotnet test --filter GetAllAsync_filters_by_userId`
Expected: PASS

- [ ] **Step 5: Add an integration-level regression test for the same behavior**

The unit test (Steps 1-4) already drove the `GetAllAsync` change through
TDD. This adds coverage at the HTTP layer, confirming the query param
reaches the controller correctly — add to
`tests/TeamChallengeHub.Api.Tests/Integration/ChallengesEndpointTests.cs`:

```csharp
[Fact]
public async Task GetAll_filters_by_userId_combined_with_status()
{
    _client.DefaultRequestHeaders.Remove("X-User-Id");
    _client.DefaultRequestHeaders.Add("X-User-Id", "1");

    var mineResponse = await _client.PostAsJsonAsync("/api/challenges",
        new CreateChallengeRequest("Mine", "Notes A."));
    var mine = await mineResponse.Content.ReadFromJsonAsync<ChallengeDto>();

    _client.DefaultRequestHeaders.Remove("X-User-Id");
    _client.DefaultRequestHeaders.Add("X-User-Id", "2");

    var theirsResponse = await _client.PostAsJsonAsync("/api/challenges",
        new CreateChallengeRequest("Theirs", "Notes B."));
    var theirs = await theirsResponse.Content.ReadFromJsonAsync<ChallengeDto>();

    var filtered = (await _client.GetFromJsonAsync<List<ChallengeDto>>(
        "/api/challenges?userId=1"))!;

    Assert.Contains(filtered, c => c.Id == mine!.Id);
    Assert.DoesNotContain(filtered, c => c.Id == theirs!.Id);
}
```

- [ ] **Step 6: Run the full backend test suite**

Run: `dotnet test`
Expected: All tests PASS, including the new integration test and the
existing `GetAll_filters_by_status_and_unfiltered_returns_all` test
(`userId: null` preserves old unfiltered behavior).

- [ ] **Step 7: Commit**

```bash
git add src/TeamChallengeHub.Api/Services/IChallengeService.cs src/TeamChallengeHub.Api/Services/ChallengeService.cs src/TeamChallengeHub.Api/Controllers/ChallengesController.cs tests/TeamChallengeHub.Api.Tests/Unit/ChallengeServiceTests.cs tests/TeamChallengeHub.Api.Tests/Integration/ChallengesEndpointTests.cs
git commit -m "feat: filter GET /api/challenges by userId"
```

---

### Task 2: Angular — scope the challenge list to the current user

Requires Task 1's `userId` query param to exist in the API repo (the unit
tests here mock HTTP, so they pass without a running backend, but the manual
verification at the end of this plan needs Task 1 merged).

Two problems, one fix. Today `ChallengeListComponent.ngOnInit` fetches once
and shows every user's challenges. The toolbar's `app-user-picker` can change
the acting user without navigating away, so a one-shot `ngOnInit` fetch never
refreshes. Making the fetch reactive to the user signal fixes both the
scoping and the stale-list problem.

**Approach — `httpResource()`, not `effect()`:** the fetch is declared as an
`httpResource` keyed on the `userId` and `statusFilter` signals. Angular
discourages `effect()` for data fetching, and an effect gives no request
cancellation — two rapid user switches can deliver responses out of order and
leave the wrong user's challenges on screen. `httpResource` supersedes the
in-flight request when its params change. This decision was confirmed with
the human partner (2026-08-03) over the alternatives (`effect()`,
`toObservable` + `switchMap`).

**Files:**
- Modify: `src/app/core/services/challenge-api.service.ts` (replace
  `getChallenges` at lines 20-26)
- Modify: `src/app/features/challenge-list/challenge-list.component.ts`
- Test: `src/app/core/services/challenge-api.service.spec.ts`
- Test: `src/app/features/challenge-list/challenge-list.component.spec.ts`
- Do NOT modify:
  `src/app/features/challenge-list/challenge-list.component.html` — it
  already reads `challenges()` and `loading()` as signals, and those names
  are preserved.

**Interfaces:**
- Consumes: `UserContextService.userId` — a `Signal<number | null>` exposed
  at `src/app/core/user-context/user-context.service.ts:9`.
- Produces: `ChallengeApiService.challengesResource(filters: () => ChallengeFilters): HttpResourceRef<Challenge[]>`
  where `ChallengeFilters` is
  `{ status: ChallengeStatus | null; userId: number | null }`, exported from
  `src/app/core/services/challenge-api.service.ts`.
- Removes: `ChallengeApiService.getChallenges()`. It has exactly one caller
  (`ChallengeListComponent`), which this task rewrites, so leaving it would
  be dead code. All other `ChallengeApiService` methods stay untouched.

**Verified test mechanics (do not deviate — these were confirmed empirically
against Angular 22.0.8 in this repo before the plan was written):**
- `httpResource` reports `isLoading() === true` and `value()` equal to the
  `defaultValue` from the moment the component is created, before any tick.
  No spinner flash, so the template's existing `@if (loading())` guard is
  correct as-is.
- `TestBed.tick()` is what issues the request. Call it before
  `httpMock.expectOne(...)`.
- **Never `await fixture.whenStable()` before flushing a resource request —
  it deadlocks.** `whenStable` waits on the pending HTTP task that only
  `flush()` can resolve, so the test times out after 5s.
- After `req.flush(...)`, the value lands only after a microtask drain plus
  an effect flush: `await Promise.resolve(); TestBed.tick();`. Without the
  drain, `value()` is still the default and `isLoading()` is still `true`.
- Changing a keyed signal then calling `TestBed.tick()` issues exactly one
  superseding request; `httpMock.verify()` passes with no leaked requests.

- [ ] **Step 1: Write the failing test for the service's resource factory**

Replace the contents of `src/app/core/services/challenge-api.service.spec.ts`
with:

```typescript
import { Component, Signal, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ChallengeApiService } from './challenge-api.service';
import { Challenge, ChallengeStatus } from '../models/challenge.model';
import { environment } from '../../../environments/environment';

// httpResource must be created in an injection context, so the factory is
// exercised through a host component the way the real caller uses it.
@Component({ standalone: true, template: '' })
class HostComponent {
  private readonly api = inject(ChallengeApiService);

  readonly status = signal<ChallengeStatus | null>(null);
  readonly userId = signal<number | null>(1);

  private readonly resource = this.api.challengesResource(() => ({
    status: this.status(),
    userId: this.userId(),
  }));

  readonly challenges: Signal<Challenge[]> = this.resource.value;
  readonly loading: Signal<boolean> = this.resource.isLoading;
}

describe('ChallengeApiService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(TestBed.inject(ChallengeApiService)).toBeTruthy();
  });

  it('sends userId as a query param and omits status when it is null', () => {
    const fixture = TestBed.createComponent(HostComponent);
    TestBed.tick();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/challenges`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('userId')).toBe('1');
    expect(req.request.params.has('status')).toBe(false);

    req.flush([]);
    httpMock.verify();
  });

  it('sends both params when a status filter is set', () => {
    const fixture = TestBed.createComponent(HostComponent);
    TestBed.tick();
    httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/challenges`).flush([]);

    fixture.componentInstance.status.set('Submitted');
    TestBed.tick();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/challenges`);
    expect(req.request.params.get('status')).toBe('Submitted');
    expect(req.request.params.get('userId')).toBe('1');

    req.flush([]);
    httpMock.verify();
  });

  it('omits userId when there is no current user', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.userId.set(null);
    TestBed.tick();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/challenges`);
    expect(req.request.params.has('userId')).toBe(false);

    req.flush([]);
    httpMock.verify();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ng test --watch=false --include='**/challenge-api.service.spec.ts'`
Expected: FAIL — `challengesResource` does not exist on `ChallengeApiService`.

- [ ] **Step 3: Replace `getChallenges` with `challengesResource`**

In `src/app/core/services/challenge-api.service.ts`:

Change the import line for `@angular/common/http` to add `httpResource` and
drop the now-unused `HttpParams`:

```typescript
import { HttpClient, httpResource } from '@angular/common/http';
```

Add this exported interface just above the `@Injectable` decorator:

```typescript
export interface ChallengeFilters {
  status: ChallengeStatus | null;
  userId: number | null;
}
```

Replace the `getChallenges` method (currently lines 20-26) with:

```typescript
  /**
   * Reactive challenge list, keyed on the given filters. Re-fetches whenever a
   * signal read inside `filters` changes, superseding any in-flight request —
   * so switching the acting user cannot leave the previous user's challenges
   * on screen. Must be called from an injection context.
   */
  challengesResource(filters: () => ChallengeFilters) {
    return httpResource<Challenge[]>(
      () => {
        const { status, userId } = filters();
        const params: Record<string, string> = {};
        if (status) {
          params['status'] = status;
        }
        if (userId !== null) {
          params['userId'] = String(userId);
        }
        return { url: this.baseUrl, params };
      },
      { defaultValue: [] },
    );
  }
```

Leave every other method in the file unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `ng test --watch=false --include='**/challenge-api.service.spec.ts'`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing test for list scoping and reload-on-user-switch**

Replace the contents of
`src/app/features/challenge-list/challenge-list.component.spec.ts` with:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ChallengeListComponent } from './challenge-list.component';
import { UserContextService } from '../../core/user-context/user-context.service';
import { environment } from '../../../environments/environment';

describe('ChallengeListComponent', () => {
  let httpMock: HttpTestingController;
  let userContext: UserContextService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    userContext = TestBed.inject(UserContextService);
    userContext.setUser(1);
  });

  afterEach(() => {
    localStorage.clear();
  });

  const listUrl = `${environment.apiBaseUrl}/challenges`;

  it('should create', () => {
    const fixture = TestBed.createComponent(ChallengeListComponent);
    TestBed.tick();

    expect(fixture.componentInstance).toBeTruthy();

    httpMock.expectOne((r) => r.url === listUrl).flush([]);
    httpMock.verify();
  });

  it('shows the spinner state until the first response arrives', async () => {
    const fixture = TestBed.createComponent(ChallengeListComponent);
    const component = fixture.componentInstance;

    expect(component.loading()).toBe(true);
    expect(component.challenges()).toEqual([]);

    TestBed.tick();
    httpMock.expectOne((r) => r.url === listUrl).flush([
      {
        id: 1,
        title: 'Improve deploy pipeline',
        rawNotes: 'Deploys take too long.',
        problemStatement: null,
        status: 'Submitted',
        submittedByUserId: 1,
        createdAt: '2026-07-29T00:00:00Z',
        updatedAt: '2026-07-29T00:00:00Z',
        options: [],
      },
    ]);
    await Promise.resolve();
    TestBed.tick();

    expect(component.loading()).toBe(false);
    expect(component.challenges().length).toBe(1);
    httpMock.verify();
  });

  it('scopes the fetch to the current user', () => {
    TestBed.createComponent(ChallengeListComponent);
    TestBed.tick();

    const req = httpMock.expectOne((r) => r.url === listUrl);
    expect(req.request.params.get('userId')).toBe('1');

    req.flush([]);
    httpMock.verify();
  });

  it('re-fetches for the new user when the acting user switches', async () => {
    TestBed.createComponent(ChallengeListComponent);
    TestBed.tick();

    const firstReq = httpMock.expectOne((r) => r.url === listUrl);
    expect(firstReq.request.params.get('userId')).toBe('1');
    firstReq.flush([]);
    await Promise.resolve();
    TestBed.tick();

    userContext.setUser(2);
    TestBed.tick();

    const secondReq = httpMock.expectOne((r) => r.url === listUrl);
    expect(secondReq.request.params.get('userId')).toBe('2');
    secondReq.flush([]);
    await Promise.resolve();
    TestBed.tick();

    httpMock.verify();
  });

  it('re-fetches with the status filter when it changes', async () => {
    const fixture = TestBed.createComponent(ChallengeListComponent);
    TestBed.tick();
    httpMock.expectOne((r) => r.url === listUrl).flush([]);
    await Promise.resolve();
    TestBed.tick();

    fixture.componentInstance.onFilterChange('Approved');
    TestBed.tick();

    const req = httpMock.expectOne((r) => r.url === listUrl);
    expect(req.request.params.get('status')).toBe('Approved');
    expect(req.request.params.get('userId')).toBe('1');

    req.flush([]);
    httpMock.verify();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `ng test --watch=false --include='**/challenge-list.component.spec.ts'`
Expected: FAIL — the component still calls the removed `getChallenges` (a
build/type error), and sends no `userId`.

- [ ] **Step 7: Make the list reactive to the current user**

Replace the contents of
`src/app/features/challenge-list/challenge-list.component.ts` with:

```typescript
import { ChangeDetectionStrategy, Component, Signal, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChallengeApiService } from '../../core/services/challenge-api.service';
import { UserContextService } from '../../core/user-context/user-context.service';
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
export class ChallengeListComponent {
  private readonly challengeApi = inject(ChallengeApiService);
  private readonly userContext = inject(UserContextService);

  readonly statuses = ALL_STATUSES;
  readonly statusFilter = signal<ChallengeStatus | null>(null);

  // Re-fetches whenever the acting user or the status filter changes, so
  // switching users via the toolbar picker refreshes the list without a
  // navigation. The resource supersedes any in-flight request.
  private readonly challengesResource = this.challengeApi.challengesResource(() => ({
    status: this.statusFilter(),
    userId: this.userContext.userId(),
  }));

  readonly challenges: Signal<Challenge[]> = this.challengesResource.value;
  readonly loading: Signal<boolean> = this.challengesResource.isLoading;

  onFilterChange(status: ChallengeStatus | null): void {
    this.statusFilter.set(status);
  }
}
```

Note `implements OnInit` and the `ngOnInit`/`load()` methods are gone — the
resource handles the initial fetch. The template is unchanged.

- [ ] **Step 8: Run test to verify it passes**

Run: `ng test --watch=false --include='**/challenge-list.component.spec.ts'`
Expected: PASS (5 tests).

- [ ] **Step 9: Run the full frontend test suite**

Run: `ng test --watch=false`
Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/app/core/services/challenge-api.service.ts src/app/core/services/challenge-api.service.spec.ts src/app/features/challenge-list/challenge-list.component.ts src/app/features/challenge-list/challenge-list.component.spec.ts
git commit -m "feat: scope challenge list to the current user, reload on user switch"
```
---

### Task 3: Angular — header title links home

**Files:**
- Modify: `src/app/app.component.ts`
- Modify: `src/app/app.component.html`
- Test: `src/app/app.component.spec.ts`

**Interfaces:**
- None new — uses Angular Router's existing `RouterLink` directive.

- [ ] **Step 1: Write the failing test**

Replace the contents of `src/app/app.component.spec.ts` with:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';

import { AppComponent } from './app.component';

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ng test --watch=false --include='**/app.component.spec.ts'`
Expected: FAIL — no `.app-title` element exists yet (title is a plain
`<span>`).

- [ ] **Step 3: Make the header title a home link**

In `src/app/app.component.ts`, add `RouterLink` to the imports:

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { UserPickerComponent } from './features/user-picker/user-picker.component';
import { UserContextService } from './core/user-context/user-context.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet, MatToolbarModule, UserPickerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly userContext = inject(UserContextService);
}
```

In `src/app/app.component.html`, replace the `<span>Team Challenge
Hub</span>` line with:

```html
<a class="app-title" routerLink="/">Team Challenge Hub</a>
```

Full file becomes:

```html
<mat-toolbar color="primary">
  <a class="app-title" routerLink="/">Team Challenge Hub</a>
  <span class="spacer"></span>
  @if (userContext.userId() !== null) {
    <app-user-picker />
  }
</mat-toolbar>

@if (userContext.userId() === null) {
  <app-user-picker />
} @else {
  <router-outlet />
}
```

Add to `src/app/app.component.scss` (so the link doesn't look like a
default blue underlined link inside a colored toolbar):

```scss
.app-title {
  color: inherit;
  text-decoration: none;
  font-size: inherit;
  font-weight: inherit;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `ng test --watch=false --include='**/app.component.spec.ts'`
Expected: PASS

- [ ] **Step 5: Run the full frontend test suite**

Run: `ng test --watch=false`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/app.component.ts src/app/app.component.html src/app/app.component.scss src/app/app.component.spec.ts
git commit -m "feat: link header title back to the challenge list"
```

---

### Task 4: Angular — challenge-detail shows one step's panel at a time

**Files:**
- Modify: `src/app/features/challenge-detail/challenge-detail.component.ts`
- Modify: `src/app/features/challenge-detail/challenge-detail.component.html`
- Modify: `src/app/features/challenge-detail/challenge-detail.component.scss`
- Test: `src/app/features/challenge-detail/challenge-detail.component.spec.ts`

**Interfaces:**
- Produces: `ChallengeDetailComponent.currentPanel` computed signal,
  type `'problem-statement' | 'solution-options' | 'none'`.
- Consumes: `Challenge.status` (`ChallengeStatus`, from
  `src/app/core/models/challenge.model.ts:3-10`).

**Panel mapping — get this right, it is load-bearing:**

| Status | Panel |
|---|---|
| `Submitted` | `problem-statement` |
| `ProblemStatementDrafted`, `OptionsDrafted`, `OptionSelected` | `solution-options` |
| `InReview`, `Approved`, `Rejected` | `none` |

`ProblemStatementDrafted` maps to **solution-options**, not
problem-statement. It is the state whose next action is adding options, and
the API enforces that: `AddOptionAsync`
(`Team_Challenge_Hub_API/src/TeamChallengeHub.Api/Services/ChallengeService.cs:93-101`)
accepts only `ProblemStatementDrafted` or `OptionsDrafted` and
auto-transitions the former to the latter on the first option. Since the
app's only `addOption` caller is inside `solution-options-panel`, and the
stepper has no button for that hop, mapping `ProblemStatementDrafted` to the
problem-statement panel dead-ends the workflow permanently. An earlier
revision of this plan had it wrong and the test encoded the same error, so
the suite went green on a broken journey — caught by the final whole-branch
review (2026-08-03).

Because the accepted problem statement is no longer visible in an editable
panel once the flow moves past `Submitted`, `challenge-detail` renders it as
read-only text above the panel whenever it is set — `solution-options-panel`
does not display it, and the raw notes are not the refined statement.

`StatusStepperComponent` is unchanged — it already renders all steps as a
progress trail, and already owns the `OptionSelected`→`InReview` and
`InReview`→`Approved`/`Rejected` transition buttons in its own
`.status-stepper__actions` block (see
`src/app/features/challenge-detail/status-stepper/status-stepper.component.html:13-23`).
So for `InReview`, `Approved`, and `Rejected`, no additional panel is
needed below the stepper — the existing header status badge plus the
stepper's own action buttons already cover "status display and transition
actions" for that stage.

- [ ] **Step 1: Write the failing test**

Replace the contents of
`src/app/features/challenge-detail/challenge-detail.component.spec.ts`
with:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ChallengeDetailComponent } from './challenge-detail.component';
import { environment } from '../../../environments/environment';
import { Challenge, ChallengeStatus } from '../../core/models/challenge.model';

describe('ChallengeDetailComponent', () => {
  let fixture: ComponentFixture<ChallengeDetailComponent>;
  let component: ChallengeDetailComponent;
  let httpMock: HttpTestingController;

  const fakeChallenge: Challenge = {
    id: 1,
    title: 'Improve deploy pipeline',
    rawNotes: 'Deploys take too long.',
    problemStatement: null,
    status: 'Submitted',
    submittedByUserId: 1,
    createdAt: '2026-07-29T00:00:00Z',
    updatedAt: '2026-07-29T00:00:00Z',
    options: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChallengeDetailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectLoadRequest() {
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/challenges/1`);
    expect(req.request.method).toBe('GET');
    return req;
  }

  it('should create', () => {
    expectLoadRequest().flush(fakeChallenge);
    expect(component).toBeTruthy();
  });

  it('loads the challenge by route id and stores it in the signal', () => {
    expectLoadRequest().flush(fakeChallenge);

    expect(component.challenge()).toEqual(fakeChallenge);
    expect(component.loadFailed()).toBe(false);
  });

  it('sets loadFailed instead of spinning forever when the challenge is missing', () => {
    expectLoadRequest().flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(component.challenge()).toBeNull();
    expect(component.loadFailed()).toBe(true);
  });

  const panelCases: Array<[ChallengeStatus, 'problem-statement' | 'solution-options' | 'none']> = [
    ['Submitted', 'problem-statement'],
    ['ProblemStatementDrafted', 'solution-options'],
    ['OptionsDrafted', 'solution-options'],
    ['OptionSelected', 'solution-options'],
    ['InReview', 'none'],
    ['Approved', 'none'],
    ['Rejected', 'none'],
  ];

  it.each(panelCases)('shows only the %s panel for status %s', (status, expected) => {
    expectLoadRequest().flush({ ...fakeChallenge, status });
    fixture.detectChanges();

    const problemPanel = fixture.debugElement.query(By.css('app-problem-statement-panel'));
    const optionsPanel = fixture.debugElement.query(By.css('app-solution-options-panel'));

    expect(problemPanel !== null).toBe(expected === 'problem-statement');
    expect(optionsPanel !== null).toBe(expected === 'solution-options');
  });

  it('shows the accepted problem statement as read-only text once it is set', () => {
    expectLoadRequest().flush({
      ...fakeChallenge,
      status: 'OptionsDrafted',
      problemStatement: 'Problem: Deploys take too long.',
    });
    fixture.detectChanges();

    const section = fixture.debugElement.query(By.css('.challenge-detail__problem-statement'));
    expect(section).not.toBeNull();
    expect(section.nativeElement.textContent).toContain('Deploys take too long');
    // Read-only: the editable problem-statement panel must not be mounted here.
    expect(fixture.debugElement.query(By.css('app-problem-statement-panel'))).toBeNull();
  });

  it('does not show a problem statement section before one is accepted', () => {
    expectLoadRequest().flush({ ...fakeChallenge, status: 'Submitted', problemStatement: null });
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('.challenge-detail__problem-statement')),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ng test --watch=false --include='**/challenge-detail.component.spec.ts'`
Expected: FAIL — the old template renders both panels together whenever
`problemStatement` is set (its `@if (c.problemStatement)` gate), which doesn't
match the new per-status rule, and it has no read-only problem-statement
section for the two new tests to find.

- [ ] **Step 3: Add the `currentPanel` computed signal**

Replace the contents of
`src/app/features/challenge-detail/challenge-detail.component.ts` with:

```typescript
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChallengeApiService } from '../../core/services/challenge-api.service';
import { Challenge } from '../../core/models/challenge.model';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { StatusStepperComponent } from './status-stepper/status-stepper.component';
import { ProblemStatementPanelComponent } from './problem-statement-panel/problem-statement-panel.component';
import { SolutionOptionsPanelComponent } from './solution-options-panel/solution-options-panel.component';

type DetailPanel = 'problem-statement' | 'solution-options' | 'none';

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
  readonly loadFailed = signal(false);

  readonly currentPanel = computed<DetailPanel>(() => {
    switch (this.challenge()?.status) {
      case 'Submitted':
        return 'problem-statement';
      // ProblemStatementDrafted belongs to the solution-options step: adding an
      // option is the only way out of it (AddOptionAsync auto-transitions it to
      // OptionsDrafted), and the only addOption caller lives in that panel.
      // Mapping it to 'problem-statement' dead-ends the workflow.
      case 'ProblemStatementDrafted':
      case 'OptionsDrafted':
      case 'OptionSelected':
        return 'solution-options';
      default:
        return 'none';
    }
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.challengeApi.getChallenge(id).subscribe({
      next: (challenge) => this.challenge.set(challenge),
      // The error interceptor shows a snackbar for 5xx but leaves component
      // state alone, so without this the spinner would spin forever on a 404.
      error: () => this.loadFailed.set(true),
    });
  }

  onChallengeUpdated(updated: Challenge): void {
    this.challenge.set(updated);
  }
}
```

- [ ] **Step 4: Switch the template on `currentPanel`**

Replace the contents of
`src/app/features/challenge-detail/challenge-detail.component.html` with:

```html
@if (challenge(); as c) {
  <div class="challenge-detail">
    <div class="challenge-detail__header">
      <h2>{{ c.title }}</h2>
      <app-status-badge [status]="c.status" />
      <a mat-button [routerLink]="['/challenges', c.id, 'edit']">Edit Title</a>
    </div>

    <p class="challenge-detail__raw-notes">{{ c.rawNotes }}</p>

    <!-- Once accepted, the problem statement leaves the editable panel, but the
         user still needs to read it while drafting options against it. -->
    @if (c.problemStatement) {
      <section class="challenge-detail__problem-statement">
        <h3>Problem Statement</h3>
        <p>{{ c.problemStatement }}</p>
      </section>
    }

    <app-status-stepper [challenge]="c" (challengeUpdated)="onChallengeUpdated($event)" />

    @switch (currentPanel()) {
      @case ('problem-statement') {
        <app-problem-statement-panel [challenge]="c" (challengeUpdated)="onChallengeUpdated($event)" />
      }
      @case ('solution-options') {
        <app-solution-options-panel [challenge]="c" (challengeUpdated)="onChallengeUpdated($event)" />
      }
    }
  </div>
} @else if (loadFailed()) {
  <div class="challenge-detail__error">
    <p>Challenge not found.</p>
    <a mat-raised-button color="primary" routerLink="/challenges">Back to challenges</a>
  </div>
} @else {
  <mat-spinner diameter="32" />
}
```

- [ ] **Step 5: Style the read-only problem statement**

Add this inside the existing `.challenge-detail` block in
`src/app/features/challenge-detail/challenge-detail.component.scss`, matching
the file's `&__`-BEM convention and its use of `pre-wrap` for multi-line
server text:

```scss
  &__problem-statement {
    p {
      white-space: pre-wrap;
      margin: 0;
    }

    h3 {
      margin: 0 0 0.5rem;
    }
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `ng test --watch=false --include='**/challenge-detail.component.spec.ts'`
Expected: PASS (12 tests: 3 existing + 7 parameterized panel cases + 2
problem-statement-visibility tests).

- [ ] **Step 7: Run the full frontend test suite**

Run: `ng test --watch=false`
Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/features/challenge-detail/challenge-detail.component.ts src/app/features/challenge-detail/challenge-detail.component.html src/app/features/challenge-detail/challenge-detail.component.scss src/app/features/challenge-detail/challenge-detail.component.spec.ts
git commit -m "feat: show only the current step's panel in challenge detail"
```

---

## Manual Verification

After all four tasks are committed, manually verify against a running app
(`npm start` in the Angular repo, `dotnet run --project
src/TeamChallengeHub.Api --launch-profile https` in the API repo):

**Step 2 is the one that matters most — it is the step that catches a
dead-ended workflow, and the defect the final review found would have been
caught here had this list been run.**

1. Create a challenge as User A — confirm only the problem-statement panel
   shows (no solution-options panel yet).
2. Draft + accept a problem statement — confirm the view switches to the
   **solution-options panel**, that its "Draft Solution Options" button is
   present and clickable, and that the accepted problem statement is now shown
   as read-only text above it. If you are still looking at the editable
   problem-statement panel here, the workflow is dead-ended: adding an option
   is the only way out of `ProblemStatementDrafted` and that panel cannot do
   it.
3. Draft, edit and accept an option — confirm the status advances to
   `OptionsDrafted` and a "Select" button appears on the accepted option.
   Select it, then move to "In Review" — confirm no panel shows below the
   stepper, just the status badge, the read-only problem statement, and the
   stepper's own Approve/Reject buttons.
4. Click the "Team Challenge Hub" header title from the detail view —
   confirm it navigates back to the challenge list.
5. Switch to User B via the toolbar picker while on the challenge list —
   confirm the list reloads to show only User B's challenges, without a
   page navigation.
