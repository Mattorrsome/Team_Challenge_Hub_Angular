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
`padding-left` (0.5rem) — currently flush against the card edge.

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
  API.
- **`<strong>Selected</strong>` spacing**: increased `margin-left` (0.5rem) so
  it doesn't sit flush against the option text.
- **Selected `li` color**: selected `li` gets a green background via
  `light-dark(<light-green>, <dark-green>)` written directly in
  `solution-options-panel.component.scss`. No system `--mat-sys-*` token
  represents a success/selected state, so this follows the
  team-challenge-colors skill's documented fallback (`light-dark()` literal,
  never a bare hex) rather than repurposing an existing token whose semantic
  meaning (primary/secondary/error) doesn't fit "selected".

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
- `solution-options-panel.component.spec.ts`: update assertions for the
  reordered template, the `OptionSelected` hide condition on the draft block,
  and the widened `Select` button condition (visible at both `OptionsDrafted`
  and `OptionSelected`).

## Out of scope

- Backend/API changes of any kind.
- Generalizing the review-display item beyond `InReview`.
- Any new color tokens beyond the one `light-dark()` literal for "selected".
