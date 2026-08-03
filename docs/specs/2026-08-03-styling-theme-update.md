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

Two color pairs from the original request, used as CSS custom properties on
`:root` / `[data-theme]`:

| Token | Dark theme | Light theme |
|---|---|---|
| `--color-bg` | `#070c14` | `#ffffff` |
| `--color-fg` | `#ffffff` | `#070c14` |
| `--color-accent` | `#007FBA` | `#007FBA` |
| `--color-highlight` | `#FFC72C` | `#FFC72C` |

`--color-accent` drives buttons, active/selected states, and focus rings.
`--color-highlight` is reserved for links and other sparse emphasis only —
not backgrounds or large surfaces.

### Dark mode toggle

- Toggle button in the app header, flips `data-theme="dark"` /
  `data-theme="light"` on `<html>`.
- Persisted to `localStorage` (`tch_theme`); applied via an inline script (or
  early app-init read) before first paint to avoid a flash of the wrong
  theme.
- No system-preference auto-detection — user's explicit choice only, per
  request.

### Mobile-friendly layout

- Angular Material `BreakpointObserver` (already anticipated in the base
  spec) drives layout switches at a `~600px` breakpoint:
  - Challenge list: multi-column card grid (desktop) → single-column stacked
    cards (mobile).
  - Forms and challenge-detail panels: reflow to single-column.
- Audit each feature's `.component.scss` for hardcoded widths that would
  break under 600px.

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

New skill file (e.g. `.claude/skills/team-challenge-colors/SKILL.md` at the
repo root) documenting:
- The four tokens above and their light/dark values
- Usage rules (accent for interactive elements; highlight sparingly, links
  only)
- Pointer to where the CSS custom properties live in the app

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

## Open Questions

None — all decisions confirmed during design discussion (2026-08-03).
