# Navigation and icon polish — design

Date: 2026-08-11
Source: `../frontend feedback.md` (team feedback on the running app)

Six presentation changes across the challenge list, the app toolbar, user
management, and the solution options panel. No API calls change, no routes are
added, and no data flow is touched — this is layout, labelling, and one safety
guard.

## Scope

| # | Change | Files |
|---|--------|-------|
| 1 | Remove the challenge list's max width | `challenge-list.component.scss` |
| 2 | Left-align the status filter, cap it at 50% on desktop | `challenge-list.component.scss` |
| 3 | Show spaced status labels in the filter | `challenge.model.ts`, `status-badge.component.ts`, `challenge-list.component.{ts,html}` |
| 4 | Stack the toolbar on mobile | `app.component.scss` |
| 5 | Add a back bar below the toolbar off the list page | `app.component.{ts,html,scss}` |
| 6 | Replace Delete / Select / Selected text with icons | `user-management.component.{ts,html}`, `solution-options-panel.component.{ts,html,scss}` |

Out of scope: everything named under "Scope boundaries" in `CLAUDE.md`, plus a
shared confirmation-dialog component (see item 6).

## 1. Remove the challenge list's max width

`.challenge-list` in `challenge-list.component.scss` carries `max-width:
1100px` with a comment about not stretching edge-to-edge. Delete the
declaration and the comment. `__grid` is already `repeat(auto-fill,
minmax(260px, 1fr))`, so wider viewports simply fit more cards per row.

## 2. Filter left, action right, 50% wide on desktop

`.challenge-list__header` is `justify-content: flex-end`, which groups the
filter and the New Challenge button together at the right. Change it to
`space-between`: the `mat-select` moves to the left edge of the header, the
button stays at the right. The template does not change.

The `mat-select` is used bare, without a `mat-form-field`, so width goes on the
host element:

```scss
&__header mat-select {
  @media (min-width: 601px) {
    width: 50%;
  }
}
```

601px is the deliberate mirror of the `max-width: 600px` mobile block already
at the bottom of that file. Below it the filter keeps its current intrinsic
width, so nothing on mobile regresses.

## 3. Spaced status labels in the filter

The filter renders raw enum values (`ProblemStatementDrafted`), while
`app-status-badge` beside it renders `Problem Statement Drafted`. The spaced
labels already exist as a private `LABELS` map in
`status-badge.component.ts`.

Rather than duplicate that map, export it once from
`core/models/challenge.model.ts`, beside the `ChallengeStatus` union that both
components already import:

```ts
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

`status-badge.component.ts` deletes its local `LABELS` and imports
`STATUS_LABELS`; its `label` computed is otherwise unchanged, so its existing
spec still passes. `ChallengeListComponent` exposes `readonly statusLabels =
STATUS_LABELS` and the template option becomes `{{ statusLabels[status] }}`.
The `Record<ChallengeStatus, string>` type keeps the map exhaustive: adding a
status to the union without a label is a compile error.

Only the visible text changes — `[value]` still binds the raw
`ChallengeStatus`, so the filter's request payload is untouched.

## 4. Stack the toolbar on mobile

Below 600px the title should own a full-width row with the username, theme
toggle, admin link, and sign-out right-aligned beneath it. `mat-toolbar` is a
flex row with a fixed single-row height, so this is entirely
`app.component.scss`:

```scss
@media (max-width: 600px) {
  mat-toolbar {
    flex-wrap: wrap;
    // Material pins a single-row height; without this the wrapped row clips.
    height: auto;
    padding-block: 0.5rem;
  }

  .app-title {
    flex: 0 0 100%;
  }
}
```

`.spacer` (`flex: 1 1 auto`) already pushes the trailing cluster right, and
once the title consumes a full row that cluster wraps below it. No template
change, and desktop is untouched.

## 5. Back bar below the toolbar

Rendered once in `app.component.html`, immediately after `</mat-toolbar>` and
before `<router-outlet />`:

```html
@if (showBack()) {
  <a class="app-back" mat-button routerLink="/challenges">
    <mat-icon>arrow_back</mat-icon>Back
  </a>
}
```

It is a plain `routerLink` to the challenge list, not a history `back()`. That
is a deliberate choice: it is predictable, it never walks the user out of the
app on a deep link, and it needs no history bookkeeping. The accepted trade-off
is that from `/challenges/:id/edit` it returns to the list rather than to the
detail page.

Visibility is a computed over the current URL:

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
  return path !== '/challenges' && !path.startsWith('/sign-');
});
```

`initialValue: this.router.url` covers the first paint, before any
`NavigationEnd` has fired. Splitting on `?` keeps a future query string from
defeating the equality check. Given the route table, the bar shows on
`/challenges/new`, `/challenges/:id`, `/challenges/:id/edit`, and
`/admin/users`; it is hidden on `/challenges`, `/sign-in`, and `/sign-up`.

