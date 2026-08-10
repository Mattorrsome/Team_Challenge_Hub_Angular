# Toolbar and Challenge-List Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shrink two oversized text elements, add subtle background separation to the challenge list, and swap two toolbar text buttons for icon buttons, reordering the toolbar so the username sits beside the dark-mode toggle.

**Architecture:** Pure template (`.html`) and stylesheet (`.scss`) edits to two existing standalone components (`AppComponent`, `ChallengeListComponent`). No new components, services, or inputs/outputs. `MatTooltipModule` is a new import on `AppComponent`; everything else reuses modules already imported.

**Tech Stack:** Angular 22 standalone components, Angular Material (`MatIconModule`, `MatButtonModule`, `MatTooltipModule`), SCSS, Vitest for unit tests.

## Global Constraints

- Never hardcode a hex color in component SCSS — use a Material system token (`var(--mat-sys-*)`) or `light-dark(...)`. (spec §3, §4; `team-challenge-colors` skill)
- Icon-only buttons must keep both `aria-label` and `matTooltip` — removing the visible text label makes the accessible name and tooltip required, not optional. (spec §2)
- Keep existing CSS class names (`app-username`, `app-sign-out`, `app-admin-link`, `app-theme-toggle`, `app-title`) unchanged — existing tests in `app.component.spec.ts` select on them. (verified by reading that file)
- Theme toggle button must remain visible when signed out — it currently sits outside the `@if (auth.currentUser(); as user)` block, and a test exercises it with no sign-in. Do not merge it into the signed-in-only block. (verified by reading `app.component.spec.ts`, test `'the header toggle button flips the theme'`)

---

### Task 1: Toolbar — reorder, icon buttons, username size/color

**Files:**
- Modify: `src/app/app.component.html`
- Modify: `src/app/app.component.scss`
- Modify: `src/app/app.component.ts` (add `MatTooltipModule` import)
- Test: `src/app/app.component.spec.ts`

**Interfaces:**
- Consumes: `AuthService.currentUser()`, `AuthService.isAdmin()`, `ThemeService.theme()`/`toggle()`, `AppComponent.onSignOut()` — all unchanged, already in the file.
- Produces: no new public members. Template structure changes only.

- [ ] **Step 1: Write the failing test**

Add to `src/app/app.component.spec.ts`, inside the existing `describe('AppComponent', ...)` block (after the `'shows the username and hides the admin link for a collaborator'` test):

```typescript
  it('renders icon-only Users and sign-out buttons with accessible labels', () => {
    TestBed.inject(AuthService).signIn('jordan.patel', 'ChangeMe123!').subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiBaseUrl}/auth/signin`)
      .flush({ id: 3, username: 'jordan.patel', role: 'Admin' });

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const signOut: HTMLButtonElement = fixture.debugElement.query(
      By.css('.app-sign-out'),
    ).nativeElement;
    expect(signOut.getAttribute('aria-label')).toBe('Sign out');
    expect(signOut.textContent?.trim()).toBe('logout');

    const adminLink: HTMLAnchorElement = fixture.debugElement.query(
      By.css('.app-admin-link'),
    ).nativeElement;
    expect(adminLink.getAttribute('aria-label')).toBe('Users');
    expect(adminLink.textContent?.trim()).toBe('group');
  });
```

This asserts `mat-icon`'s ligature-font text content (`'group'`/`'logout'`) rather than a rendered glyph — that's what's actually in the DOM before the icon font paints, and it also proves the visible label text ("Users"/"Sign out") is gone.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — `app-admin-link`/`app-sign-out` elements have no `aria-label` yet and still contain the text "Users"/"Sign out", not an icon.

- [ ] **Step 3: Add `MatTooltipModule` import**

In `src/app/app.component.ts`, add the import and register it:

```typescript
import { MatTooltipModule } from '@angular/material/tooltip';
```

Add `MatTooltipModule` to the `imports` array in the `@Component` decorator (alongside the existing `MatToolbarModule, MatButtonModule, MatIconModule`).

- [ ] **Step 4: Rewrite the toolbar template**

Replace the full contents of `src/app/app.component.html` with:

```html
<mat-toolbar color="primary">
  <a class="app-title" routerLink="/">Team Challenge Hub</a>
  <span class="spacer"></span>

  @if (auth.currentUser(); as user) {
    <span class="app-username">{{ user.username }}</span>
  }

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
      <a
        class="app-admin-link"
        mat-icon-button
        routerLink="/admin/users"
        aria-label="Users"
        matTooltip="Users"
      >
        <mat-icon>group</mat-icon>
      </a>
    }
    <button
      class="app-sign-out"
      mat-icon-button
      type="button"
      aria-label="Sign out"
      matTooltip="Sign out"
      (click)="onSignOut()"
    >
      <mat-icon>logout</mat-icon>
    </button>
  }
