---
name: team-challenge-colors
description: Use when styling anything in the Team Challenge Hub Angular app — picking a color, adding a themed component, or touching SCSS. Defines the brand palette, its usage rules, and the light/dark theming mechanism.
---

# Team Challenge Hub — Colors

## Palette

| Color | Role | Where it may be used |
|---|---|---|
| `#070c14` | Dark surface | Dark-theme background only |
| `#ffffff` | Light surface / dark text | Light-theme background; text on dark |
| `#007FBA` | Secondary / interactive | Buttons, active and selected states, focus rings |
| `#FFC72C` | Sparse accent | Links and small emphasis ONLY — never a background, never a large surface |

`#007FBA` seeds the M3 **primary** palette; `#FFC72C` seeds **tertiary**;
`#070c14` seeds **neutral**. The generated ramps live in
`src/app/styles/_theme-colors.scss` — regenerate that file with
`ng generate @angular/material:theme-color`, never hand-edit it.

## Theming mechanism

Light/dark runs on Angular Material's `theme-type: color-scheme` (configured
in `src/styles.scss`), which emits every `--mat-sys-*` color as a CSS
`light-dark(light, dark)` pair. Switching themes only sets the `color-scheme`
property on `<html>` — see `src/app/core/theme/theme.service.ts`.

## Rules for new styling

- **Never hardcode a hex value in component SCSS.** Use a Material system
  token: `var(--mat-sys-on-surface)`, `var(--mat-sys-on-surface-variant)`
  (secondary text), `var(--mat-sys-outline-variant)` (borders),
  `var(--mat-sys-primary)` (interactive), `var(--mat-sys-error)` (errors).
- If no token fits, write `light-dark(<light>, <dark>)` — never a bare hex,
  which would be wrong in one of the two themes.
- **Do not** add `:root`/`[data-theme]` custom properties for colors. Such
  properties cannot restyle Angular Material components, which read
  `--mat-sys-*`; a second system would silently diverge.
- Do not emit `color-scheme: light dark` — this app follows the user's
  explicit choice, not the OS setting.