The empty path `''` redirects to `challenges` with `pathMatch: 'full'`, and
`urlAfterRedirects` reports the post-redirect URL, so a visit to `/` correctly
hides the bar.

`app.component.ts` already injects `Router` and imports `RouterLink`,
`MatButtonModule`, and `MatIconModule`; this adds only the `toSignal`,
`computed`, and RxJS operator imports. Styling is a small `.app-back` block —
horizontal padding matching the page content and a little top margin — so the
bar reads as a strip under the toolbar rather than as page content.

## 6. Icon replacements

### User management delete

`user-management.component.html` replaces the text button with an icon button:

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

The `aria-label` names the specific user rather than saying "Delete", so a
screen-reader user moving down the list can tell the rows apart. Add
`MatIconModule` and `MatTooltipModule` to the component's `imports`.

`onDelete` currently fires the DELETE with no confirmation, and stripping the
word "Delete" removes the last thing standing between a mis-click and a
removed user. It gains a native guard — no dialog component, no new imports,
no template change:

```ts
onDelete(user: User): void {
  if (!confirm(`Delete ${user.username}?`)) return;
  this.userApi.deleteUser(user.id).subscribe({ /* unchanged */ });
}
```

A `MatDialog` confirmation would look better and be more accessible, but it
means a new shared component plus its own spec — disproportionate to this
change, and explicitly not taken.

### Solution options select / selected

In `solution-options-panel.component.html`, the `Selected` text and the
`Select` button become icons. The surrounding `@if` / `@else if` conditions are
unchanged:

```html
@if (option.isSelected) {
  <mat-icon
    class="solution-options-panel__selected-icon"
    role="img"
    aria-label="Selected option"
    matTooltip="Selected option"
  >check_circle</mat-icon>
} @else if (
  canEdit && (challenge.status === 'OptionsDrafted' || challenge.status === 'OptionSelected')
) {
  <button
    mat-icon-button
    aria-label="Select this option"
    matTooltip="Select this option"
    (click)="selectOption(option.id)"
  >
    <mat-icon>radio_button_unchecked</mat-icon>
  </button>
}
```

The two states differ by glyph shape, not merely by fill: a filled
`check_circle` for the selected option against an outlined
`radio_button_unchecked` for the action. No colour rule is needed —
`li…__selected-row` already sets `color: light-dark(#0b5228, #9fd8b4)` and
`mat-icon` inherits it, so the check picks up the row's green for free while
the action icon keeps the default foreground. `__selected-icon` therefore
exists only as a layout hook (alignment/margin within the row), and can be
dropped if the default flow already sits right. The selected icon is static, so
it is marked `role="img"` with a label rather than left as decorative.

Add `MatIconModule` and `MatTooltipModule` to the component's `imports`.

## Testing

Existing specs, and what happens to them:

- `user-management.component.spec.ts` calls `onDelete()` directly and never
  queries button text, so the icon swap does not touch it. The `confirm` guard
  does: every test that reaches the DELETE must stub `window.confirm` to return
  `true`, and one new test stubs it to return `false` and asserts
  `deleteUser` was never called.
- `solution-options-panel.component.spec.ts` currently asserts that the
  rendered button text contains `'Select'`. With no text left, that assertion
  moves to the `aria-label` — a better assertion regardless, since it is what
  the tooltip and a screen reader both read. The sibling assertion that the
  selected row shows no Select control of its own still holds, queried the same
  way.
- `status-badge.component.spec.ts` asserts rendered label text and is unaffected
  by the map moving, which is the point of the move.

New coverage:

- `app.component.spec.ts`: the back bar is absent on `/challenges` and present
  on `/admin/users`. Assert on the presence of `.app-back` after navigation
  rather than on `showBack()` in isolation, so the template condition is
  covered too.
- `challenge-list.component.spec.ts`: opening the filter renders `Problem
  Statement Drafted`, not `ProblemStatementDrafted`.

The purely visual changes (items 1, 2, 4, and the icon colours) get no unit
tests — asserting on computed styles in jsdom tests the framework, not the
change. They are verified in the browser at both a desktop width and below
600px.

Run with `ng test --watch=false`; the runner is Vitest, so use Vitest matchers
(`.toBe(true)`, not `toBeTrue()`).

## Risks

- `height: auto` on `mat-toolbar` overrides a Material internal. It is scoped
  to the mobile media query, so a future Material version can only regress the
  narrow layout, not the desktop one.
- Widening the challenge list (item 1) changes how the page reads on a large
  monitor. That is the requested outcome, but it is the change most likely to
  draw a follow-up opinion.
