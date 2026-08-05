# Challenge Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Only a challenge's owner or an `Admin` may change its content; the
review workflow stays open to every signed-in user.

**Architecture:** One private helper on `ChallengesController` gates the five
content-write endpoints and returns 403 for a non-owner non-admin. On the
frontend, `challenge-detail` computes `canEdit` and hides the editing
affordances, `challenge-list` drops its `userId` filter for admins so the admin
override is reachable, and `errorHandlingInterceptor` gains the 403 branch it
never had.

**Tech Stack:** ASP.NET Core 8 + EF Core/SQLite with xUnit and
`WebApplicationFactory` (Task 1); Angular 22 standalone components with signals
and Vitest (Tasks 2-5).

## Global Constraints

- **Two repositories.** Task 1 is in
  `C:\Projects\Team_Challenge_Hub_Planning\Team_Challenge_Hub_API`; Tasks 2-5
  are in `C:\Projects\Team_Challenge_Hub_Planning\Team_Challenge_Hub_Angular`
  (where this plan file lives). Both are currently on `main` with the auth work
  merged. Create branch `feat/challenge-ownership` in each repo, and commit in
  the repo the task's files belong to.
- Source specs:
  `../../specs/2026-08-05-challenge-ownership-frontend.md` and
  `../../../../Team_Challenge_Hub_API/docs/specs/2026-08-05-challenge-ownership-backend.md`.
- **The rule:** a request may change a challenge's content when the acting user
  is `Admin` **or** `challenge.SubmittedByUserId == actingUserId`.
- **Gated (403 otherwise):** `PUT /api/challenges/{id}`,
  `DELETE /api/challenges/{id}`, `POST /api/challenges/{id}/options`,
  `DELETE /api/challenges/{id}/options/{optionId}`,
  `PUT /api/challenges/{id}/options/{optionId}/select`.
- **NOT gated:** `GET /api/challenges`, `GET /api/challenges/{id}`, both
  `draft-*` endpoints, `POST /api/challenges`, and — deliberately —
  `PUT /api/challenges/{id}/status`. Gating status would let an owner approve
  their own challenge, making the review step a formality.
- **Status code order:** existence before ownership. A missing challenge is
  **404**; an existing challenge owned by someone else is **403**.
- The role string is exactly `"Admin"`. `User.IsInRole("Admin")` works because
  the session identity carries a `ClaimTypes.Role` claim.
- Seeded users: `alex.kim` = id 1 = Admin; `jordan.patel` = id 2, `sam.rivera`
  = id 3, `taylor.nguyen` = id 4, `morgan.chen` = id 5, all `Collaborator`, all
  with password `ChangeMe123!` (`DbSeeder.DefaultSeedPassword`). Integration
  tests sign in via `AuthTestClient.SignInAsync(client, username)`.
- Backend: `dotnet test` from the repo root, `dotnet test --filter <TestName>`
  for one test, `dotnet build`. `net8.0`, no new NuGet packages.
