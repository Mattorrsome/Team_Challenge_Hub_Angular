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

Requires Task 1 deployed (or at least merged) since it calls the new
`userId` query param. Also fixes "switching user doesn't reload the list" —
today `ChallengeListComponent.ngOnInit` only fetches once; the toolbar's
`app-user-picker` can change the acting user without navigating away, so the
component needs to react to that signal changing, not just load once.

**Files:**
- Modify: `src/app/core/services/challenge-api.service.ts:20-26`
- Modify: `src/app/features/challenge-list/challenge-list.component.ts`
- Test: `src/app/core/services/challenge-api.service.spec.ts`
- Test: `src/app/features/challenge-list/challenge-list.component.spec.ts`

**Interfaces:**
- Consumes: `UserContextService.userId` signal (`Signal<number | null>`,
  from `src/app/core/user-context/user-context.service.ts:9`).
- Produces: `ChallengeApiService.getChallenges(status?: ChallengeStatus, userId?: number): Observable<Challenge[]>`

- [ ] **Step 1: Write the failing test for the API service's new param**

Replace the contents of `src/app/core/services/challenge-api.service.spec.ts`
with:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ChallengeApiService } from './challenge-api.service';
import { environment } from '../../../environments/environment';

describe('ChallengeApiService', () => {
  let service: ChallengeApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChallengeApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sends status and userId as query params when both are provided', () => {
    service.getChallenges('Submitted', 7).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/challenges`,
    );
    expect(req.request.params.get('status')).toBe('Submitted');
    expect(req.request.params.get('userId')).toBe('7');
    req.flush([]);
  });

  it('omits userId from the query when not provided', () => {
    service.getChallenges('Submitted').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/challenges`,
    );
    expect(req.request.params.has('userId')).toBe(false);
    req.flush([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ng test --watch=false --include='**/challenge-api.service.spec.ts'`
Expected: FAIL — `getChallenges` doesn't accept a second argument yet.

- [ ] **Step 3: Add `userId` param to `ChallengeApiService.getChallenges`**

In `src/app/core/services/challenge-api.service.ts`, replace the
`getChallenges` method (currently lines 20-26) with:

```typescript
  getChallenges(status?: ChallengeStatus, userId?: number): Observable<Challenge[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (userId !== undefined) {
      params = params.set('userId', userId);
    }
    return this.http.get<Challenge[]>(this.baseUrl, { params });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `ng test --watch=false --include='**/challenge-api.service.spec.ts'`
Expected: PASS

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
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    userContext.setUser(1);
    const fixture = TestBed.createComponent(ChallengeListComponent);
    fixture.detectChanges();
    TestBed.tick();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();

    httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/challenges`).flush([]);
  });

  it('scopes the fetch to the current user and reloads when the user switches', () => {
    userContext.setUser(1);
    const fixture = TestBed.createComponent(ChallengeListComponent);
    fixture.detectChanges();
    TestBed.tick();

    const firstReq = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/challenges`);
    expect(firstReq.request.params.get('userId')).toBe('1');
    firstReq.flush([]);

    userContext.setUser(2);
    TestBed.tick();

    const secondReq = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/challenges`);
    expect(secondReq.request.params.get('userId')).toBe('2');
    secondReq.flush([]);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `ng test --watch=false --include='**/challenge-list.component.spec.ts'`
Expected: FAIL — component doesn't send `userId` or react to user changes
yet.

- [ ] **Step 7: Make the list reactive to the current user**

Replace the contents of
`src/app/features/challenge-list/challenge-list.component.ts` with:

```typescript
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
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
  readonly challenges = signal<Challenge[]>([]);
  readonly loading = signal(true);
  readonly statusFilter = signal<ChallengeStatus | null>(null);

  constructor() {
    // Runs once on creation and again whenever userId or statusFilter change —
    // this is what makes switching the acting user (via the toolbar picker,
    // without navigating away) refresh the list to that user's challenges.
    effect(() => {
      const userId = this.userContext.userId();
      const status = this.statusFilter();
      this.loading.set(true);
      this.challengeApi
        .getChallenges(status ?? undefined, userId ?? undefined)
        .subscribe((challenges) => {
          this.challenges.set(challenges);
          this.loading.set(false);
        });
    });
  }

  onFilterChange(status: ChallengeStatus | null): void {
    this.statusFilter.set(status);
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `ng test --watch=false --include='**/challenge-list.component.spec.ts'`
Expected: PASS

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

    expect(location.path()).toBe('/');
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
- Test: `src/app/features/challenge-detail/challenge-detail.component.spec.ts`

**Interfaces:**
- Produces: `ChallengeDetailComponent.currentPanel` computed signal,
  type `'problem-statement' | 'solution-options' | 'none'`.
- Consumes: `Challenge.status` (`ChallengeStatus`, from
  `src/app/core/models/challenge.model.ts:3-10`).

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
    ['ProblemStatementDrafted', 'problem-statement'],
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ng test --watch=false --include='**/challenge-detail.component.spec.ts'`
Expected: FAIL — both panels currently render together for
`ProblemStatementDrafted`/`OptionsDrafted`/`OptionSelected` (the old
template's `@if (c.problemStatement)` gate doesn't match the new
per-status rule).

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
      case 'ProblemStatementDrafted':
        return 'problem-statement';
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

- [ ] **Step 5: Run test to verify it passes**

Run: `ng test --watch=false --include='**/challenge-detail.component.spec.ts'`
Expected: PASS (all 10 tests: 3 existing + 7 parameterized panel cases).

- [ ] **Step 6: Run the full frontend test suite**

Run: `ng test --watch=false`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/challenge-detail/challenge-detail.component.ts src/app/features/challenge-detail/challenge-detail.component.html src/app/features/challenge-detail/challenge-detail.component.spec.ts
git commit -m "feat: show only the current step's panel in challenge detail"
```

---

## Manual Verification

After all four tasks are committed, manually verify against a running app
(`npm start` in the Angular repo, `dotnet run --project
src/TeamChallengeHub.Api --launch-profile https` in the API repo):

1. Create a challenge as User A — confirm only the problem-statement panel
   shows (no solution-options panel yet).
2. Draft + accept a problem statement — confirm the view switches to the
   solution-options panel.
3. Add + select an option, move to "In Review" — confirm no panel shows
   below the stepper, just the status badge and the stepper's own
   Approve/Reject buttons.
4. Click the "Team Challenge Hub" header title from the detail view —
   confirm it navigates back to the challenge list.
5. Switch to User B via the toolbar picker while on the challenge list —
   confirm the list reloads to show only User B's challenges, without a
   page navigation.
