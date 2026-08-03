# Team Challenge Hub — Styling & Theme Update

**Date:** 2026-08-03
**Status:** Approved
**Base spec:** `2026-07-27-frontend-design.md`
**Companion specs:** `2026-08-03-ux-behavior-update.md`,
`2026-08-03-auth-roles-frontend.md`

## Problem Statement

Current styling has no dark mode, isn't mobile-friendly, wraps button text
awkwardly, and lets the challenge-list toolbar and content stretch full-width
on desktop instead of aligning tidily. There's also no documented color
system, so future styling work has no source of truth.

## Scope

In scope:
- Dark mode (manual toggle, persisted)
- Mobile-friendly responsive layout across all views
- Button labels don't wrap unless the screen genuinely requires it
- Filter/selector toolbar right-aligned, capped width on desktop
- Color palette as CSS custom properties (light + dark) and as a Claude Code
  skill documenting usage rules

Out of scope:
- Behavior/navigation changes (see UX spec)
- Auth-related UI (see auth spec)

## Design

### Palette

The four requested brand colors:

| Role | Value | Usage |
|---|---|---|
| Dark surface | `#070c14` | Dark-theme background |
| Light surface / dark-theme text | `#ffffff` | Light-theme background, dark-theme text |
| Secondary | `#007FBA` | Buttons, active/selected states, focus rings |
| Sparse accent | `#FFC72C` | Links and other sparse emphasis only — never backgrounds or large surfaces |

These are applied through Angular Material's M3 theming, not hand-rolled CSS
custom properties. Rationale below.

**Palette generation:** `ng generate @angular/material:theme-color` seeds M3
tonal palettes from `#007FBA` (primary) and `#FFC72C` (tertiary). M3 derives
the full tone ramps, which guarantees contrast ratios the raw hex values
alone don't. The derived dark surface is then **overridden** to exactly
`#070c14` and its on-surface to exactly `#ffffff` via `mat.theme()`'s
overrides, so the brand background is exact while everything else keeps M3's
contrast guarantees. (Human partner ruling, 2026-08-03: generate from seeds,
override key surfaces to exact hex.)

### Dark mode toggle

**Mechanism: Angular Material's `theme-type: color-scheme`, not hand-rolled
custom properties.** (Human partner ruling, 2026-08-03, revising this spec's
original approach.)

The original plan — CSS custom properties on `:root` flipped by a
`[data-theme="dark"]` attribute — cannot restyle Angular Material components.
Material's toolbar, cards, buttons, form fields, and selects read
`--mat-sys-*` tokens emitted by `mat.theme()`; app-authored custom properties
never reach them. Since this app is Material-heavy, that approach would have
left every Material surface light in "dark" mode. Verified in
`node_modules/@angular/material/core/tokens/_system.scss:237-256`:
`theme-type` accepts `light` (the current default), `dark`, or
`color-scheme`, and `color-scheme` emits every system color as a native CSS
`light-dark()` pair.

So:

- `mat.theme()` in `src/styles.scss` gains `theme-type: color-scheme`, making
  every Material token a `light-dark()` pair.
- The toggle sets the CSS `color-scheme` property on `<html>` to `light` or
  `dark`. Native CSS resolves every `light-dark()` token — all Material
  components flip with no per-component dark styling.
- App-authored CSS uses `light-dark()` for its own colors, matching the same
  mechanism.
- Persisted to `localStorage` (`tch_theme`); applied before first paint to
  avoid a flash of the wrong theme.
- No system-preference auto-detection — user's explicit choice only, per
  request. (`color-scheme: light dark` would defer to the OS; this app sets
  one or the other explicitly.)

### Mobile-friendly layout

- CSS `@media (max-width: 600px)` drives the layout switches, matching the
  breakpoints already present in this codebase. `BreakpointObserver` is not
  used: nothing here needs TypeScript to *know* the breakpoint — these are
  pure layout reflows, and the base spec explicitly allows "`BreakpointObserver`
  (or CSS grid + flex)".
  - Challenge list: multi-column card grid (desktop) → single-column stacked
    cards (mobile), and its header wraps rather than squeezing.
  - Forms and challenge-detail panels: reflow to single-column.
  - Stepper action buttons stack full-width.
- Audit each feature's `.component.scss` for hardcoded widths and paddings
  that would break under 600px.

### Button text no-wrap

Shared style rule (`white-space: nowrap` on `.mat-mdc-button` label content)
applied app-wide, so button labels stay on one line by default. Only relaxed
back to `white-space: normal` under the mobile breakpoint, for cases where a
fixed-width button genuinely can't fit its label at that size.

### Filter/selector alignment

Challenge-list toolbar (status filter + any future sort control) becomes a
flex row with `justify-content: flex-end`. The toolbar and main content
container get a `max-width` on desktop (not `100%`), so the page doesn't
stretch edge-to-edge on wide screens.

### Claude Code color skill

New skill file (`.claude/skills/team-challenge-colors/SKILL.md` at the repo
root) documenting:
- The four brand colors and their roles
- Usage rules (`#007FBA` for interactive elements; `#FFC72C` sparingly, links
  only)
- The theming mechanism: `theme-type: color-scheme` + `light-dark()`, so
  future work adds colors the same way instead of hand-rolling a second
  system
- Pointers to `src/styles.scss` and the generated theme-colors file

This gives future styling work in this repo a single source of truth instead
of re-deriving the palette from scratch each session.

## Testing

- **Component test**: theme toggle — clicking it flips `data-theme` and
  persists to `localStorage`.
- **Visual/manual check**: no automated visual regression suite in this
  project (out of scope per base spec's testing section) — verify dark mode,
  mobile layout, button wrapping, and toolbar alignment manually in a
  browser at both a desktop and ~375px viewport width.

## Assumptions

- `#070c14`/`#ffffff` is the dark-theme pair (near-black background, white
  text); the light theme is the derived inverse — confirmed during design
  discussion (2026-08-03).
- Angular Material 22.0.8's `theme-type: color-scheme` is the theming
  mechanism; the app's current `mat.theme()` call uses the default
  `theme-type: light` and needs changing.

## Open Questions

None — all decisions confirmed during design discussion (2026-08-03) and the
two mechanism rulings on 2026-08-03 (Material `color-scheme` over
hand-rolled custom properties; seed-generated palettes with exact-hex surface
overrides).
