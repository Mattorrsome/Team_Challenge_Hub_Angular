# Toolbar and Challenge-List Styling — Design

## Problem

Small set of visual polish issues in the app toolbar (`app.component.html/scss`)
and the challenge list (`challenge-list.component.html/scss`):

1. Challenge title in each card, and the signed-in username in the toolbar,
   render at Material's default size — too large relative to surrounding UI.
2. `challenge-list__header` (filter + New Challenge) and `challenge-list__grid`
   (card grid) have no visual separation from the page background or from
   each other.
3. "Users" (admin link) and "Sign out" render as text buttons, taking more
   toolbar width than needed.
4. Username sits at the far right of the toolbar, disconnected from the
   dark-mode toggle.
5. Username has no visual distinction from other toolbar text.

## Changes

### 1. Font sizes

- `mat-card-title` inside `.challenge-list__card-link` → `font-size: 1.1rem`.
- `.app-username` → `font-size: 1.1rem`.

### 2. Toolbar layout and order

New order, left to right: app title — spacer — username — dark-mode toggle —
Users icon button (admin only) — sign-out icon button.

- Username moves from the end of the toolbar to just before the dark-mode
  toggle button.
- "Users" link becomes an icon-only `mat-icon-button` using the `group` icon,
  keeping `aria-label="Users"` and `matTooltip="Users"` (icon-only removes the
  visible label, so the accessible name and tooltip are required, not
  optional).
- "Sign out" button becomes an icon-only `mat-icon-button` using the `logout`
  icon, keeping `aria-label="Sign out"` and `matTooltip="Sign out"`.
- Both icon buttons stay functionally identical (same click handlers, same
  `@if` guards) — only the button content and one `MatIconModule`/
  `MatTooltipModule` import change.

### 3. Username color

`.app-username` gets a fixed color distinct from surrounding toolbar text,
using the existing tertiary/accent token (the `#FFC72C` role already reserved
for "links and small emphasis" per `team-challenge-colors`) rather than a new
hardcoded hex — e.g. `color: var(--mat-sys-tertiary)`. Same color in light and
dark theme; no per-user hashing.

### 4. Challenge-list backgrounds

`challenge-list__header` and `challenge-list__grid` each get a distinct, subtle
tonal background using Material system surface-container tokens (theme-safe in
both light and dark automatically, no hardcoded hex):

- `challenge-list__header` → `background: var(--mat-sys-surface-container-low)`
- `challenge-list__grid` → `background: var(--mat-sys-surface-container)`

Both get small `border-radius` and `padding` so each reads as a soft panel
rather than a hard block change.

## Out of scope

- Per-user hashed username colors (deferred; fixed accent color chosen instead).
- Any change to admin-guard logic, sign-out behavior, or filter behavior —
  purely visual/structural template and SCSS changes.

## Files touched

- `src/app/app.component.html`
- `src/app/app.component.scss`
- `src/app/features/challenge-list/challenge-list.component.html`
- `src/app/features/challenge-list/challenge-list.component.scss`
