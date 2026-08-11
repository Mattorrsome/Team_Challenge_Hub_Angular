# Detail Panel and List Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply six UI polish items from `frontend feedback.md` to the challenge list and challenge detail screens.

**Architecture:** Template and SCSS edits to three existing components. No new components, no new services, no API changes, no `ChallengeStatus` changes. Two tasks are behavior changes with unit tests; three are style-only and are verified by build plus a browser check in both themes.

**Tech Stack:** Angular 22 standalone components, Angular Material 22, SCSS, Vitest (via `@angular/build:unit-test`), Playwright for e2e.

**Spec:** `docs/superpowers/specs/2026-08-11-detail-panel-and-list-polish-design.md`

## Global Constraints

- Node `^22.22.3 || ^24.15.0 || >=26.0.0`.
- Unit test runner is **Vitest**, not Jasmine. Use Vitest matchers — `.toBe(true)`, never `toBeTrue()`.
- Run tests with `npx ng test --watch=false`. Do **not** use `--include=...`; it is not supported by this builder. There is no single-test CLI filter — every test step runs the full suite.
- **Never hardcode a hex value in component SCSS.** Use a `--mat-sys-*` token. Only where no token fits may you write `light-dark(<light>, <dark>)` — never a bare hex, which would be wrong in one theme.
- Do **not** add `:root` / `[data-theme]` custom properties for colors.
- Do **not** emit `color-scheme: light dark`.
- Every component keeps separate `.component.ts` / `.component.html` / `.component.scss` files. No inline `template`/`styles`.
- Do **not** reimplement status transition rules client-side. The API is the source of truth and returns 409 on an invalid transition.
- Do **not** add inline error handling to `selectOption`. `error-handling.interceptor.ts` already snackbars any 409 whose URL does not contain `/users/`.
- Commit after each task.

---

### Task 1: Challenge list panel color and card title alignment

Style-only. Implements spec sections 1 and 2.

**Files:**
- Modify: `src/app/features/challenge-list/challenge-list.component.scss`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks rely on.

- [ ] **Step 1: Change the header and grid backgrounds**

In `src/app/features/challenge-list/challenge-list.component.scss`, replace the `background:` line inside `&__header` and the one inside `&__grid`, and add a `color:` to each. `&__header` currently reads `background: var(--mat-sys-surface-container-low);` and `&__grid` currently reads `background: var(--mat-sys-surface-container);`. After the edit the two blocks look like this (the other declarations in each block are unchanged):

```scss
  &__header {
    display: flex;
    // Filter and action grouped at the right, per the design.
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
    // Secondary-container tints header and grid the same, so they read as one
    // panel behind the cards, which keep the neutral mat-card surface.
    background: var(--mat-sys-secondary-container);
    color: var(--mat-sys-on-secondary-container);
    border-radius: 8px;
    padding: 0.75rem 1rem;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
    background: var(--mat-sys-secondary-container);
    color: var(--mat-sys-on-secondary-container);
    border-radius: 8px;
    padding: 1rem;
  }
```

- [ ] **Step 2: Add the card title padding**

In the same file, replace the `&__card-title` block:

```scss
  &__card-title {
    font-size: 1.1rem;
    // mat-card-title sits directly in mat-card (no mat-card-header), so it gets
    // no horizontal padding, while mat-card-content below it carries Material's
    // own 0 16px. Matching 16px aligns the title with the status badge.
    padding-left: 16px;
  }
```

- [ ] **Step 3: Build to verify the SCSS compiles**

Run: `npm run build`
Expected: build succeeds with no SCSS error.

- [ ] **Step 4: Run the test suite to confirm nothing regressed**

Run: `npx ng test --watch=false`
Expected: PASS. These are style-only edits, so no test should change status.

- [ ] **Step 5: Verify in the browser, both themes**

Start the backend (sibling repo, `http` profile — required, see `CLAUDE.md`):

```bash
dotnet run --project src/TeamChallengeHub.Api --launch-profile http
```