- Frontend: `npm test -- --watch=false` (Vitest — use `.toBe(true)`, never
  Jasmine's `toBeTrue()`; do not pass `--include=...`). No new npm packages.
- Angular conventions: `.component.ts`/`.component.html`/`.component.scss`
  triad, `standalone: true`, `inject()` for DI, `OnPush`, typed inputs, no
  implicit `any`.
- **No hardcoded hex colors in SCSS.** No SCSS change is expected in this plan;
  if one becomes necessary, use Material system tokens
  (`var(--mat-sys-on-surface)` etc.) or `light-dark(<light>, <dark>)`.
- The client-side check is a UX affordance, not a security boundary — the API is
  the enforcement point. Never remove a server-side check because the UI hides
  the control.

---

### Task 1: Backend — owner-or-admin on content writes

**Repo:** `Team_Challenge_Hub_API`

**Files:**
- Modify: `src/TeamChallengeHub.Api/Controllers/ChallengesController.cs`
- Test: `tests/TeamChallengeHub.Api.Tests/Integration/ChallengesEndpointTests.cs`

**Interfaces:**
- Produces: 403 from the five gated endpoints for a signed-in user who is
  neither the owner nor an `Admin`. Tasks 2-5 rely on this status code
  existing; nothing else in the API's surface changes.

- [ ] **Step 1: Write the failing integration tests**

Add to `tests/TeamChallengeHub.Api.Tests/Integration/ChallengesEndpointTests.cs`.
These use a helper that creates a challenge as one user and then switches the
shared client's session, so add it alongside the tests:

```csharp
    // Creates a challenge owned by `owner`, then leaves the client signed in as
    // `actor`. Returns the created challenge's id.
    private async Task<int> CreateChallengeAsThen(string owner, string actor, string title)
    {
        await AuthTestClient.SignInAsync(_client, owner);
        var create = await _client.PostAsJsonAsync("/api/challenges",
            new CreateChallengeRequest(title, "Notes."));
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<ChallengeDto>();

        await AuthTestClient.SignInAsync(_client, actor);
        return created!.Id;
    }

    [Fact]
    public async Task Update_by_the_owner_succeeds()
    {
        var id = await CreateChallengeAsThen(
            AuthTestClient.CollaboratorUsername, AuthTestClient.CollaboratorUsername, "Owner edits this");

        var response = await _client.PutAsJsonAsync($"/api/challenges/{id}",
            new UpdateChallengeRequest("Owner edited it", null));

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<ChallengeDto>();
        Assert.Equal("Owner edited it", updated!.Title);
    }

    [Fact]
    public async Task Update_by_a_non_owner_collaborator_returns_403()
    {
        // jordan.patel owns it; sam.rivera is a collaborator, not an admin.
        var id = await CreateChallengeAsThen(
            AuthTestClient.CollaboratorUsername, "sam.rivera", "Someone else's challenge");

        var response = await _client.PutAsJsonAsync($"/api/challenges/{id}",
            new UpdateChallengeRequest("Hijacked", null));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Update_by_an_admin_on_someone_elses_challenge_succeeds()
    {
        var id = await CreateChallengeAsThen(
            AuthTestClient.CollaboratorUsername, AuthTestClient.AdminUsername, "Admin overrides this");

        var response = await _client.PutAsJsonAsync($"/api/challenges/{id}",
            new UpdateChallengeRequest("Admin edited it", null));

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<ChallengeDto>();
        Assert.Equal("Admin edited it", updated!.Title);
    }

    [Fact]
    public async Task AddOption_by_a_non_owner_collaborator_returns_403()
    {
        var id = await CreateChallengeAsThen(
            AuthTestClient.CollaboratorUsername, "sam.rivera", "Options are owned too");

        var response = await _client.PostAsJsonAsync($"/api/challenges/{id}/options",
            new CreateSolutionOptionRequest("An option from a stranger"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Delete_by_a_non_owner_collaborator_returns_403()
    {
        var id = await CreateChallengeAsThen(
            AuthTestClient.CollaboratorUsername, "sam.rivera", "Not yours to delete");

        var response = await _client.DeleteAsync($"/api/challenges/{id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateStatus_by_a_non_owner_collaborator_succeeds()
    {
        // The workflow is deliberately shared: someone other than the owner has
        // to be able to review. A fresh challenge is Submitted, and
        // Submitted -> ProblemStatementDrafted is an allowed transition.
        var id = await CreateChallengeAsThen(
            AuthTestClient.CollaboratorUsername, "sam.rivera", "Reviewed by a peer");

        var response = await _client.PutAsJsonAsync($"/api/challenges/{id}/status",
            new StatusUpdateRequest("ProblemStatementDrafted"));

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<ChallengeDto>();
        Assert.Equal("ProblemStatementDrafted", updated!.Status);
    }

    [Fact]
    public async Task Update_on_a_missing_challenge_returns_404_not_403()
    {
        await AuthTestClient.SignInAsync(_client, AuthTestClient.CollaboratorUsername);

        var response = await _client.PutAsJsonAsync("/api/challenges/9999",
            new UpdateChallengeRequest("Nothing here", null));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `dotnet test --filter "Update_by_a_non_owner_collaborator_returns_403|AddOption_by_a_non_owner_collaborator_returns_403|Delete_by_a_non_owner_collaborator_returns_403"`
Expected: FAIL — all three return 200/204 today, because no ownership check
exists. (`Update_by_the_owner_succeeds`,
`UpdateStatus_by_a_non_owner_collaborator_succeeds` and
`Update_on_a_missing_challenge_returns_404_not_403` already pass — they pin
behavior that must not regress.)

- [ ] **Step 3: Add the ownership helper**

In `src/TeamChallengeHub.Api/Controllers/ChallengesController.cs`, add this
private method next to `ToDto` at the bottom of the class:

```csharp
    /// <summary>
    /// Content writes are owner-or-admin; the workflow (status transitions) is
    /// shared, so this is deliberately not called from UpdateStatus. Returns null
    /// when the caller may proceed, otherwise the result to return: 404 for a
    /// challenge that doesn't exist, 403 for one that belongs to someone else.
    /// </summary>
    // ponytail: costs a second read — the action then loads the challenge again
    // through the service. Fine at this scale; push the check into
    // IChallengeService if the extra query ever shows up in a trace.
    private async Task<ActionResult?> DenyIfCannotEdit(int challengeId)
    {
        var challenge = await _challengeService.GetByIdAsync(challengeId);
        if (challenge is null) return NotFound();
        if (User.IsInRole("Admin")) return null;

        return challenge.SubmittedByUserId == User.GetUserId() ? null : Forbid();
    }
```

`Forbid()` invokes the cookie scheme's forbid handler, which
`Program.cs`'s `OnRedirectToAccessDenied` override turns into a bare 403 —
the same path `[Authorize(Roles = "Admin")]` already uses on
`UsersController`.

- [ ] **Step 4: Call the helper from the five gated actions**

Add the same two lines as the first statements of `Update`, `AddOption`,
`SelectOption`, `Delete` and `DeleteOption`. For example, `Update` becomes:

```csharp
    [HttpPut("{id}")]
    public async Task<ActionResult<ChallengeDto>> Update(int id, UpdateChallengeRequest request)
    {
        var denied = await DenyIfCannotEdit(id);
        if (denied is not null) return denied;

        var challenge = await _challengeService.UpdateAsync(id, request.Title, request.ProblemStatement);
        return challenge is null ? NotFound() : Ok(ToDto(challenge));
    }
```

`Delete` and `DeleteOption` return `Task<IActionResult>`, so the same two lines
work there unchanged (`ActionResult` implements `IActionResult`).

Do **not** add the check to `GetAll`, `GetById`, `Create`,
`DraftProblemStatement`, `DraftSolutionOptions`, or `UpdateStatus`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `dotnet test`
Expected: PASS — the full suite, including the seven tests from Step 1 and all
pre-existing tests. Any pre-existing test that now fails is signing in as the
wrong user for a challenge it created; fix the sign-in, not the check.

- [ ] **Step 6: Commit**

```bash
git add src/TeamChallengeHub.Api tests/TeamChallengeHub.Api.Tests
git commit -m "feat: restrict challenge content writes to the owner or an admin"
```

---

### Task 2: Frontend — 403 branch in the error interceptor

**Repo:** `Team_Challenge_Hub_Angular`

Independent of the other frontend tasks and useful on its own: a 403 produces
no feedback at all today, so the admin view's forbidden responses are already
silent.

**Files:**
- Modify: `src/app/core/interceptors/error-handling.interceptor.ts`
- Test: `src/app/core/interceptors/error-handling.interceptor.spec.ts`

**Interfaces:**
- Produces: any 403 opens a snackbar reading
  `You don't have permission to do that.` and does **not** navigate.

- [ ] **Step 1: Write the failing tests**

Add to `src/app/core/interceptors/error-handling.interceptor.spec.ts`, following
the existing tests' shape in that file:

```ts
  it('opens a snackbar on a 403 and does not navigate', () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const open = vi.spyOn(snackBar, 'open');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    http.put('/api/challenges/1', { title: 'Not mine' }).subscribe({ error: () => {} });
    httpMock
      .expectOne('/api/challenges/1')
      .flush({ error: 'forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(open).toHaveBeenCalled();
    expect(open.mock.calls[0][0]).toContain('permission');
    expect(navigate).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — `expect(open).toHaveBeenCalled()` fails; the interceptor has
no 403 branch, so nothing is shown.

- [ ] **Step 3: Add the 403 branch**

In `src/app/core/interceptors/error-handling.interceptor.ts`, insert a branch
after the 401 one and before the 409 one:

```ts
      } else if (error.status === 403) {
        // Deliberately no redirect — that's 401's job. Bouncing on a 403 would
        // throw an admin off /admin/users over one transient failure.
        snackBar.open("You don't have permission to do that.", 'Dismiss', { duration: 5000 });
      } else if (error.status === 409 && !req.url.includes('/users/')) {
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --watch=false`
Expected: PASS — the new test plus every pre-existing one.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/interceptors
git commit -m "feat: surface 403 responses with a snackbar"
```

---

### Task 3: Frontend — admins see every challenge in the list

**Repo:** `Team_Challenge_Hub_Angular`

**Files:**
- Modify: `src/app/features/challenge-list/challenge-list.component.ts:47-50`
- Test: `src/app/features/challenge-list/challenge-list.component.spec.ts`

**Interfaces:**
- Produces: the list request omits `userId` entirely for an `Admin`, and still
  sends it for a `Collaborator`.

- [ ] **Step 1: Write the failing test**

Add to `src/app/features/challenge-list/challenge-list.component.spec.ts`. Its
`beforeEach` already signs in a user by flushing `/auth/signin`, so this test
needs its own admin sign-in — read that `beforeEach` first and match how it
seeds the session, signing in as an `Admin` instead:

```ts
  it('omits the userId filter for an admin so all challenges are listed', () => {
    // The beforeEach signed in a Collaborator; replace that session with an Admin.
    TestBed.inject(AuthService).signIn('alex.kim', 'ChangeMe123!').subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/signin`)
      .flush({ id: 1, username: 'alex.kim', role: 'Admin' });

    TestBed.createComponent(ChallengeListComponent);
    TestBed.tick();

    const req = httpMock.expectOne((r) => r.url === listUrl);
    expect(req.request.params.has('userId')).toBe(false);

    req.flush([]);
    httpMock.verify();
  });
