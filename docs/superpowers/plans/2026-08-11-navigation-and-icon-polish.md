# Navigation and Icon Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the six presentation changes from the team's frontend feedback — list width and filter layout, spaced status labels, a mobile toolbar stack, a back bar, and icon replacements for Delete/Select/Selected.

**Architecture:** Presentation-only. Four of the six changes are pure SCSS. The other two touch templates and add one exported constant (`STATUS_LABELS`) plus one computed signal (`showBack`) in the root component. No API call, route, or data flow changes. Source spec: `docs/superpowers/specs/2026-08-11-navigation-and-icon-polish-design.md`.

**Tech Stack:** Angular 22 standalone components, Angular Material, SCSS, Vitest (`@angular/build:unit-test`), Playwright for e2e.

## Global Constraints

- Unit test runner is **Vitest**, not Jasmine. Use Vitest matchers (`.toBe(true)`, `.toBeNull()`) — never `toBeTrue()`.
- Run tests with `npx ng test --watch=false`. Do **not** pass `--include=...`; it is not supported by this builder. Every test step runs the whole suite.
- Every component keeps separate `.component.ts` / `.component.html` / `.component.scss` files. No inline `template` or `styles`.
- Standalone components only. No NgModules. `changeDetection: ChangeDetectionStrategy.OnPush` stays on every component touched.
- Strict TypeScript. No implicit `any`.
- Mobile breakpoint is `max-width: 600px`; its desktop mirror is `min-width: 601px`. Both already exist in the codebase — do not introduce a third value.
- Material colours come from `--mat-sys-*` tokens. Only fall back to `light-dark()` literals where the codebase already does.
- Commit after each task, using the message given in that task's final step.

---

### Task 1: Challenge list width and filter alignment

Spec items 1 and 2. Pure SCSS: remove the list's max width, move the status filter to the left of its header, and cap the filter at half width on desktop only.

**Files:**
- Modify: `src/app/features/challenge-list/challenge-list.component.scss`
- Test: none — see Step 3

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on. The class names `.challenge-list`, `.challenge-list__header` are unchanged.

- [ ] **Step 1: Remove the max width**

In `src/app/features/challenge-list/challenge-list.component.scss`, the file currently opens with:

```scss
.challenge-list {
  padding: 1rem;
  // Don't stretch edge-to-edge on wide desktops.
  max-width: 1100px;
```

Delete both the comment and the `max-width` line, leaving:

```scss
.challenge-list {
  padding: 1rem;
```

- [ ] **Step 2: Move the filter left and cap its width**

In the same file, the `&__header` block currently reads:

```scss
  &__header {
    display: flex;
    // Filter and action grouped at the right, per the design.
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
```

Replace the comment and the `justify-content` line so the block becomes:

```scss
  &__header {
    display: flex;
    // Filter at the left edge, action at the right.
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
```

Leave the rest of the block (`background`, `color`, `border-radius`, `padding`) exactly as it is.

Then, immediately after the closing brace of `&__header` and before `&__grid`, add:

```scss
  // The filter is a bare mat-select with no mat-form-field, so the width goes
  // on the host. Desktop only: 601px is the mirror of the 600px mobile block
  // at the bottom of this file, where the filter keeps its intrinsic width.
  &__header mat-select {
    @media (min-width: 601px) {
      width: 50%;
    }
  }
```

- [ ] **Step 3: Verify the build compiles the SCSS**

There is no unit test for this task. Asserting computed styles in jsdom tests the framework, not the change — but a SCSS syntax error is real and must be caught.

Run: `npx ng build`
Expected: build succeeds with no SCSS errors.

- [ ] **Step 4: Run the test suite for regressions**

Run: `npx ng test --watch=false`
Expected: PASS — every existing test still passes. This task changes no template or class name, so nothing should move.

- [ ] **Step 5: Verify in the browser**

Run `npm start`, sign in, and open the challenge list.

