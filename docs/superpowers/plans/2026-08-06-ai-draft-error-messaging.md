# AI Draft Failure Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the server's message inline when an AI draft request fails, instead of the generic "Something went wrong" snackbar.

**Architecture:** The API now returns `503 { "error": "<message>" }` from both draft endpoints. One narrow exclusion in `errorHandlingInterceptor` stops draft failures from raising the generic ≥ 500 snackbar, and each draft panel gains a `draftError` signal rendered next to its generate button. No new component, service, model, or route.

**Tech Stack:** Angular 22 standalone components, signals, Angular Material, Vitest (`@angular/build:unit-test`).

**Spec:** `docs/specs/2026-08-06-ai-draft-error-handling-design.md`
**Companion API plan:** `../../../Team_Challenge_Hub_API/docs/superpowers/plans/backend-plan.md` — implement that one first, so there is a real 503 to test against.

## Global Constraints

- Test runner is **Vitest**, not Jasmine. Use Vitest matchers (`.toBe(true)`, not `toBeTrue()`), and `vi.spyOn` rather than `jasmine.createSpy`. `describe`/`it`/`expect`/`vi` are globals — do not import them.
- Run the suite with `npm test -- --watch=false`. Do **not** use `--include=...`; it is unsupported by this builder.
- Components keep `ChangeDetectionStrategy.OnPush`. A signal read in the template is enough to refresh.
- Component files keep the legacy `.component` suffix and separate `.ts` / `.html` / `.scss` files. No inline templates or styles.
- Do not change how drafts are requested, edited, accepted, or saved. AI output must keep landing in an editable field behind an explicit accept action — never wire a draft response to a persisting call.
- Do not modify `ChallengeApiService` or any model. The success-path response shape is unchanged.
- CSS class names follow the existing BEM style in these templates (`problem-statement-panel__field`, `solution-options-panel__draft`).
- Run all commands from the repo root (`Team_Challenge_Hub_Angular/`).

---

### Task 1: Interceptor exclusion for draft failures