Then, in this repo:

```bash
npm start
```

Open `http://localhost:4200`, sign in, and land on the challenge list. Confirm:
- The filter bar and the card grid share one tinted background, visibly distinct from the white/neutral cards sitting on top of it.
- Each card's title left edge lines up with the status badge below it. If it does not, Material's `mat-card-content` padding differs in this version — read the computed padding off `mat-card-content` in devtools and set `padding-left` to that value instead of 16px.
- Toggle the theme with the toolbar toggle and confirm both checks again in the other theme.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/challenge-list/challenge-list.component.scss
git commit -m "style: tint challenge list panels, align card title"
```

---

### Task 2: Move the status stepper above the notes

Implements spec section 3.

**Files:**
- Modify: `src/app/features/challenge-detail/challenge-detail.component.html`
- Test: `src/app/features/challenge-detail/challenge-detail.component.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks rely on. Task 3 edits the same template but a different region.

- [ ] **Step 1: Write the failing test**

Add this test to `src/app/features/challenge-detail/challenge-detail.component.spec.ts`, immediately after the `does not show a problem statement section before one is accepted` test:

```ts
  it('renders the status stepper below the header but above the notes and problem statement', () => {
    expectLoadRequest().flush({
      ...fakeChallenge,
      status: 'OptionsDrafted',
      problemStatement: 'Problem: Deploys take too long.',
    });
    fixture.detectChanges();

    const root: HTMLElement = fixture.debugElement.query(By.css('.challenge-detail')).nativeElement;
    // Angular's control-flow anchors are comment nodes, so `children` sees only
    // the rendered elements and their order is the template order.
    const children = Array.from(root.children);
    const indexOfTag = (tag: string) =>
      children.findIndex((el) => el.tagName.toLowerCase() === tag);
    const indexOfClass = (cls: string) => children.findIndex((el) => el.classList.contains(cls));

    const headerIndex = indexOfClass('challenge-detail__header');
    const stepperIndex = indexOfTag('app-status-stepper');
    const notesIndex = indexOfClass('challenge-detail__raw-notes');
    const statementIndex = indexOfClass('challenge-detail__problem-statement');

    expect(stepperIndex).toBeGreaterThan(headerIndex);
    expect(stepperIndex).toBeLessThan(notesIndex);
    expect(stepperIndex).toBeLessThan(statementIndex);
  });
```

- [ ] **Step 2: Run the tests to verify the new one fails**

Run: `npx ng test --watch=false`
Expected: FAIL on `renders the status stepper below the header but above the notes and problem statement` — the stepper currently sits after the problem statement, so `stepperIndex` is greater than `notesIndex`, not less.

- [ ] **Step 3: Move the stepper in the template**

In `src/app/features/challenge-detail/challenge-detail.component.html`, cut the `<app-status-stepper .../>` line from its position below the problem-statement section and paste it directly after the closing `</div>` of `.challenge-detail__header`. The top of the file becomes:

```html
@if (challenge(); as c) {
  <div class="challenge-detail">
    <div class="challenge-detail__header">
      <h2>{{ c.title }}</h2>
      <app-status-badge [status]="c.status" />
      @if (canEdit()) {
        <a mat-button [routerLink]="['/challenges', c.id, 'edit']">Edit Title</a>
      }
    </div>

    <app-status-stepper [challenge]="c" (challengeUpdated)="onChallengeUpdated($event)" />

    <p class="challenge-detail__raw-notes">{{ c.rawNotes }}</p>

    @if (c.problemStatement) {
      <section class="challenge-detail__problem-statement">
        <h3>Problem Statement</h3>
        <p>{{ c.problemStatement }}</p>
      </section>
    }

    @switch (currentPanel()) {
```