```

Add `import { AuthService } from '../../core/auth/auth.service';` if the file
doesn't already import it.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — `expect(req.request.params.has('userId')).toBe(false)` gets
`true`; the resource sends the admin's own id.

- [ ] **Step 3: Unscope the list for admins**

In `src/app/features/challenge-list/challenge-list.component.ts`, replace the
resource's filter callback:

```ts
  // Re-fetches whenever the signed-in user or the status filter changes. The
  // resource supersedes any in-flight request. Admins see every challenge —
  // otherwise their edit override would be unreachable through the UI.
  private readonly challengesResource = this.challengeApi.challengesResource(() => ({
    status: this.statusFilter(),
    userId: this.auth.isAdmin() ? null : (this.auth.currentUser()?.id ?? null),
  }));
```

`challengesResource` already omits the param when `userId` is `null`, so no
service change is needed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --watch=false`
Expected: PASS — including the pre-existing `'scopes the fetch to the current
user'` test, which signs in a `Collaborator` and must still assert
`userId === '1'`.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/challenge-list
git commit -m "feat: list every challenge for admins"
```

---

### Task 4: Frontend — hide editing affordances from non-owners

**Repo:** `Team_Challenge_Hub_Angular`

**Files:**
- Modify: `src/app/features/challenge-detail/challenge-detail.component.ts`
- Modify: `src/app/features/challenge-detail/challenge-detail.component.html`
- Modify: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.ts`
- Modify: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.html`
- Test: `src/app/features/challenge-detail/challenge-detail.component.spec.ts`
- Test: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.spec.ts`