- At a desktop width (> 601px): the grid fills the full window width with no 1100px ceiling; the status filter sits at the left edge of the tinted header, roughly half its width; "New Challenge" stays at the right.
- Below 600px: the filter returns to its natural width and the header still wraps as before.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/challenge-list/challenge-list.component.scss
git commit -m "style: full-width challenge list, left-aligned status filter"
```

---

### Task 2: Share the spaced status labels with the filter

Spec item 3. The filter renders raw enum values (`ProblemStatementDrafted`) while the badge next to it renders `Problem Statement Drafted`. The spaced labels already exist as a private `LABELS` map inside `status-badge.component.ts`; export that map once from the model file and consume it from both places.

**Files:**
- Modify: `src/app/core/models/challenge.model.ts`
- Modify: `src/app/shared/status-badge/status-badge.component.ts`
- Modify: `src/app/features/challenge-list/challenge-list.component.ts`
- Modify: `src/app/features/challenge-list/challenge-list.component.html`
- Test: `src/app/features/challenge-list/challenge-list.component.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `STATUS_LABELS: Record<ChallengeStatus, string>`, exported from `src/app/core/models/challenge.model.ts`. `ChallengeListComponent` gains `readonly statusLabels = STATUS_LABELS`.

- [ ] **Step 1: Write the failing test**

Append this test inside the existing `describe('ChallengeListComponent', ...)` block in `src/app/features/challenge-list/challenge-list.component.spec.ts`, just before its closing `});`:

```ts
  it('renders spaced status labels in the filter', async () => {
    const fixture = TestBed.createComponent(ChallengeListComponent);
    TestBed.tick();
    httpMock.expectOne((r) => r.url === listUrl).flush([]);
    await Promise.resolve();
    TestBed.tick();
    fixture.detectChanges();

    // mat-select renders its options into an overlay, and only once opened.
    const trigger: HTMLElement = fixture.debugElement.query(
      By.css('.mat-mdc-select-trigger'),
    ).nativeElement;
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const optionText = Array.from(
      document.querySelectorAll('.mat-mdc-option'),
    ).map((option) => option.textContent?.trim());

    expect(optionText).toContain('Problem Statement Drafted');
    expect(optionText).not.toContain('ProblemStatementDrafted');
    // The raw enum value is what still travels to the API.
    expect(fixture.componentInstance.statuses).toContain('ProblemStatementDrafted');

    httpMock.verify();
  });
```

This test needs `By`, which the file does not import yet. Add to the imports at the top of the file:

```ts
import { By } from '@angular/platform-browser';
```

The overlay that `mat-select` opens is attached to `document.body` and survives the fixture. Add this `afterEach` immediately after the existing `beforeEach` block so the overlay cannot leak into other tests:

```ts
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.remove());
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL. Two failures are possible and both are the expected red:
- `expect(optionText).toContain('Problem Statement Drafted')` fails because the option renders `ProblemStatementDrafted`; and
- a TypeScript error on `fixture.componentInstance.statusLabels` is not expected yet — that property is not referenced by this test, only `statuses`, which already exists.

If the test instead fails on `.mat-mdc-select-trigger` being null, the select did not render — stop and check that the component's `httpMock` flush ran before `fixture.detectChanges()`.

- [ ] **Step 3: Export the label map from the model**

In `src/app/core/models/challenge.model.ts`, add this directly below the `ChallengeStatus` type alias (which ends with `| 'Rejected';`) and above `export interface Challenge`:

```ts
/**
 * Display text for each status. Shared by the status badge and the list
 * filter so a new status cannot pick up two different spellings. The
 * Record type keeps it exhaustive: adding a status to the union without a
 * label here is a compile error.
 */
export const STATUS_LABELS: Record<ChallengeStatus, string> = {
  Submitted: 'Submitted',
  ProblemStatementDrafted: 'Problem Statement Drafted',
  OptionsDrafted: 'Options Drafted',
  OptionSelected: 'Option Selected',
  InReview: 'In Review',
  Approved: 'Approved',
  Rejected: 'Rejected',
};
```

- [ ] **Step 4: Point the status badge at the shared map**

In `src/app/shared/status-badge/status-badge.component.ts`, delete the whole local `LABELS` const (lines 5-13, `const LABELS: Record<ChallengeStatus, string> = { ... };`) and change the model import on line 3 from:

```ts
import { ChallengeStatus } from '../../core/models/challenge.model';
```

to:

```ts
import { ChallengeStatus, STATUS_LABELS } from '../../core/models/challenge.model';
```

Then change the `label` computed near the bottom of the class from:

```ts
  readonly label = computed(() => LABELS[this.statusSignal()]);
```

to:

```ts
  readonly label = computed(() => STATUS_LABELS[this.statusSignal()]);