Leave everything from `@switch (currentPanel()) {` down exactly as it is, and make sure the old `<app-status-stepper .../>` line that used to sit between the problem statement and the `@switch` is gone — it must appear exactly once in the file.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx ng test --watch=false`
Expected: PASS, including the new ordering test and all pre-existing `ChallengeDetailComponent` tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/challenge-detail/challenge-detail.component.html src/app/features/challenge-detail/challenge-detail.component.spec.ts
git commit -m "feat: move status stepper above challenge notes"
```

---

### Task 3: Show the selected option during review

Implements spec section 5. Scoped to `InReview` only — `Approved` and `Rejected` deliberately show nothing extra.

**Files:**
- Modify: `src/app/features/challenge-detail/challenge-detail.component.html`
- Modify: `src/app/features/challenge-detail/challenge-detail.component.scss`
- Test: `src/app/features/challenge-detail/challenge-detail.component.spec.ts`

**Interfaces:**
- Consumes: the template layout from Task 2 (the stepper already sits above the problem statement).
- Produces: the CSS class `challenge-detail__selected-option` on the new `<section>`. No later task depends on it.

- [ ] **Step 1: Write the failing tests**

Add both tests to `src/app/features/challenge-detail/challenge-detail.component.spec.ts`, after the stepper ordering test from Task 2:

```ts
  it('shows the selected option below the problem statement while in review', () => {
    expectLoadRequest().flush({
      ...fakeChallenge,
      status: 'InReview',
      problemStatement: 'Problem: Deploys take too long.',
      options: [
        { id: 1, text: 'Automate the gates.', isSelected: false, createdAt: '2026-07-29T00:00:00Z' },
        { id: 2, text: 'Split the pipeline.', isSelected: true, createdAt: '2026-07-29T00:00:00Z' },
      ],
    });
    fixture.detectChanges();

    const section = fixture.debugElement.query(By.css('.challenge-detail__selected-option'));
    expect(section).not.toBeNull();
    expect(section.nativeElement.textContent).toContain('Split the pipeline.');
    // Only the selected option — not the whole list.
    expect(section.nativeElement.textContent).not.toContain('Automate the gates.');
  });

  it('does not show the selected option section outside review', () => {
    expectLoadRequest().flush({
      ...fakeChallenge,
      status: 'OptionSelected',
      problemStatement: 'Problem: Deploys take too long.',
      options: [
        { id: 2, text: 'Split the pipeline.', isSelected: true, createdAt: '2026-07-29T00:00:00Z' },
      ],
    });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.challenge-detail__selected-option'))).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx ng test --watch=false`
Expected: FAIL on `shows the selected option below the problem statement while in review` — the query returns `null` because the section does not exist yet. The second test passes already (the section is absent everywhere); it is the guard that keeps the feature scoped to `InReview`.

- [ ] **Step 3: Add the section to the template**

In `src/app/features/challenge-detail/challenge-detail.component.html`, insert this block directly after the closing `}` of the `@if (c.problemStatement) { ... }` block and before `@switch (currentPanel()) {`:

```html
    @if (c.status === 'InReview') {
      @for (option of c.options; track option.id) {
        @if (option.isSelected) {
          <section class="challenge-detail__selected-option">
            <h3>Selected Option</h3>
            <p>{{ option.text }}</p>
          </section>
        }
      }
    }
```

This reads `c.options`, which is already loaded on the `Challenge`. Do not add a signal, a `computed`, or a service call — the spec requires no new state for this.

- [ ] **Step 4: Style the section to match the problem statement**

In `src/app/features/challenge-detail/challenge-detail.component.scss`, add this block immediately after the `&__problem-statement { ... }` block, inside `.challenge-detail`:

```scss
  &__selected-option {
    p {
      white-space: pre-wrap;
      margin: 0;
    }

    h3 {
      margin: 0 0 0.5rem;
    }
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx ng test --watch=false`
Expected: PASS, both new tests and every pre-existing test.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/challenge-detail/challenge-detail.component.html src/app/features/challenge-detail/challenge-detail.component.scss src/app/features/challenge-detail/challenge-detail.component.spec.ts
git commit -m "feat: show selected option during review"
```

---

### Task 4: Solution options panel — reorder, gate drafting, allow re-selection

Implements the three behavior items of spec section 4. The styling items of section 4 are Task 5.

**Files:**
- Modify: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.html`
- Test: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.spec.ts`

**Interfaces:**
- Consumes: `SolutionOptionsPanelComponent`'s existing public members, unchanged by this task — `challenge: Challenge`, `canEdit: boolean`, `draftOptions()`, `isDrafting()`, `draftError()`, `requestDrafts()`, `updateDraft(index, text)`, `acceptDraft(index)`, `selectOption(optionId)`.
- Produces: the CSS classes `solution-options-panel__draft-button` (on the Draft button) and `solution-options-panel__selected-row` (bound on the selected `<li>`). **Task 5 styles both — do not rename them.**

- [ ] **Step 1: Write the failing test**

Add this test to `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.spec.ts`, after the `shows the draft and select controls when canEdit is true` test:

```ts
  it('hides the drafting controls but still offers Select once an option is selected', () => {
    const fixture = TestBed.createComponent(SolutionOptionsPanelComponent);
    fixture.componentInstance.challenge = {
      ...fakeChallenge,
      problemStatement: 'A statement.',
      status: 'OptionSelected',
      options: [
        { id: 1, text: 'Automate the gates.', isSelected: false, createdAt: '2026-07-29T00:00:00Z' },
        { id: 2, text: 'Split the pipeline.', isSelected: true, createdAt: '2026-07-29T00:00:00Z' },
      ],
    };
    fixture.componentInstance.canEdit = true;
    fixture.detectChanges();

    const buttonText = fixture.debugElement
      .queryAll(By.css('button'))
      .map((button) => button.nativeElement.textContent.trim());

    // Asserted by text, not by count: at OptionSelected the button count moves
    // for two independent reasons, so a count can't say which behaviour broke.
    expect(buttonText).toContain('Select');
    expect(buttonText).not.toContain('Draft Solution Options');
    // The selected row is marked for styling and shows no Select of its own.
    const selectedRow = fixture.debugElement.query(By.css('.solution-options-panel__selected-row'));
    expect(selectedRow).not.toBeNull();
    expect(selectedRow.nativeElement.textContent).toContain('Split the pipeline.');
    expect(selectedRow.query(By.css('button'))).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to verify the new one fails**

Run: `npx ng test --watch=false`
Expected: FAIL on `hides the drafting controls but still offers Select once an option is selected`. Two reasons: `Draft Solution Options` still renders at `OptionSelected`, and `Select` does not render because the current condition is `challenge.status === 'OptionsDrafted'` only.

- [ ] **Step 3: Rewrite the template**

Replace the entire contents of `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.html` with:

```html
<div class="solution-options-panel">
  <h3>Solution Options</h3>

  @if (challenge.options.length > 0) {
    <ul class="solution-options-panel__accepted">
      @for (option of challenge.options; track option.id) {
        <li [class.solution-options-panel__selected-row]="option.isSelected">
          <span>{{ option.text }}</span>
          @if (option.isSelected) {
            <strong>Selected</strong>
          } @else if (
            canEdit && (challenge.status === 'OptionsDrafted' || challenge.status === 'OptionSelected')
          ) {
            <button mat-button (click)="selectOption(option.id)">Select</button>
          }
        </li>
      }
    </ul>
  }

  @if (challenge.status !== 'OptionSelected') {
    @if (draftError()) {
      <p class="solution-options-panel__error" role="alert">{{ draftError() }}</p>
    }

    @if (canEdit && challenge.problemStatement) {
      <button
        mat-raised-button
        class="solution-options-panel__draft-button"
        (click)="requestDrafts()"
        [disabled]="isDrafting()"
      >
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
  }
</div>
```

Three changes are folded in here: the accepted `<ul>` now precedes the drafting block; the drafting block (error, button, and draft editors) is wrapped in `@if (challenge.status !== 'OptionSelected')`; and the `Select` button's condition now also covers `OptionSelected`. `draftError` moves inside the wrapper because it reports a drafting failure and has no meaning once drafting is hidden. The `Select` button still calls the unchanged `selectOption`, so the API stays the source of truth and a rejected switch surfaces through the existing 409 snackbar in `error-handling.interceptor.ts` — do not add error handling here.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx ng test --watch=false`
Expected: PASS. The new test passes, and both pre-existing `canEdit` tests — which use status `OptionsDrafted`, untouched by these conditions — keep passing with their `queryAll('button').length` assertions of 0 and 2. If either of those two fails, the gating condition is wrong; do not edit those tests to match.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.html src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.spec.ts
git commit -m "feat: reorder options panel, gate drafting, allow re-selection"
```

---

### Task 5: Solution options panel styling

Style-only. Implements the three styling items of spec section 4.

**Files:**
- Modify: `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.scss`

**Interfaces:**
- Consumes: from Task 4 — the class `solution-options-panel__draft-button` on the Draft button, and `solution-options-panel__selected-row` bound on the selected `<li>`.
- Produces: nothing later tasks rely on. This is the final task.

- [ ] **Step 1: Apply the styles**

Replace the entire contents of `src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.scss` with:

```scss
.solution-options-panel {
  padding: 1rem 0;

  &__field {
    width: 100%;
  }

  // Without this the button's ripple overlay runs into the first draft box.
  &__draft-button {
    margin-bottom: 1rem;
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
      // Horizontal padding on every row, not only the selected one, so rows
      // keep their width when the selection moves.
      padding: 0.5rem;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    // The li is flex + space-between, so `strong` is already pinned right; this
    // is a minimum gap that only shows once the option text fills the row.
    strong {
      padding-left: 0.5rem;
    }
  }

  // No --mat-sys-* token means "selected", so this is the documented
  // light-dark() fallback. Foreground is set with the background: contrast is
  // 7.9:1 in light and 8.8:1 in dark, both clear of the 4.5:1 body-text floor.
  &__selected-row {
    background: light-dark(#dff3e4, #12301e);
    color: light-dark(#0b5228, #9fd8b4);
    border-radius: 4px;
    // The row is a filled block, so the divider would cut across its corners.
    border-bottom-color: transparent;
  }

  &__error {
    color: var(--mat-sys-error);
    font-size: 0.875rem;
    margin: 8px 0 0;
  }
}
```

- [ ] **Step 2: Build to verify the SCSS compiles**

Run: `npm run build`
Expected: build succeeds. `light-dark()` is a plain CSS function and passes through the SCSS compiler untouched.

- [ ] **Step 3: Run the test suite to confirm nothing regressed**

Run: `npx ng test --watch=false`
Expected: PASS — style-only edits, no test should change status.

- [ ] **Step 4: Verify in the browser, both themes**

With the backend and `npm start` running as in Task 1 Step 5, open a challenge that has options and a selected one. Confirm:
- The selected row is a green block with rounded corners and readable text, and no divider line cuts through it.
- The other rows keep the same width and left edge as the selected row.
- At status `OptionSelected` the "Draft Solution Options" button and the editable draft boxes are gone, the accepted list is above where they used to be, and non-selected rows still offer `Select`.
- At status `OptionsDrafted` there is clear space between the "Draft Solution Options" button and the first draft box below it — no ripple overlap.
- Toggle the theme and confirm the green row is still readable in the other theme.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/challenge-detail/solution-options-panel/solution-options-panel.component.scss
git commit -m "style: space draft button, green selected option row"
```

---

## Verification after all tasks

- [ ] **Full suite:** `npx ng test --watch=false` — all pass.
- [ ] **Build:** `npm run build` — succeeds.
- [ ] **End-to-end:** with the backend running on the `http` profile and `npm start` up, `npm run e2e` — passes. Note this writes to the API's dev SQLite database.