**Interfaces:**
- Consumes: `AuthService.currentUser` / `isAdmin` (already shipped).
- Produces: `ChallengeDetailComponent.canEdit: Signal<boolean>` —
  `isAdmin || challenge.submittedByUserId === currentUser.id`.
- Produces: `SolutionOptionsPanelComponent`'s `@Input() canEdit: boolean`
  (default `false`). When false the panel shows its heading and the read-only
  accepted-options list only.

Note there is **no Delete control** anywhere in this UI — `challenge-api.service.ts`
has no `deleteChallenge`/`deleteOption` method at all. Don't add one; Task 1
gates those endpoints server-side regardless.

- [ ] **Step 1: Write the failing tests**

Add to `src/app/features/challenge-detail/challenge-detail.component.spec.ts`.
Its `beforeEach` creates the component before any session exists, and
`fakeChallenge.submittedByUserId` is `1` — so seed the session first in each new
test by signing in through `AuthService` and flushing `/auth/signin`, then let
the existing `expectLoadRequest()` helper flush the challenge:

```ts
  function signInAs(id: number, username: string, role: 'Collaborator' | 'Admin') {
    TestBed.inject(AuthService).signIn(username, 'ChangeMe123!').subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/signin`).flush({ id, username, role });
  }

  it('lets the owner edit', () => {
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(component.canEdit()).toBe(true);
    expect(fixture.debugElement.query(By.css('.challenge-detail__header a'))).not.toBe(null);
  });

  it('hides the edit link from a non-owner collaborator', () => {
    signInAs(2, 'jordan.patel', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(component.canEdit()).toBe(false);
    expect(fixture.debugElement.query(By.css('.challenge-detail__header a'))).toBe(null);
  });

  it('lets an admin edit someone else\'s challenge', () => {
    signInAs(2, 'jordan.patel', 'Admin');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(component.canEdit()).toBe(true);
    expect(fixture.debugElement.query(By.css('.challenge-detail__header a'))).not.toBe(null);
  });

  it('hides the problem-statement panel from a non-owner', () => {
    signInAs(2, 'jordan.patel', 'Collaborator');
    // fakeChallenge is Submitted, so currentPanel() is 'problem-statement'.
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-problem-statement-panel'))).toBe(null);
  });
```

Add these imports to that spec file:

```ts
import { AuthService } from '../../core/auth/auth.service';
```

And add to
`src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.spec.ts`
(read its existing setup first and match it):

```ts
  it('hides the draft and select controls when canEdit is false', () => {
    const fixture = TestBed.createComponent(SolutionOptionsPanelComponent);
    fixture.componentInstance.challenge = {
      ...fakeChallenge,
      problemStatement: 'A statement.',
      status: 'OptionsDrafted',
      options: [
        { id: 1, text: 'An accepted option', isSelected: false, createdAt: '2026-07-29T00:00:00Z' },
      ],
    };
    fixture.componentInstance.canEdit = false;
    fixture.detectChanges();

    // The read-only list still renders...
    expect(fixture.nativeElement.textContent).toContain('An accepted option');
    // ...but nothing actionable does.
    expect(fixture.debugElement.queryAll(By.css('button')).length).toBe(0);
  });

  it('shows the draft and select controls when canEdit is true', () => {
    const fixture = TestBed.createComponent(SolutionOptionsPanelComponent);
    fixture.componentInstance.challenge = {
      ...fakeChallenge,
      problemStatement: 'A statement.',
      status: 'OptionsDrafted',
      options: [
        { id: 1, text: 'An accepted option', isSelected: false, createdAt: '2026-07-29T00:00:00Z' },
      ],
    };
    fixture.componentInstance.canEdit = true;
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('button')).length).toBeGreaterThan(0);
  });
