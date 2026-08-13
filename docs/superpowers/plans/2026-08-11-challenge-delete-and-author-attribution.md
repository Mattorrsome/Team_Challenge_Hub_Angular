# Challenge Delete & Author Attribution (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user delete their own challenge from the detail page, and show who authored a challenge whenever it isn't the viewer's own.

**Architecture:** Two independent features in one plan. Delete is pure frontend — `DELETE /api/challenges/{id}` has been implemented, authorized owner-or-admin, and integration-tested since 2026-08-05, but no service method or UI ever called it. The existing `canEdit` computed already encodes the exact ownership rule, so the new control reuses it rather than restating it. Attribution reads a new `submittedByName` field off the challenge response, so it needs no extra request, no id→name map, and no admin gate — a collaborator's list is already scoped to their own challenges, so "not yours" alone is the right condition on both screens.

**Tech Stack:** Angular 22 standalone components, signals + `computed`, Angular Material, RxJS, Vitest (`@angular/build:unit-test`), Playwright.

**Spec:** `docs/specs/2026-08-11-challenge-delete-and-author-attribution-frontend.md`

**Companion plan (must ship first):** `../../../Team_Challenge_Hub_API/docs/superpowers/plans/backend-plan.md` — Task 3 below consumes the `submittedByName` field that plan adds. Tasks 1 and 2 do not depend on it and can proceed in parallel with the API work.

## Global Constraints

- **`canEdit` is a UX affordance, not a security boundary.** The API's `DenyIfCannotEdit` is the enforcement point. Never add a second copy of the ownership rule — reuse the existing computed.
- **Do not add a new interceptor branch.** `errorHandlingInterceptor` already handles 401, 403, 409, and 5xx. Only the 404-on-delete case is new, and it belongs in the component.
- **Components never inject `HttpClient`.** All HTTP goes through `ChallengeApiService`.
- **Every component keeps separate `.ts` / `.html` / `.scss` files** — no inline `template` or `styles`.
- **`OnPush` change detection stays on** every component touched here.
- Test runner is **Vitest, not Jasmine**: use `.toBe(true)`, never `toBeTrue()`. `vi` and `expect` are globals — no import needed. Run with `npx ng test --watch=false` (the repo's CLAUDE.md explicitly warns against `--include=`).
- Baseline before starting: `npx ng test --watch=false` reports **105 passed, 19 files**.

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/app/core/models/challenge.model.ts` | Mirrors the API DTO | Add `submittedByName: string` |
| `src/app/core/services/challenge-api.service.ts` | Challenge HTTP | Add `deleteChallenge` |
| `src/app/features/challenge-detail/challenge-detail.component.ts` | Detail page state | Add `onDelete`, `authorName`, inject `Router` |
| `src/app/features/challenge-detail/challenge-detail.component.html` | Detail markup | Delete button; author byline |
| `src/app/features/challenge-detail/challenge-detail.component.scss` | Detail styling | `&__author` block |
| `src/app/features/challenge-list/challenge-list.component.ts` | List state | Add `myId` |
| `src/app/features/challenge-list/challenge-list.component.html` | List markup | `mat-card-subtitle` |
| `e2e/challenge-flow.spec.ts` | Lifecycle e2e | Delete step appended |

Five spec files declare `const fakeChallenge: Challenge` and stop compiling when the model gains a required field. Task 3 fixes all five. `challenge-list.component.spec.ts` builds its challenge inline inside `flush()`, which is untyped — it compiles unchanged and must be updated by hand in Task 4.

---

### Task 1: Add `deleteChallenge` to the challenge API service

**Files:**
- Modify: `src/app/core/services/challenge-api.service.ts` (append after `updateStatus`, currently ending line 93)
- Test: `src/app/core/services/challenge-api.service.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `deleteChallenge(id: number): Observable<void>` on `ChallengeApiService`. Task 2 calls it.

- [ ] **Step 1: Write the failing test**

Add to `src/app/core/services/challenge-api.service.spec.ts`, inside the `describe('ChallengeApiService')` block, after the last existing test:

```ts
  it('sends a DELETE to the challenge URL', () => {
    const api = TestBed.inject(ChallengeApiService);

    api.deleteChallenge(7).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/challenges/7`);
    expect(req.request.method).toBe('DELETE');

    req.flush(null);
    httpMock.verify();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`

Expected: a **TypeScript compile error**, not a test failure:

```
error TS2339: Property 'deleteChallenge' does not exist on type 'ChallengeApiService'.
```

- [ ] **Step 3: Add the method**

In `src/app/core/services/challenge-api.service.ts`, append inside the class, after `updateStatus`:

```ts
  deleteChallenge(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
```

`Observable` is already imported at the top of the file. No other import is needed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx ng test --watch=false`

Expected: **106 passed** (105 baseline + 1 new), 0 failed.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/challenge-api.service.ts src/app/core/services/challenge-api.service.spec.ts
git commit -m "feat: add deleteChallenge to the challenge API service"
```

---

### Task 2: Delete control on the challenge detail page

Gated by the existing `canEdit`. On success, and on a 404 (someone else deleted it first), navigate to the list — in both cases the challenge is gone, which is what the user asked for. 401, 403, and 5xx are left entirely to `errorHandlingInterceptor`.

**Files:**
- Modify: `src/app/features/challenge-detail/challenge-detail.component.ts`
- Modify: `src/app/features/challenge-detail/challenge-detail.component.html:6-8`
- Test: `src/app/features/challenge-detail/challenge-detail.component.spec.ts`

**Interfaces:**
- Consumes: `ChallengeApiService.deleteChallenge(id: number): Observable<void>` from Task 1; the existing `canEdit: Signal<boolean>` computed.
- Produces: `onDelete(challenge: Challenge): void` on `ChallengeDetailComponent`.

- [ ] **Step 1: Add mock cleanup to the existing spec's afterEach**

`vi.spyOn` on `window.confirm` and on `Router.navigate` must not leak between tests. In `src/app/features/challenge-detail/challenge-detail.component.spec.ts`, replace the existing `afterEach` (lines 47-49):

```ts
  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });
```

- [ ] **Step 2: Write the failing tests**

Add `Router` to the existing `@angular/router` import at the top of the same file, so line 2 becomes:

```ts
import { ActivatedRoute, Router } from '@angular/router';
```

Then add these five tests inside `describe('ChallengeDetailComponent')`, after the last existing test:

```ts
  it('shows a delete button to the owner', () => {
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.challenge-detail__header button'))).not.toBe(null);
  });

  it('hides the delete button from a non-owner collaborator', () => {
    signInAs(2, 'jordan.patel', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.challenge-detail__header button'))).toBe(null);
  });

  it('shows a delete button to an admin on someone else\'s challenge', () => {
    // fakeChallenge is submittedByUserId 1, so this admin is not the owner.
    signInAs(2, 'jordan.patel', 'Admin');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.challenge-detail__header button'))).not.toBe(null);
  });

  it('sends no request when the delete confirmation is declined', () => {
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    fixture.debugElement
      .query(By.css('.challenge-detail__header button'))
      .nativeElement.click();

    // afterEach's httpMock.verify() would fail if a DELETE had been issued.
    httpMock.expectNone(`${environment.apiBaseUrl}/challenges/1`);
  });

  it('navigates to the list after a successful delete', () => {
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.debugElement
      .query(By.css('.challenge-detail__header button'))
      .nativeElement.click();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/challenges/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(navigate).toHaveBeenCalledWith(['/challenges']);
  });

  it('navigates to the list when the challenge was already deleted', () => {
    // A 404 means someone else deleted it first. The user's goal is met, so
    // this is not an error to report.
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.debugElement
      .query(By.css('.challenge-detail__header button'))
      .nativeElement.click();

    httpMock
      .expectOne(`${environment.apiBaseUrl}/challenges/1`)
      .flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(navigate).toHaveBeenCalledWith(['/challenges']);
  });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx ng test --watch=false`

Expected: **5 of the 6 new tests fail.**

- `shows a delete button to the owner` and `shows a delete button to an admin…` fail with `expected null not to be null` — no button in the template yet.
- The three behaviour tests fail because clicking `null` throws:

```
TypeError: Cannot read properties of null (reading 'nativeElement')
```

- `hides the delete button from a non-owner collaborator` **passes vacuously** — there is no button for anyone yet. That is expected; it becomes meaningful after Step 5.

(That is 2 + 3 = 5 failures against 6 new tests; the sixth is the vacuous pass.)

- [ ] **Step 4: Implement `onDelete` in the component**

In `src/app/features/challenge-detail/challenge-detail.component.ts`:

Change the `@angular/router` import (line 2) to add `Router`:

```ts
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
```

Add an import for `HttpErrorResponse` below it:

```ts
import { HttpErrorResponse } from '@angular/common/http';
```

Add the router to the injected dependencies, after `private readonly auth = inject(AuthService);`:

```ts
  private readonly router = inject(Router);
```

Add the method after `onChallengeUpdated`:

```ts
  onDelete(challenge: Challenge): void {
    // Deletion is immediate and cascades this challenge's options — there is no
    // undo, so this prompt is the only thing between a mis-click and a removed
    // row. Same call the user-management view makes, for the same reason.
    if (!confirm(`Delete "${challenge.title}"?`)) {
      return;
    }

    this.challengeApi.deleteChallenge(challenge.id).subscribe({
      next: () => this.router.navigate(['/challenges']),
      error: (err: HttpErrorResponse) => {
        // 404 means someone else deleted it first, so the user's goal is already
        // met — reporting a failure would be wrong. 401/403/5xx are surfaced by
        // errorHandlingInterceptor, so there is nothing to add for them here.
        if (err.status === 404) {
          this.router.navigate(['/challenges']);
        }
      },
    });
  }
```

- [ ] **Step 5: Add the button to the template**

In `src/app/features/challenge-detail/challenge-detail.component.html`, replace the `@if (canEdit())` block at lines 6-8:

```html
      @if (canEdit()) {
        <a mat-button [routerLink]="['/challenges', c.id, 'edit']">Edit Title</a>
        <button mat-button color="warn" (click)="onDelete(c)">Delete</button>
      }
```

`MatButtonModule` is already in the component's `imports`. `app-status-badge` renders a `<span>`, so `.challenge-detail__header button` selects this button and nothing else.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx ng test --watch=false`

Expected: **111 passed** (106 + 5 new), 0 failed. The pre-existing tests that query `.challenge-detail__header a` still pass — they select the anchor, not the new button.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/challenge-detail/challenge-detail.component.ts src/app/features/challenge-detail/challenge-detail.component.html src/app/features/challenge-detail/challenge-detail.component.spec.ts
git commit -m "feat: delete a challenge from the detail page"
```

---

### Task 3: Author byline on the challenge detail page

Requires the companion API plan to have shipped. Adds the model field, repairs the five fixtures the required field breaks, and renders the byline.

**Files:**
- Modify: `src/app/core/models/challenge.model.ts:28-38`
- Modify: `src/app/features/challenge-detail/challenge-detail.component.ts`
- Modify: `src/app/features/challenge-detail/challenge-detail.component.html`
- Modify: `src/app/features/challenge-detail/challenge-detail.component.scss`
- Test: `src/app/features/challenge-detail/challenge-detail.component.spec.ts`
- Fixture repair: `challenge-form.component.spec.ts:69`, `challenge-detail.component.spec.ts:16`, `status-stepper.component.spec.ts:11`, `problem-statement-panel.component.spec.ts:12`, `solution-options-panel.component.spec.ts:12`

**Interfaces:**
- Consumes: `submittedByName: string` on the API's `ChallengeDto` (companion plan, Task 1).
- Produces: `Challenge.submittedByName: string`; `authorName: Signal<string | null>` on `ChallengeDetailComponent`. Task 4 consumes the model field.

- [ ] **Step 1: Add the field to the model**

In `src/app/core/models/challenge.model.ts`, add one line to the `Challenge` interface, immediately after `submittedByUserId`:

```ts
export interface Challenge {
  id: number;
  title: string;
  rawNotes: string;
  problemStatement: string | null;
  status: ChallengeStatus;
  submittedByUserId: number;
  submittedByName: string;
  createdAt: string;
  updatedAt: string;
  options: SolutionOption[];
}
```

- [ ] **Step 2: Run the tests to confirm the five fixtures now fail to compile**

Run: `npx ng test --watch=false`

Expected: **compile errors in five spec files**, each of the form:

```
error TS2741: Property 'submittedByName' is missing in type '{ id: number; ... }'
  but required in type 'Challenge'.
```

This is the intended safety net — it proves no annotated fixture can silently omit the field.

- [ ] **Step 3: Repair all five fixtures**

In each of the five files below, add `submittedByName` to the `const fakeChallenge: Challenge` object literal, directly after its `submittedByUserId` line. The value must be a real name so a byline assertion is meaningful:

```ts
    submittedByName: 'Alex Kim',
```

Files, with the line each literal starts on:
- `src/app/features/challenge-detail/challenge-detail.component.spec.ts:16`
- `src/app/features/challenge-form/challenge-form.component.spec.ts:69`
- `src/app/features/challenge-detail/status-stepper/status-stepper.component.spec.ts:11`
- `src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.spec.ts:12`
- `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.spec.ts:12`

- [ ] **Step 4: Run the tests to confirm the suite compiles and passes again**

Run: `npx ng test --watch=false`

Expected: **111 passed**, 0 failed — same count as the end of Task 2, with no new behaviour yet.

- [ ] **Step 5: Write the failing byline tests**

Add to `src/app/features/challenge-detail/challenge-detail.component.spec.ts`, after the delete tests:

```ts
  it('names the author on someone else\'s challenge', () => {
    // fakeChallenge is submittedByUserId 1; sign in as a different user.
    signInAs(2, 'jordan.patel', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    const byline = fixture.debugElement.query(By.css('.challenge-detail__author'));
    expect(byline).not.toBeNull();
    expect(byline.nativeElement.textContent).toContain('Alex Kim');
  });

  it('does not name the author on your own challenge', () => {
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.challenge-detail__author'))).toBeNull();
  });
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx ng test --watch=false`

Expected: the first new test fails with `expected null not to be null` (no byline element rendered yet). The second passes vacuously — it will still be meaningful once Step 7 lands.

- [ ] **Step 7: Add the `authorName` computed**

In `src/app/features/challenge-detail/challenge-detail.component.ts`, add after the existing `canEdit` computed:

```ts
  // Shown only on a challenge that isn't yours. No admin gate is needed: a
  // collaborator's list is scoped to their own challenges, so this renders for
  // an admin browsing the unscoped list, and for anyone who opens a peer's
  // challenge by URL.
  readonly authorName = computed(() => {
    const challenge = this.challenge();
    const user = this.auth.currentUser();
    if (challenge === null || user === null || challenge.submittedByUserId === user.id) {
      return null;
    }
    return challenge.submittedByName;
  });
```

`computed` is already imported from `@angular/core` on line 1.

- [ ] **Step 8: Render the byline**

In `src/app/features/challenge-detail/challenge-detail.component.html`, add immediately after the closing `</div>` of `.challenge-detail__header` and before `<app-status-stepper …>`:

```html
    @if (authorName(); as author) {
      <p class="challenge-detail__author">Submitted by {{ author }}</p>
    }
```

The byline sits below the header row rather than inside it — the header is a flex row already holding the title, status badge, and two controls, and a bare name there would read as another control. The wording differs from the list card's bare name deliberately: a card subtitle sits directly under its title and needs no label, whereas a standalone line on the detail page does.

- [ ] **Step 9: Style the byline**

In `src/app/features/challenge-detail/challenge-detail.component.scss`, add inside the `.challenge-detail` block, after the `&__header` block:

```scss
  &__author {
    // .challenge-detail is a flex column with a 1rem gap, so spacing is already
    // handled — this only kills the default <p> margin.
    margin: 0;
    color: var(--mat-sys-on-surface-variant);
  }
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npx ng test --watch=false`

Expected: **113 passed** (111 + 2 new), 0 failed. The pre-existing "renders the status stepper below the header" test still passes — its assertions are relative (`stepperIndex > headerIndex`), so the extra element between them does not break it.

- [ ] **Step 11: Commit**

```bash
git add src/app/core/models/challenge.model.ts src/app/features/challenge-detail src/app/features/challenge-form/challenge-form.component.spec.ts
git commit -m "feat: name the author on another user's challenge detail page"
```

---

### Task 4: Author byline on the challenge list cards

**Files:**
- Modify: `src/app/features/challenge-list/challenge-list.component.ts`
- Modify: `src/app/features/challenge-list/challenge-list.component.html:24-29`
- Test: `src/app/features/challenge-list/challenge-list.component.spec.ts`

**Interfaces:**
- Consumes: `Challenge.submittedByName` from Task 3.
- Produces: `myId: Signal<number | null>` on `ChallengeListComponent`.

- [ ] **Step 1: Write the failing test**

Add to `src/app/features/challenge-list/challenge-list.component.spec.ts`, after the last existing test. Note this file builds challenges inline inside `flush()`, which is untyped — the compiler will not demand `submittedByName`, so it is added by hand here:

```ts
  it('names the author only on challenges that are not your own', async () => {
    // The beforeEach signed in as id 1; the admin session is what makes a list
    // containing another user's challenge reachable.
    TestBed.inject(AuthService).signIn('alex.kim', 'ChangeMe123!').subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/signin`)
      .flush({ id: 1, username: 'alex.kim', role: 'Admin' });

    const fixture = TestBed.createComponent(ChallengeListComponent);
    TestBed.tick();
    httpMock.expectOne((r) => r.url === listUrl).flush([
      {
        id: 1,
        title: 'Mine',
        rawNotes: 'Notes.',
        problemStatement: null,
        status: 'Submitted',
        submittedByUserId: 1,
        submittedByName: 'Alex Kim',
        createdAt: '2026-07-29T00:00:00Z',
        updatedAt: '2026-07-29T00:00:00Z',
        options: [],
      },
      {
        id: 2,
        title: 'Theirs',
        rawNotes: 'Notes.',
        problemStatement: null,
        status: 'Submitted',
        submittedByUserId: 2,
        submittedByName: 'Jordan Patel',
        createdAt: '2026-07-29T00:00:00Z',
        updatedAt: '2026-07-29T00:00:00Z',
        options: [],
      },
    ]);
    await Promise.resolve();
    TestBed.tick();
    fixture.detectChanges();

    const subtitles = fixture.debugElement
      .queryAll(By.css('mat-card-subtitle'))
      .map((el) => el.nativeElement.textContent.trim());

    expect(subtitles).toEqual(['Jordan Patel']);
    httpMock.verify();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`

Expected: **FAIL** — `expected [] to deeply equal [ 'Jordan Patel' ]`. No subtitle is rendered yet.

- [ ] **Step 3: Add the `myId` computed**

In `src/app/features/challenge-list/challenge-list.component.ts`, add `computed` to the `@angular/core` import on line 1:

```ts
import { ChangeDetectionStrategy, Component, Signal, computed, inject, signal } from '@angular/core';
```

Then add after `readonly loading: Signal<boolean> = this.challengesResource.isLoading;`:

```ts
  // A collaborator's list is already scoped to their own challenges, so the
  // "not mine" comparison alone is the whole rule — no admin gate needed.
  readonly myId = computed(() => this.auth.currentUser()?.id ?? null);
```

- [ ] **Step 4: Render the subtitle**

In `src/app/features/challenge-list/challenge-list.component.html`, replace the `<mat-card>` block at lines 24-29:

```html
          <mat-card>
            <mat-card-title class="challenge-list__card-title">{{ challenge.title }}</mat-card-title>
            @if (challenge.submittedByUserId !== myId()) {
              <mat-card-subtitle>{{ challenge.submittedByName }}</mat-card-subtitle>
            }
            <mat-card-content>
              <app-status-badge [status]="challenge.status" />
            </mat-card-content>
          </mat-card>
```

`MatCardModule` is already imported by the component, and it exports `MatCardSubtitle` — no import change is needed.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx ng test --watch=false`

Expected: **114 passed** (113 + 1 new), 0 failed.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/challenge-list
git commit -m "feat: name the author on other users' challenge list cards"
```

---

### Task 5: End-to-end delete step

Appends deletion to the existing lifecycle flow, which already signs in, creates a challenge, and drives it through drafting. It is the natural teardown for that spec, and it exercises the native confirm dialog and the redirect against the real API.

**Files:**
- Modify: `e2e/challenge-flow.spec.ts:32-36`

**Interfaces:**
- Consumes: the Delete button from Task 2 and the redirect it performs.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Start the sibling API**

The e2e suite drives a real backend. In the sibling repo, run:

```bash
dotnet run --project src/TeamChallengeHub.Api --launch-profile http
```

It **must** be the `http` profile. The `https` profile binds both ports, so `UseHttpsRedirection()` 307s a proxied request on 5179 to the HTTPS origin — cross-origin from the browser's view, which drops the `SameSite=Lax` session cookie and fails every authenticated request. Leave this running for the steps below. Note it writes to the API's dev SQLite database, so rows created here persist there.

- [ ] **Step 2: Write the failing step**

In `e2e/challenge-flow.spec.ts`, replace the final block (lines 32-36, from the `// Verify it appears in the list` comment through the closing `});`):

```ts
  // Verify it appears in the list with the updated status.
  await page.goto('/challenges');
  const card = page.getByText(title).locator('..');
  await expect(card.getByText('Problem Statement Drafted')).toBeVisible();

  // Delete it from the detail page, accepting the native confirm dialog. The
  // handler must be registered before the click — a pending dialog blocks every
  // later browser action until it is answered.
  await page.getByText(title).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page).toHaveURL(/\/challenges$/);
  await expect(page.getByText(title)).toHaveCount(0);
});
```

- [ ] **Step 3: Run the e2e suite to verify the new step fails**

With `ng serve` running (`npm start`) and the API from Step 1 up, run:

```bash
npm run e2e
```

Expected: **FAIL** at `getByRole('button', { name: 'Delete' })` with a timeout, if Task 2 has not landed. If Tasks 1-4 are already committed, this step passes on the first run — that is fine, record it and move on rather than manufacturing a failure.

- [ ] **Step 4: Run the e2e suite to verify it passes**

Run: `npm run e2e`

Expected: **1 passed**. The challenge created by this run is deleted by it, so the dev database is left as it was found.

- [ ] **Step 5: Run the full unit suite one last time**

Run: `npx ng test --watch=false`

Expected: **114 passed**, 0 failed.

- [ ] **Step 6: Commit**

```bash
git add e2e/challenge-flow.spec.ts
git commit -m "test: cover challenge deletion end to end"
```

---

## Done when

- `npx ng test --watch=false` reports **114 passed, 0 failed**.
- `npm run e2e` reports **1 passed** against a running API on the `http` profile.
- The detail page shows Delete beside Edit Title for an owner or an admin, and neither control for a non-owner collaborator.
- A challenge that isn't yours shows its author on both the list card and the detail page; your own shows neither.
- No new interceptor branch was added, and `canEdit` is still the only place the ownership rule is written.