```

Leave `CSS_CLASSES` and the `cssClass` computed alone — colours are not display text and stay local to the badge.

- [ ] **Step 5: Expose the map on the list component**

In `src/app/features/challenge-list/challenge-list.component.ts`, change the model import on line 9 from:

```ts
import { Challenge, ChallengeStatus } from '../../core/models/challenge.model';
```

to:

```ts
import { Challenge, ChallengeStatus, STATUS_LABELS } from '../../core/models/challenge.model';
```

Then add the field directly below the existing `readonly statuses = ALL_STATUSES;` line:

```ts
  readonly statusLabels = STATUS_LABELS;
```

- [ ] **Step 6: Render the label in the filter**

In `src/app/features/challenge-list/challenge-list.component.html`, change the option inside the `@for` on line 10 from:

```html
        <mat-option [value]="status">{{ status }}</mat-option>
```

to:

```html
        <mat-option [value]="status">{{ statusLabels[status] }}</mat-option>
```

Only the visible text changes. `[value]` still binds the raw `ChallengeStatus`, so the request payload is untouched.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx ng test --watch=false`
Expected: PASS. In particular:
- the new `renders spaced status labels in the filter` test passes;
- `status-badge.component.spec.ts` still passes — it asserts on rendered label text, which is exactly what the move must not change;
- `re-fetches with the status filter when it changes` still passes, proving the raw enum still reaches the API.

- [ ] **Step 8: Commit**

```bash
git add src/app/core/models/challenge.model.ts src/app/shared/status-badge/status-badge.component.ts src/app/features/challenge-list/challenge-list.component.ts src/app/features/challenge-list/challenge-list.component.html src/app/features/challenge-list/challenge-list.component.spec.ts
git commit -m "feat: share spaced status labels between badge and list filter"
```

---

### Task 3: Stack the toolbar on mobile

Spec item 4. Below 600px the app title should own a full-width row, with the username, theme toggle, admin link, and sign-out right-aligned beneath it.

**Files:**
- Modify: `src/app/app.component.scss`
- Test: none — see Step 2

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing. No template or class-name change; `.app-title` and `.spacer` already exist.

- [ ] **Step 1: Add the mobile block**

Append to the end of `src/app/app.component.scss`, after the existing `.app-username` block:

```scss
@media (max-width: 600px) {
  mat-toolbar {
    flex-wrap: wrap;
    // Material pins mat-toolbar to a single-row height; without this the
    // wrapped second row is clipped.
    height: auto;
    padding-block: 0.5rem;
  }

  .app-title {
    // A full-width first row pushes everything after it onto a second row,
    // where the existing .spacer still right-aligns it.
    flex: 0 0 100%;
  }
}
```

Do not touch `.spacer` — its `flex: 1 1 auto` is what right-aligns the trailing cluster on both rows.

- [ ] **Step 2: Verify the build compiles the SCSS**

No unit test: this is a media query, and jsdom does not lay out media queries. A syntax error is still real.

Run: `npx ng build`
Expected: build succeeds with no SCSS errors.

- [ ] **Step 3: Run the test suite for regressions**

Run: `npx ng test --watch=false`
Expected: PASS — no template or class name changed.

- [ ] **Step 4: Verify in the browser**

Run `npm start`, sign in as an Admin (so the Users link renders too), then narrow the window below 600px or use the browser's device toolbar.

- The title "Team Challenge Hub" occupies its own full-width row.
- The username, theme toggle, Users link, and sign-out sit on a second row, right-aligned.
- Nothing is clipped vertically — the toolbar grows to fit both rows.
- Above 600px the toolbar is a single row exactly as before.

- [ ] **Step 5: Commit**

```bash
git add src/app/app.component.scss
git commit -m "style: stack the toolbar title above its actions on mobile"
```

---

### Task 4: Back bar below the toolbar

Spec item 5. A single back link rendered once in the root component, shown on every route except the challenge list and the unauthenticated pages. It is a plain `routerLink` to `/challenges` — deliberately not a history `back()`, so it is predictable and never walks the user out of the app on a deep link.