```

If that spec file has no `fakeChallenge` fixture, build the object inline with
the same shape used in `challenge-detail.component.spec.ts` (`id`, `title`,
`rawNotes`, `problemStatement`, `status`, `submittedByUserId`, `createdAt`,
`updatedAt`, `options`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --watch=false`
Expected: FAIL — `component.canEdit` doesn't exist, and
`SolutionOptionsPanelComponent` has no `canEdit` input.

- [ ] **Step 3: Add `canEdit` to `challenge-detail`**

In `src/app/features/challenge-detail/challenge-detail.component.ts`, add the
`AuthService` injection and the computed signal:

```ts
  private readonly auth = inject(AuthService);
```

```ts
  // A challenge's content is owned; its workflow is shared. This mirrors the
  // API's rule so the UI doesn't offer writes that would 403 — it is an
  // affordance, not a security boundary.
  readonly canEdit = computed(() => {
    const challenge = this.challenge();
    const user = this.auth.currentUser();
    if (challenge === null || user === null) {
      return false;
    }
    return this.auth.isAdmin() || challenge.submittedByUserId === user.id;
  });
```

Add the import:

```ts
import { AuthService } from '../../core/auth/auth.service';
```

- [ ] **Step 4: Gate the template**

In `src/app/features/challenge-detail/challenge-detail.component.html`, wrap the
edit link:

```html
      @if (canEdit()) {
        <a mat-button [routerLink]="['/challenges', c.id, 'edit']">Edit Title</a>
      }
```

Then gate the problem-statement panel and pass the flag to the options panel:

```html
    @switch (currentPanel()) {
      @case ('problem-statement') {
        @if (canEdit()) {
          <app-problem-statement-panel [challenge]="c" (challengeUpdated)="onChallengeUpdated($event)" />
        }
      }
      @case ('solution-options') {
        <app-solution-options-panel
          [challenge]="c"
          [canEdit]="canEdit()"
          (challengeUpdated)="onChallengeUpdated($event)"
        />
      }
    }
```

The problem-statement panel is hidden outright because everything in it is an
editing affordance, and the accepted statement is already rendered by this
template's own read-only `challenge-detail__problem-statement` section. The
options panel stays visible because it is the only place accepted options are
shown. `app-status-stepper` is untouched — status is shared.

