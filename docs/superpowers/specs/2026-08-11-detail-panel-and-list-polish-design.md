# Detail panel and list polish — design

Source: `frontend feedback.md` (repo-adjacent, not checked in). Six independent
UI polish items across `challenge-list` and `challenge-detail` /
`solution-options-panel`. All template/style edits to existing components — no
new components, no API changes, no status-flow changes.

## 1. challenge-list panel color

`challenge-list.component.scss`: `__header` and `__grid` backgrounds change
from surface-container tokens to `var(--mat-sys-secondary-container)`, text to
`var(--mat-sys-on-secondary-container)`. Same tint on both, so header and grid
read as one panel, visually distinct from `mat-card`'s neutral surface. Rejects
the yellow accent (`#FFC72C`) as a background per the team-challenge-colors
skill's rule that it's link/emphasis-only.

## 2. challenge-list card title spacing

`challenge-list.component.scss`: `.challenge-list__card-title` gets
`padding-left: 16px`. The card renders `mat-card-title` directly in `mat-card`
(no `mat-card-header`), so the title gets no horizontal padding, while
`mat-card-content` below it carries Material's own `0 16px` — the title sits
flush while the status badge under it is inset. 16px matches
`mat-card-content`, so the two align rather than merely being "less flush".
Verify the alignment in the browser at implementation time; if Material's
content padding differs in this version, match the observed value.

## 3. status-stepper position

`challenge-detail.component.html`: `<app-status-stepper>` moves up in the
template. New order: title row (`h2`, `app-status-badge`, edit link) →
`app-status-stepper` → raw notes → problem-statement section → panel switch.
The title row stays first; only the stepper moves.

## 4. solution-options-panel: layout, gating, spacing

`solution-options-panel.component.html` / `.scss`:

- **Ripple overlap fix**: the "Draft Solution Options" button gets
  `margin-bottom: 1rem`, separating it from the first `.solution-options-panel__draft`
  box below it.
- **Reorder**: `<ul class="solution-options-panel__accepted">` moves above the
  draft-editing block (button + `@for` draft divs) in the template.
- **Hide drafting UI once an option is selected**: the draft-editing block
  (button + draft divs) is wrapped in `@if (challenge.status !== 'OptionSelected')`
  — hidden once status reaches `OptionSelected`, so only the accepted list
  shows from that point on.
- **Allow switching the selection**: the `Select` button's condition widens
  from `canEdit && challenge.status === 'OptionsDrafted'` to
  `canEdit && (challenge.status === 'OptionsDrafted' || challenge.status === 'OptionSelected')`.
  This lets the owner pick a different option after one is already selected.
  The frontend doesn't hardcode whether the switch is *allowed* to persist —
  it still calls the existing `selectOption` → `ChallengeApiService.selectOption`
  path, and the API remains the source of truth (409 if the transition/change
  isn't valid), consistent with how the status stepper already defers to the
  API. **A rejected switch already surfaces to the user**:
  `error-handling.interceptor.ts` opens a snackbar on any 409 whose URL isn't
  `/users/`, which covers this call. Do *not* add inline error handling to
  `selectOption` — the interceptor is the existing, tested path.
- **`<strong>Selected</strong>` spacing**: `padding-left: 0.5rem` on the
  `strong`. Note the flex context before implementing: the `li` is
  `display: flex; justify-content: space-between` with two children, so
  `strong` is already pinned to the right edge with the maximum gap, and this
  padding is a **minimum gap** that only becomes visible once the option text
  is long enough to fill the row. On a short option nothing will appear to
  change — that is correct, not a failed edit.
- **Selected `li` color**: the selected `li` gets a green background *and* an
  explicit matching foreground, both as `light-dark(<light>, <dark>)` pairs
  written directly in `solution-options-panel.component.scss`. No system
  `--mat-sys-*` token represents a success/selected state, so this follows the
  team-challenge-colors skill's documented fallback (`light-dark()` literal,
  never a bare hex) rather than repurposing a token whose semantic meaning
  (primary/secondary/error) doesn't fit "selected". Two constraints the
  background creates:
  - **Horizontal padding**: `ul` is `padding: 0` and `li` is `padding: 0.5rem 0`,
    so a fill would run flush to the panel edge. Add horizontal padding to
    *every* `li` (not only the selected one) so rows don't shift width when a
    selection changes — `padding: 0.5rem` — and give the selected row a small
    `border-radius` so the fill reads as a block rather than a full-bleed band.
  - **Contrast**: the foreground must clear 4.5:1 against the green fill in
    **both** themes (the current `--mat-sys-on-surface` would not be reliable
    against a green background). Pick the light/dark green pair and its
    foreground together, and check both before calling the item done. A light
    green tint with a dark green text in light mode, and a desaturated dark
    green fill with a light green text in dark mode, both satisfy this.

## 5. Selected option shown during review

`challenge-detail.component.html`: when `c.status === 'InReview'`, render the
selected option (from `c.options`, filtered on `isSelected`) in a new small
section below the problem-statement section. Reuses data already present on
`Challenge` — no new signal, service call, or model change. Scoped to
`InReview` only; `Approved`/`Rejected` show nothing extra (deliberately not
generalized to "whenever the panel is 'none'" — narrower than that).

## Testing

- `challenge-list.component.spec.ts`: no behavior change, styling only — no
  new test expected.
- `challenge-detail.component.spec.ts`: update/add assertions for stepper
  position and the new InReview selected-option section. The existing
  7-case `currentPanel` exhaustiveness test is untouched (no `ChallengeStatus`
  change).
- `solution-options-panel.component.spec.ts`: add a case for `OptionSelected` —
  the draft block hidden, and `Select` still offered on a non-selected option.
  The two existing `canEdit` tests set status `OptionsDrafted`, which none of
  these changes alter, so they should keep passing untouched; if one fails, the
  gating condition is wrong, not the test. Assert the new case by button text
  (`Select` present, `Draft Solution Options` absent) rather than by
  `queryAll('button').length` as the existing tests do — at `OptionSelected`
  the count changes for two independent reasons, so a count assertion can't
  say which behavior broke.

## Out of scope

- Backend/API changes of any kind.
- Generalizing the review-display item beyond `InReview`.
- Any new color tokens beyond the one `light-dark()` literal for "selected".