**Files:**
- Modify: `src/app/app.component.ts`
- Modify: `src/app/app.component.html`
- Modify: `src/app/app.component.scss`
- Test: `src/app/app.component.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `AppComponent.showBack: Signal<boolean>` and the CSS class `.app-back` on the rendered link. No later task depends on either.

- [ ] **Step 1: Write the failing tests**

The existing spec's `provideRouter` only declares `''` and `'other'`. Add the two routes the back bar keys on. In `src/app/app.component.spec.ts`, change the `provideRouter` call inside `beforeEach` from:

```ts
        provideRouter([
          { path: '', component: DummyComponent },
          { path: 'other', component: DummyComponent },
        ]),
```

to:

```ts
        provideRouter([
          { path: '', component: DummyComponent },
          { path: 'other', component: DummyComponent },
          { path: 'challenges', component: DummyComponent },
          { path: 'admin/users', component: DummyComponent },
        ]),
```

Then add these three tests just before the closing `});` of the `describe` block:

```ts
  it('hides the back bar on the challenge list', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    await router.navigateByUrl('/challenges');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.app-back'))).toBe(null);
  });

  it('shows a back bar linking to the list on other pages', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    fixture.detectChanges();

    await router.navigateByUrl('/admin/users');
    fixture.detectChanges();

    const back = fixture.debugElement.query(By.css('.app-back'));
    expect(back).not.toBe(null);

    back.nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(location.path()).toBe('/challenges');
  });

  it('hides the back bar before the root redirect resolves', () => {
    // router.url is '/' on first paint, before any NavigationEnd. Without the
    // root case in showBack the bar flashes on load.
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.app-back'))).toBe(null);
  });
```

`Router`, `Location`, and `By` are all already imported by this spec file — no new imports needed.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx ng test --watch=false`
Expected: FAIL. `hides the back bar on the challenge list` and `hides the back bar before the root redirect resolves` will pass trivially (nothing renders `.app-back` yet), but `shows a back bar linking to the list on other pages` must fail on `expect(back).not.toBe(null)` — the query returns `null` because the element does not exist. That single red is the one that matters.

- [ ] **Step 3: Add the URL signal and showBack computed**

In `src/app/app.component.ts`, replace the import block at the top:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
```

with:

```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
```

Then, inside the `AppComponent` class, add the following directly below the existing `private readonly router = inject(Router);` line and above `onSignOut()`:

```ts
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly showBack = computed(() => {
    const path = this.url().split('?')[0];
    // '' and '/' are the pre-redirect root: router.url reads '/' on first
    // paint, before the '' -> 'challenges' redirect fires a NavigationEnd.
    // Treating them as the list keeps the bar from flashing on load.
    if (path === '' || path === '/' || path === '/challenges') return false;
    return !path.startsWith('/sign-');
  });