- [ ] **Step 5: Add the `canEdit` input to the options panel**

In `solution-options-panel.component.ts`, add next to the existing `@Input`:

```ts
  /** False for a non-owner: the accepted options stay visible, the controls don't. */
  @Input() canEdit = false;
```

In `solution-options-panel.component.html`, wrap the draft button, the draft
editor loop, and the Select button.

**Note the two components differ here:** `challenge-detail`'s `canEdit` is a
computed signal and is read as `canEdit()`; this panel's is a plain `@Input`
and is read as `canEdit`, with no parentheses. Writing `canEdit()` in this
template throws "canEdit is not a function" at runtime.

```html
  @if (canEdit && challenge.problemStatement) {
    <button mat-raised-button (click)="requestDrafts()" [disabled]="isDrafting()">
      {{ isDrafting() ? 'Drafting…' : 'Draft Solution Options' }}
    </button>
  }

  @if (canEdit) {
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
  }
```

and inside the accepted-options list, the Select button's condition gains
`canEdit`:

```html
          } @else if (canEdit && challenge.status === 'OptionsDrafted') {
            <button mat-button (click)="selectOption(option.id)">Select</button>
          }
```

Leave the `<h3>`, the accepted-options `<ul>`, and the `Selected` marker
ungated — those are read-only.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- --watch=false`
Expected: PASS — the six new tests plus every pre-existing one. Pre-existing
`challenge-detail` and `solution-options-panel` tests that exercised the
controls now need a session or `canEdit = true`; if one fails, seed it the same
way rather than loosening the assertion.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/challenge-detail
git commit -m "feat: hide challenge editing controls from non-owners"
```

---

### Task 5: Document the ownership rule

**Repo:** `Team_Challenge_Hub_Angular` (plus one file in the API repo)

**Files:**
- Modify: `CLAUDE.md` (Angular repo)
- Modify: `README.md` (API repo)

**Interfaces:**
- Consumes: everything above. No code changes.

- [ ] **Step 1: Update the Angular repo's CLAUDE.md**

In the **Data flow** section, add a bullet after the existing auth bullet:

```markdown
- A challenge's content is owned, its workflow is shared. Only the owner
  (`submittedByUserId`) or an `Admin` may change a challenge's title, problem
  statement, or options — the API returns 403 otherwise, and
  `challenge-detail` hides those controls via its `canEdit` computed. Status
  transitions stay open to every signed-in user, so a challenge can be reviewed
  by someone other than its author. The challenge list is scoped to the signed-in
  user, except for admins, who see every challenge.
```

- [ ] **Step 2: Update the API repo's README**

In `C:\Projects\Team_Challenge_Hub_Planning\Team_Challenge_Hub_API\README.md`,
add to the **Authentication** section:

```markdown
Challenge content is owner-or-admin: `PUT /api/challenges/{id}`, its two option
`POST`/`DELETE` routes, and the option-select route return 403 unless the caller
owns the challenge or is an `Admin`. A missing challenge is still 404 — existence
is checked before ownership. `PUT /api/challenges/{id}/status` is deliberately
NOT owner-gated, so a challenge can be reviewed by someone other than its author.
```

- [ ] **Step 3: Verify both suites once more**

In the API repo: `dotnet test` — expected PASS.
In the Angular repo: `npm test -- --watch=false` — expected PASS.

- [ ] **Step 4: Commit (one commit per repo)**

```bash
# In Team_Challenge_Hub_Angular
git add CLAUDE.md
git commit -m "docs: describe challenge ownership"
```

```bash
# In Team_Challenge_Hub_API
git add README.md
git commit -m "docs: describe challenge ownership"
```

---

## Deferred / accepted gaps

Carried over from the specs, deliberately not built here:

- **No e2e test.** Proving the rule end-to-end needs two concurrent Playwright
  browser contexts so user B can open user A's challenge. Covered at the
  component layer and by API integration tests instead.
- **404-before-403 leaks existence.** A non-owner learns that a challenge id
  exists. Accepted at trusted-team scale; collapsing both to 404 would stop
  legitimate users from telling a dead link from a forbidden one.
- No ownership transfer, no co-owners, no per-challenge permission grants.
- No ownership indicator on list cards — an admin viewing the full list can't
  tell at a glance whose challenge is whose.