**Files:**
- Modify: `src/app/core/interceptors/error-handling.interceptor.ts:34`
- Test: `src/app/core/interceptors/error-handling.interceptor.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: any response with status ≥ 500 on a URL containing `/draft-` no longer opens a snackbar. Every other ≥ 500 response still does. Panels can therefore own the message for draft calls.

- [ ] **Step 1: Write the failing tests**

Add both tests to the existing `describe('errorHandlingInterceptor', ...)` block in `src/app/core/interceptors/error-handling.interceptor.spec.ts`, after the last `it(...)`:

```typescript
  it('does not open a snackbar on a 503 for a draft URL — the panel shows it inline', () => {
    http
      .post('/api/challenges/1/draft-problem-statement', {})
      .subscribe({ error: () => {} });

    httpMock
      .expectOne('/api/challenges/1/draft-problem-statement')
      .flush(
        { error: 'AI drafting is unavailable right now. Please try again.' },
        { status: 503, statusText: 'Service Unavailable' },
      );

    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('still opens the generic snackbar on a 500 for a non-draft URL', () => {
    http.get('/api/challenges').subscribe({ error: () => {} });

    httpMock
      .expectOne('/api/challenges')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(snackBar.open).toHaveBeenCalledWith(
      'Something went wrong. Please try again.',
      'Dismiss',
      { duration: 5000 },
    );
  });
```

The second test matters as much as the first: the file currently has **no** coverage of the ≥ 500 branch, so without it the exclusion could disable that branch entirely and nothing would notice.

- [ ] **Step 2: Run the tests to verify one fails**

Run: `npm test -- --watch=false`
Expected: the draft-503 test FAILS (the snackbar is opened), the non-draft 500 test PASSES already. Everything else stays green.

- [ ] **Step 3: Add the exclusion**

In `src/app/core/interceptors/error-handling.interceptor.ts`, change the ≥ 500 branch (line 34) from:

```typescript
      } else if (error.status >= 500) {
```

to:

```typescript
      } else if (error.status >= 500 && !req.url.includes('/draft-')) {
        // The two AI draft endpoints answer 503 with a specific message, which
        // the draft panels render inline next to their generate button. A
        // snackbar on top of that would say "something went wrong" over an
        // explanation the user can already read.
```

Keep the existing `snackBar.open('Something went wrong. Please try again.', ...)` call as the branch body. Both draft routes end in `/draft-problem-statement` and `/draft-solution-options`, so one substring covers both and matches nothing else.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --watch=false`
Expected: PASS, including both new tests and all pre-existing interceptor tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/interceptors/error-handling.interceptor.ts \
        src/app/core/interceptors/error-handling.interceptor.spec.ts
git commit -m "fix: let draft panels own their own error message

AI draft endpoints return 503 with a specific message. Excluding /draft- from
the generic >=500 snackbar stops it covering that message with 'something
went wrong'. Adds coverage of the >=500 branch, which had none."
```

---

### Task 2: Inline error in the problem statement panel

**Files:**
- Modify: `src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.ts:47-58`
- Modify: `src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.html`
- Modify: `src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.scss`
- Test: `src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.spec.ts`

**Interfaces:**
- Consumes: the interceptor exclusion from Task 1 (without it the snackbar also fires; the tests here still pass, but the UX is wrong).
- Produces: `ProblemStatementPanelComponent.draftError: Signal<string | null>` — the server's message on failure, `null` otherwise.

- [ ] **Step 1: Write the failing tests**

Add to `src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.spec.ts`. Add the import at the top of the file:

```typescript
import { HttpTestingController } from '@angular/common/http/testing';
```

Then add these tests inside the existing `describe` block:

```typescript
  it('shows the server message when drafting fails', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDraft();
    httpMock
      .expectOne('/api/challenges/1/draft-problem-statement')
      .flush(
        { error: 'AI drafting is unavailable right now. Please try again.' },
        { status: 503, statusText: 'Service Unavailable' },
      );

    expect(component.draftError()).toBe('AI drafting is unavailable right now. Please try again.');
    expect(component.isDrafting()).toBe(false);
    // A failed draft must not overwrite what the user has in the field.
    expect(component.draftText()).toBe('');
  });

  it('falls back to a generic message when the failure has no body', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDraft();
    httpMock
      .expectOne('/api/challenges/1/draft-problem-statement')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(component.draftError()).toBe('AI drafting is unavailable. Please try again.');
  });

  it('clears the error when a later draft succeeds', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDraft();
    httpMock
      .expectOne('/api/challenges/1/draft-problem-statement')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    expect(component.draftError()).not.toBeNull();

    component.requestDraft();
    httpMock
      .expectOne('/api/challenges/1/draft-problem-statement')
      .flush({ problemStatement: 'Problem: slow deploys.' });

    expect(component.draftError()).toBeNull();
    expect(component.draftText()).toBe('Problem: slow deploys.');
  });
```

The URL is `/api/challenges/1/draft-problem-statement` because `ChallengeApiService` builds `${environment.apiBaseUrl}/challenges` and `environment.apiBaseUrl` is `/api`, and the fixture's `fakeChallenge.id` is `1`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --watch=false`
Expected: FAIL — `component.draftError` does not exist (TypeScript error).

- [ ] **Step 3: Add the signal to the component**

In `src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.ts`, add `HttpErrorResponse` to the imports:

```typescript
import { HttpErrorResponse } from '@angular/common/http';
```

Add the signal next to the existing ones (after `isDrafting`, line 40):

```typescript
  /** Server message from a failed draft request, shown inline. */
  readonly draftError = signal<string | null>(null);
```

Replace `requestDraft()` (lines 47-58) with:

```typescript
  requestDraft(): void {
    this.isDrafting.set(true);
    this.draftError.set(null);
    this.challengeApi.draftProblemStatement(this.challenge.id).subscribe({
      next: (response) => {
        this.draftText.set(response.problemStatement);
        this.isDrafting.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isDrafting.set(false);
        // The API sends { error: "..." } on a 503. The fallback covers a
        // network or proxy failure, where there is no body to read, and a
        // non-string body (error.error is `any`, so it isn't guaranteed).
        const message = typeof error.error?.error === 'string' ? error.error.error : null;
        this.draftError.set(message ?? 'AI drafting is unavailable. Please try again.');
      },
    });
  }
```

- [ ] **Step 4: Render it in the template**

In `src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.html`, add the block immediately before the closing `</div>` (after the `@if / @else` block, line 14):

```html
  @if (draftError()) {
    <p class="problem-statement-panel__error" role="alert">{{ draftError() }}</p>
  }
```

Placing it after the whole conditional rather than inside the button branch keeps it visible regardless of which branch renders. `role="alert"` matters here: the generic ≥ 500 snackbar is excluded for `/draft-` calls (Task 1), so this paragraph is the only signal a screen reader user gets that the request failed.

- [ ] **Step 5: Style it**

Nest the error rule inside the parent selector, matching `challenge-form.component.scss`'s `&__server-errors` convention, using the theme token instead of a literal hex so it stays readable in dark mode:

```scss
.problem-statement-panel {
  padding: 1rem 0;

  &__field {
    width: 100%;
  }

  &__error {
    color: var(--mat-sys-error);
    font-size: 0.875rem;
    margin: 8px 0 0;
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- --watch=false`
Expected: PASS, including the three new tests and the existing "should create".

- [ ] **Step 7: Commit**

```bash
git add src/app/features/challenge-detail/problem-statement-panel/
git commit -m "feat: show draft failures inline in the problem statement panel

A failed draft now renders the API's 503 message next to the button instead
of silently resetting the spinner, with a fallback for body-less failures."
```

---

### Task 3: Inline error in the solution options panel

Same shape as Task 2 against a different component. The code is repeated rather than referenced so this task can be implemented without reading Task 2.

**Files:**
- Modify: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.ts:38-49`
- Modify: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.html`
- Modify: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.scss`
- Test: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.spec.ts`

**Interfaces:**
- Consumes: the interceptor exclusion from Task 1.
- Produces: `SolutionOptionsPanelComponent.draftError: Signal<string | null>`.

- [ ] **Step 1: Write the failing tests**

Add the import at the top of `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.spec.ts`:

```typescript
import { HttpTestingController } from '@angular/common/http/testing';
```

Add these tests inside the existing `describe` block:

```typescript
  it('shows the server message when drafting options fails', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDrafts();
    httpMock
      .expectOne('/api/challenges/1/draft-solution-options')
      .flush(
        { error: 'AI drafting is unavailable right now. Please try again.' },
        { status: 503, statusText: 'Service Unavailable' },
      );

    expect(component.draftError()).toBe('AI drafting is unavailable right now. Please try again.');
    expect(component.isDrafting()).toBe(false);
    expect(component.draftOptions()).toEqual([]);
  });

  it('falls back to a generic message when the failure has no body', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDrafts();
    httpMock
      .expectOne('/api/challenges/1/draft-solution-options')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(component.draftError()).toBe('AI drafting is unavailable. Please try again.');
  });

  it('clears the error when a later draft succeeds', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDrafts();
    httpMock
      .expectOne('/api/challenges/1/draft-solution-options')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    expect(component.draftError()).not.toBeNull();

    component.requestDrafts();
    httpMock
      .expectOne('/api/challenges/1/draft-solution-options')
      .flush({ options: ['Automate the gates.', 'Split the pipeline.'] });

    expect(component.draftError()).toBeNull();
    expect(component.draftOptions().length).toBe(2);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --watch=false`
Expected: FAIL — `component.draftError` does not exist (TypeScript error).

- [ ] **Step 3: Add the signal to the component**