```

`router` is declared `private`, and field initialisers run in declaration order, so `url` must come after it — it already does.

- [ ] **Step 4: Render the bar**

In `src/app/app.component.html`, insert this between the closing `</mat-toolbar>` on line 47 and the `<router-outlet />` on line 49:

```html
@if (showBack()) {
  <a class="app-back" mat-button routerLink="/challenges">
    <mat-icon>arrow_back</mat-icon>Back
  </a>
}
```

`RouterLink`, `MatButtonModule`, and `MatIconModule` are already in the component's `imports` — nothing to add.

- [ ] **Step 5: Style the bar**

In `src/app/app.component.scss`, add this after the `.app-username` block and **before** the `@media (max-width: 600px)` block that Task 3 appended:

```scss
.app-back {
  // Reads as a strip under the toolbar rather than as page content.
  margin: 0.5rem 0 0 1rem;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx ng test --watch=false`
Expected: PASS — all three new tests, plus every pre-existing `AppComponent` test. Pay attention to `clicking the header title navigates home`: it navigates to `''` and asserts `location.path()` is `''`. The back bar renders nothing at that path, so it must be unaffected.

- [ ] **Step 7: Verify in the browser**

Run `npm start` and sign in as an Admin.

- On `/challenges`: no back bar.
- On a challenge detail page, `/challenges/new`, the edit form, and `/admin/users`: the bar appears directly below the toolbar, with an arrow icon and the word "Back".
- Clicking it lands on the challenge list.
- Reload directly on `/challenges` and confirm the bar does not flash in before disappearing.
- Sign out and confirm `/sign-in` and `/sign-up` show no bar.

- [ ] **Step 8: Commit**

```bash
git add src/app/app.component.ts src/app/app.component.html src/app/app.component.scss src/app/app.component.spec.ts
git commit -m "feat: add a back bar below the toolbar off the challenge list"
```

---

### Task 5: User management delete icon and confirmation guard

Spec item 6, first half. Replace the "Delete" text button with a trash icon, and add a native `confirm()` guard — stripping the word "Delete" removes the last check standing between a mis-click and a removed user.

**Files:**
- Modify: `src/app/features/admin/user-management/user-management.component.ts`
- Modify: `src/app/features/admin/user-management/user-management.component.html`
- Test: `src/app/features/admin/user-management/user-management.component.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `UserManagementComponent.onDelete(user: User): void` keeps its existing signature; it now returns early when `confirm()` is declined.

- [ ] **Step 1: Write the failing tests**

Six existing tests in `src/app/features/admin/user-management/user-management.component.spec.ts` call `onDelete()` and then expect a DELETE request. Once the guard lands, an unstubbed `window.confirm` in jsdom returns `false` and every one of them breaks. Stub it once for the whole suite rather than editing six tests: add this `beforeEach` immediately after the existing `beforeEach` block (the one that calls `TestBed.configureTestingModule`):

```ts
  // Default the destructive confirm to "yes" so the existing delete tests keep
  // exercising the request path. The one test that declines overrides it.
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
```

Then add these two tests just before the closing `});` of the `describe` block:

```ts
  it('does not delete when the confirmation is declined', () => {
    const fixture = create();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    fixture.componentInstance.onDelete(seeded[1]);

    // No DELETE was issued, and the list is untouched.
    httpMock.verify();
    expect(fixture.componentInstance.users().length).toBe(2);
  });

  it('names the user in the confirmation prompt', () => {
    const fixture = create();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    fixture.componentInstance.onDelete(seeded[1]);

    expect(confirmSpy.mock.calls[0][0]).toContain('jordan.patel');
    httpMock.verify();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx ng test --watch=false`
Expected: FAIL. `does not delete when the confirmation is declined` fails inside `httpMock.verify()` with an "Expected no open requests, found 1: DELETE .../users/2" message, because `onDelete` currently fires unconditionally. The other new test fails on `confirmSpy.mock.calls[0]` being `undefined` — `confirm` is never called.

- [ ] **Step 3: Add the guard**

In `src/app/features/admin/user-management/user-management.component.ts`, change `onDelete` from:

```ts
  onDelete(user: User): void {
    this.userApi.deleteUser(user.id).subscribe({
```

to:

```ts
  onDelete(user: User): void {
    // The control is an unlabelled icon next to a role dropdown, and the API
    // deletes immediately — this is the only thing between a mis-click and a
    // removed user.
    if (!confirm(`Delete ${user.username}?`)) return;

    this.userApi.deleteUser(user.id).subscribe({
```

Leave the rest of the method — the `next`, the 409 comment, and the `error` handler — exactly as it is.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx ng test --watch=false`
Expected: PASS — both new tests, plus all six pre-existing tests that call `onDelete`, which now pass because of the suite-wide `confirm` stub added in Step 1.

- [ ] **Step 5: Swap the text button for an icon button**

In `src/app/features/admin/user-management/user-management.component.html`, replace line 19:

```html
        <button mat-button type="button" (click)="onDelete(user)">Delete</button>
```

with:

```html
        <button
          mat-icon-button
          type="button"
          [attr.aria-label]="'Delete ' + user.username"
          matTooltip="Delete user"
          (click)="onDelete(user)"
        >
          <mat-icon>delete</mat-icon>
        </button>
```

The `aria-label` names the specific user rather than saying "Delete", so a screen-reader user moving down the list can tell the rows apart.

- [ ] **Step 6: Register the Material modules**

In `src/app/features/admin/user-management/user-management.component.ts`, add these two imports below the existing `MatButtonModule` import on line 3:

```ts
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
```

and change the component's `imports` array on line 16 from:

```ts
  imports: [MatButtonModule, MatFormFieldModule, MatSelectModule],
```

to:

```ts
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
  ],