</mat-toolbar>

<router-outlet />
```

Note the toolbar now has two separate `@if (auth.currentUser(); as user)` blocks — one for the username (before the toggle), one for the admin link and sign-out button (after the toggle). This is intentional: the theme toggle sits between them and must stay visible when signed out.

- [ ] **Step 5: Add username size and color**

In `src/app/app.component.scss`, add:

```scss
.app-username {
  font-size: 1.1rem;
  color: var(--mat-sys-tertiary);
}
```

- [ ] **Step 6: Run tests to verify everything passes**

Run: `npm test -- --watch=false`
Expected: PASS — all `app.component.spec.ts` tests, including the new one.

- [ ] **Step 7: Commit**

```bash
git add src/app/app.component.html src/app/app.component.scss src/app/app.component.ts src/app/app.component.spec.ts
git commit -m "feat: icon-only toolbar actions, reordered username, accent color"
```

---

### Task 2: Challenge list — card title size and panel backgrounds

**Files:**
- Modify: `src/app/features/challenge-list/challenge-list.component.html`
- Modify: `src/app/features/challenge-list/challenge-list.component.scss`

**Interfaces:**
- Consumes: nothing new — purely template class additions and SCSS rules on existing markup.
- Produces: nothing new.

No test step here: this task changes only CSS declarations (font-size, background, border-radius, padding) on markup whose structure and text content are untouched, and none of it is logic a unit test can meaningfully assert (jsdom does not resolve Material's `--mat-sys-*` custom properties the way a real browser paints them). `ChallengeListComponent`'s existing spec asserts fetch/loading/filter behavior only and is unaffected. Task 3 covers visual confirmation in a real browser.

- [ ] **Step 1: Add a class to the card title**

In `src/app/features/challenge-list/challenge-list.component.html`, change:

```html
            <mat-card-title>{{ challenge.title }}</mat-card-title>
```

to:

```html
            <mat-card-title class="challenge-list__card-title">{{ challenge.title }}</mat-card-title>
```

- [ ] **Step 2: Add the SCSS rules**

In `src/app/features/challenge-list/challenge-list.component.scss`, update the `&__header` and `&__grid` rules and add `&__card-title`:

```scss
  &__header {
    display: flex;
    // Filter and action grouped at the right, per the design.
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
    background: var(--mat-sys-surface-container-low);
    border-radius: 8px;
    padding: 0.75rem 1rem;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
    background: var(--mat-sys-surface-container);
    border-radius: 8px;
    padding: 1rem;
  }

  &__card-title {
    font-size: 1.1rem;
  }
```

(Only these three rules change; leave `&__card-link`, `&__empty`, and the `@media` block as they are.)

- [ ] **Step 3: Run the existing test suite to confirm no regression**

Run: `npm test -- --watch=false`
Expected: PASS — `challenge-list.component.spec.ts` and `app.component.spec.ts` unaffected.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/challenge-list/challenge-list.component.html src/app/features/challenge-list/challenge-list.component.scss
git commit -m "style: shrink card title, add panel backgrounds to challenge list"
```

---

### Task 3: Manual browser verification

**Files:** none — verification only, per this repo's rule that UI changes get checked in a running browser before being called done.

- [ ] **Step 1: Start the dev server**

Run: `npm start`

- [ ] **Step 2: Sign in and inspect the toolbar**

Navigate to the running app, sign in as an Admin user. Confirm, left to right: app title, username (1.1rem, accent-colored, distinct from surrounding toolbar text), dark-mode toggle, a "Users" icon button (group icon) with a tooltip on hover, a "Sign out" icon button (logout icon) with a tooltip on hover. Toggle dark mode and confirm the username color and icon-button contrast both still read clearly in dark theme.

- [ ] **Step 3: Sign out and re-check the toggle**

Sign out. Confirm the dark-mode toggle button is still visible and functional with no username/icons present (matches current signed-out behavior).

- [ ] **Step 4: Inspect the challenge list**

Navigate to `/challenges` with at least one challenge present. Confirm: the header row (filter + "New Challenge") has a subtle background distinct from the page, the card grid has a different subtle background distinct from both the page and the header, and each card's title renders at the smaller 1.1rem size. Resize the window below 600px and confirm the header/grid backgrounds and layout still look correct with the existing mobile stacking.

- [ ] **Step 5: Stop the dev server**

Stop the `npm start` process once verification is complete.