In `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.ts`, add the import:

```typescript
import { HttpErrorResponse } from '@angular/common/http';
```

Add the signal after `isDrafting` (line 36):

```typescript
  /** Server message from a failed draft request, shown inline. */
  readonly draftError = signal<string | null>(null);
```

Replace `requestDrafts()` (lines 38-49) with:

```typescript
  requestDrafts(): void {
    this.isDrafting.set(true);
    this.draftError.set(null);
    this.challengeApi.draftSolutionOptions(this.challenge.id).subscribe({
      next: (response) => {
        this.draftOptions.set(response.options);
        this.isDrafting.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isDrafting.set(false);
        // The API sends { error: "..." } on a 503. The fallback covers a
        // network or proxy failure, where there is no body to read, and a
        // non-string body (error.error is `any`, so it isn't guaranteed).
        const message = typeof error.error?.error === 'string' ? error.error.error : null;
        this.draftError.set(message ?? 'AI drafting is unavailable. Please try again.');
      },
    });
  }
```

- [ ] **Step 4: Render it in the template**

In `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.html`, add immediately after the draft-button block (after line 8, the closing `}` of `@if (canEdit && challenge.problemStatement)`):

```html
  @if (draftError()) {
    <p class="solution-options-panel__error" role="alert">{{ draftError() }}</p>
  }
```

`role="alert"` matters here for the same reason as the problem statement panel: the generic ≥ 500 snackbar is excluded for `/draft-` calls, so this paragraph is the only failure signal a screen reader user gets.

- [ ] **Step 5: Style it**

Nest the error rule inside the parent selector, using the theme token instead of a literal hex so it stays readable in dark mode:

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
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
  }

  &__error {
    color: var(--mat-sys-error);
    font-size: 0.875rem;
    margin: 8px 0 0;
  }
}
```

- [ ] **Step 6: Run the full suite**

Run: `npm test -- --watch=false`
Expected: PASS — the three new tests plus the existing `canEdit` tests. Note the existing "hides the draft and select controls when canEdit is false" test counts buttons; the error paragraph is not a button, so that count is unaffected.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/challenge-detail/solution-options-panel/
git commit -m "feat: show draft failures inline in the solution options panel

Mirrors the problem statement panel: the API's 503 message renders next to
the draft button, with a fallback for body-less failures."
```

---

### Task 4: End-to-end check against the real API

**Files:** none — verification only.

**Interfaces:**
- Consumes: Tasks 1-3, and the API-side plan through its Task 3 (the 503 contract).
- Produces: confirmation the two halves agree on the wire format.

- [ ] **Step 1: Start the backend with a deliberately broken provider**

In the sibling API repo:

```bash
dotnet user-secrets set AiDrafting:Provider claude --project src/TeamChallengeHub.Api
dotnet user-secrets set AiDrafting:ApiKey sk-deliberately-invalid --project src/TeamChallengeHub.Api
dotnet run --project src/TeamChallengeHub.Api --launch-profile http
```

The `http` profile is required, not `https` — see this repo's `CLAUDE.md` for why (`UseHttpsRedirection` breaks the proxied session cookie).

- [ ] **Step 2: Run the frontend and trigger a failure**

```bash
npm start
```

Sign in, open a challenge, click **Draft Problem Statement**. Expected:

1. The inline red message appears under the button, carrying the API's wording.
2. **No** snackbar appears.
3. The spinner stops and the button is clickable again.
4. Repeat on a challenge with an accepted problem statement for **Draft Solution Options**.

- [ ] **Step 3: Confirm the success path still works**

Set a valid key (`dotnet user-secrets set AiDrafting:ApiKey <real-key>`), restart the API, and draft again. Expected: real text in the editable field, no error message, and **Accept & Save** persists it exactly as before.

- [ ] **Step 4: Clean up**

```bash
dotnet user-secrets clear --project src/TeamChallengeHub.Api
```

This returns local development to the mock provider. Nothing to commit.