```

- [ ] **Step 7: Run the tests to verify they still pass**

Run: `npx ng test --watch=false`
Expected: PASS. The template swap breaks nothing: every test in this spec drives the component through `onDelete()` directly and none queries button text.

- [ ] **Step 8: Verify in the browser**

Run `npm start`, sign in as an Admin, open `/admin/users`.

- Each row ends with a trash icon button instead of the word "Delete".
- Hovering it shows the "Delete user" tooltip.
- Clicking it raises a browser confirmation naming that user; dismissing it leaves the row in place, accepting it removes the row.

- [ ] **Step 9: Commit**

```bash
git add src/app/features/admin/user-management/user-management.component.ts src/app/features/admin/user-management/user-management.component.html src/app/features/admin/user-management/user-management.component.spec.ts
git commit -m "feat: icon-only user delete behind a confirmation prompt"
```

---

### Task 6: Solution option select / selected icons

Spec item 6, second half. Replace the "Select" button text and the "Selected" label with icons that differ by glyph shape, not merely by fill.

**Files:**
- Modify: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.ts`
- Modify: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.html`
- Test: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on. `selectOption(id: number)` keeps its signature; `.solution-options-panel__selected-row` keeps its name.

- [ ] **Step 1: Rewrite the text assertion as an aria-label assertion**

In `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.spec.ts`, the test `hides the drafting controls but still offers Select once an option is selected` currently asserts on button *text*:

```ts
    const buttonText = fixture.debugElement
      .queryAll(By.css('button'))
      .map((button) => button.nativeElement.textContent.trim());

    // Asserted by text, not by count: at OptionSelected the button count moves
    // for two independent reasons, so a count can't say which behaviour broke.
    expect(buttonText).toContain('Select');
    expect(buttonText).not.toContain('Draft Solution Options');
```

Replace exactly that portion with:

```ts
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const buttonLabels = buttons.map((b) => b.nativeElement.getAttribute('aria-label'));
    const buttonText = buttons.map((b) => b.nativeElement.textContent.trim());

    // Asserted by label, not by count: at OptionSelected the button count moves
    // for two independent reasons, so a count can't say which behaviour broke.
    // The label is also what the tooltip and a screen reader both read.
    expect(buttonLabels).toContain('Select this option');
    expect(buttonText).not.toContain('Draft Solution Options');
```

Leave the three assertions that follow (`selectedRow` not null, its text, and `selectedRow.query(By.css('button'))` being null) untouched — they still hold.

Then add this test just before the closing `});` of the `describe` block:

```ts
  it('marks the selected option with a labelled icon, not text', () => {
    const fixture = TestBed.createComponent(SolutionOptionsPanelComponent);
    fixture.componentInstance.challenge = {
      ...fakeChallenge,
      problemStatement: 'A statement.',
      status: 'OptionSelected',
      options: [
        { id: 2, text: 'Split the pipeline.', isSelected: true, createdAt: '2026-07-29T00:00:00Z' },
      ],
    };
    fixture.componentInstance.canEdit = true;
    fixture.detectChanges();

    const selectedRow = fixture.debugElement.query(
      By.css('.solution-options-panel__selected-row'),
    );
    const icon = selectedRow.query(By.css('mat-icon'));

    expect(icon).not.toBeNull();
    expect(icon.nativeElement.textContent.trim()).toBe('check_circle');
    expect(icon.nativeElement.getAttribute('aria-label')).toBe('Selected option');
    // MatIcon defaults to aria-hidden="true"; without an explicit override the
    // label above is never reachable by assistive tech.
    expect(icon.nativeElement.getAttribute('aria-hidden')).not.toBe('true');
    // The word itself is gone.
    expect(selectedRow.nativeElement.textContent).not.toContain('Selected');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx ng test --watch=false`
Expected: FAIL, twice:
- `hides the drafting controls but still offers Select once an option is selected` fails on `expect(buttonLabels).toContain('Select this option')` — the button has no `aria-label` yet, so the array holds `null`.
- `marks the selected option with a labelled icon, not text` fails on `expect(icon).not.toBeNull()` — the row still renders a `<strong>Selected</strong>`.

- [ ] **Step 3: Swap both controls for icons**

In `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.html`, replace lines 9-16 — the `@if (option.isSelected)` / `@else if` block and its `</li>`:

```html
          @if (option.isSelected) {
            <strong>Selected</strong>
          } @else if (
            canEdit && (challenge.status === 'OptionsDrafted' || challenge.status === 'OptionSelected')
          ) {
            <button mat-button (click)="selectOption(option.id)">Select</button>
          }
```

with:

```html
          @if (option.isSelected) {
            <mat-icon
              class="solution-options-panel__selected-icon"
              role="img"
              aria-label="Selected option"
              aria-hidden="false"
              matTooltip="Selected option"
            >check_circle</mat-icon>
          } @else if (
            canEdit && (challenge.status === 'OptionsDrafted' || challenge.status === 'OptionSelected')
          ) {
            <button
              mat-icon-button
              [attr.aria-label]="'Select option: ' + option.text"
              matTooltip="Select this option"
              (click)="selectOption(option.id)"
            >
              <mat-icon>radio_button_unchecked</mat-icon>
            </button>
          }
```

The `@else if` condition is unchanged — copy it exactly. The selected icon is static, not a button, so it carries `role="img"` with a label rather than being left decorative. The
`aria-hidden="false"` is required: `MatIcon`'s constructor force-sets
`aria-hidden="true"` whenever the template omits the attribute, and only an
explicit `"false"` (a truthy string) survives that guard, so omitting it would
silently hide the label from assistive tech.

No colour rule is needed: `li…__selected-row` in the component's SCSS already sets `color: light-dark(#0b5228, #9fd8b4)` and `mat-icon` inherits it, so the check picks up the row's green for free while the action icon keeps the default foreground.

- [ ] **Step 4: Register the Material modules**

In `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.ts`, add these two imports below the existing `MatInputModule` import on line 6:

```ts
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
```

and change the component's `imports` array on line 13 from:

```ts
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
```

to:

```ts
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
  ],
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx ng test --watch=false`
Expected: PASS. Two neighbouring tests are worth watching, because both count buttons and the swap could move those counts:
- `hides the draft and select controls when canEdit is false` expects `0` buttons. The selected icon is a `mat-icon`, not a `<button>`, so this still holds.
- `shows the draft and select controls when canEdit is true` expects `2` buttons. `mat-icon-button` is still a `<button>`, so the count is unchanged.

If either moves, the swap changed an element type it should not have — re-check Step 3.

- [ ] **Step 6: Retarget the now-dead `strong` rule**

Removing `<strong>Selected</strong>` orphans a rule. In `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.scss`, inside the `&__accepted` block, this no longer matches anything:

```scss
    // The li is flex + space-between, so `strong` is already pinned right; this
    // is a minimum gap that only shows once the option text fills the row.
    strong {
      padding-left: 0.5rem;
    }
```

Replace exactly that rule with the same gap on the icon that took the `strong`'s place:

```scss
    // The li is flex + space-between, so the icon is already pinned right; this
    // is a minimum gap that only shows once the option text fills the row.
    .solution-options-panel__selected-icon {
      padding-left: 0.5rem;
    }
```

The full class name is spelled out rather than `&__selected-icon`, because `&` inside `&__accepted` resolves to `.solution-options-panel__accepted`, not to `.solution-options-panel`.

Nothing else is needed: the `li` is already `display: flex; align-items: center`, so the icon is vertically centred without help, and its colour is inherited from the selected row. Do not add a colour property here.

- [ ] **Step 7: Verify in the browser**

While that page is open:

- Unselected options end with an outlined empty circle button; hovering shows "Select this option".
- Clicking one selects it — the row takes the green treatment and its control becomes a filled check.
- The filled check is green (inherited from the row) and the outline circles are not.
- No "Select" or "Selected" text remains in the list.

- [ ] **Step 8: Run the full check and commit**

Run: `npx ng build && npx ng test --watch=false`
Expected: build succeeds, all tests pass.

```bash
git add src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.ts src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.html src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.scss src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.spec.ts
git commit -m "feat: icon-only select and selected states for solution options"
```

---

## Final verification

After Task 6, confirm the whole feedback list landed:

- [ ] `npx ng build` succeeds.
- [ ] `npx ng test --watch=false` passes with no skipped tests.
- [ ] Optional, needs the sibling API running per `CLAUDE.md`: `npm run e2e`. No e2e change is expected — neither `e2e/challenge-flow.spec.ts` nor `e2e/auth-flow.spec.ts` locates a Select, Selected, or Delete control, and the badge text they do assert on (`Problem Statement Drafted`) is unchanged by Task 2.
- [ ] Browser pass at a desktop width: full-width list, filter left at 50%, spaced status labels, back bar off the list, delete and option icons.
- [ ] Browser pass below 600px: stacked toolbar, filter back to intrinsic width, single-column grid.
