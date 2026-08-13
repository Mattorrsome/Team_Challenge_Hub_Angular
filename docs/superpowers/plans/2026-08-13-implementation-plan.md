# Team Challenge Hub Angular — Implementation Plan

**Date:** 2026-08-13 (consolidated)
**Status:** All ten feature plans complete and merged to `main`.
**Spec:** `../../specs/2026-08-13-frontend-design.md`
**Decision log:** `decisions.md`
**Companion backend plan:** `../../../Team_Challenge_Hub_API/docs/superpowers/plans/backend-plan.md`

This replaces the ten per-feature plans written between 2026-07-29 and
2026-08-11. Where they contradicted each other, the later one won; superseded
approaches are in the decision log.

Every task below has shipped, so **the code is the source of truth for what it
looks like now** — the original plans' verbatim before/after snippets are in git
history and are not reproduced here. What this document keeps is the part that
does not live in the code: the constraints any future work must obey, what each
wave actually delivered and in what order, how to verify it, and what was left
undone on purpose.

## Global Constraints

Binding on all future work in this repo.

**Environment**

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`. Angular 22.0.8, Material 22.0.8.
- No new npm dependencies without a reason the ladder can't answer.
- Run every command from the repo root.

**Testing**

- Runner is **Vitest** (`@angular/build:unit-test`), not Jasmine/Karma. Use
  `npx ng test --watch=false`; **do not pass `--include=`**, this builder does not
  support it, so every test step runs the whole suite. Vitest matchers only
  (`.toBe(true)`, never `toBeTrue()`); `describe`/`it`/`expect`/`vi` are globals.
- Baseline: **114 passing across 19 files**. A change that moves that number
  should say why.
- Build with `npm run build` (or `npx ng build`) — the only thing that catches a
  SCSS syntax error in style-only work.
- `npm run e2e` needs the sibling API running on its **`http`** launch profile
  alongside `ng serve`, and writes to the API's dev SQLite database. The `https`
  profile binds both ports, so `UseHttpsRedirection()` 307s a proxied request on
  5179 to the HTTPS origin — cross-origin from the browser's view, which drops the
  `SameSite=Lax` session cookie and fails every authenticated request.
- UI changes get a browser pass at a desktop width and below 600px, in both
  themes, before being called done. Style-only changes get no unit test:
  asserting computed styles in jsdom tests the framework.

**Angular**

- Standalone components only, no NgModules. Separate `.component.ts` / `.html` /
  `.scss` per component — no inline `template`/`styles`. Legacy `.component`
  suffix, generated with `ng generate component <path> --style=scss`.
- `inject()` for DI, `OnPush` on every component, strict TypeScript, typed
  inputs/outputs, no implicit `any`.
- Components never inject `HttpClient` — all HTTP goes through an API service.

**Rules with teeth**

- AI draft endpoints are read-only server-side. Their output must land in an
  editable field behind an explicit accept action. **Never wire a draft response
  to a persisting call.**
- Never reimplement status-transition rules client-side. The API is the source of
  truth and returns 409.
- `canEdit` is a UX affordance, not a security boundary, and is written in exactly
  one place. Never add a second copy of the ownership rule; never drop a
  server-side check because the UI hides the control.
- Do not add an interceptor branch for something a component should own, and do
  not add component handling for something the interceptor already covers — in
  particular, no inline error handling on `selectOption`.
- **Never hardcode a hex value in component SCSS.** Use a `--mat-sys-*` token, or
  `light-dark(<light>, <dark>)` where no token carries the right semantics. Never
  `:root`/`[data-theme]` color properties. Never emit `color-scheme: light dark`.
- Breakpoints are `max-width: 600px` and its mirror `min-width: 601px`. Do not
  introduce a third.
- Commit per task.

## What shipped, in order

### Wave 1 — Scaffold (2026-07-29 → 07-31, 14 tasks)

Angular 22 workspace at the repo root with Material, the dev proxy, and
`environment.apiBaseUrl = '/api'` (relative in both dev and a same-origin prod
deployment). Core DTO models; `ChallengeApiService` and `UserApiService`;
error-handling interceptor; app shell and route table; `status-badge`;
`challenge-list`; `challenge-form` (create/edit, TDD'd); `status-stepper`;
`problem-statement-panel`; `solution-options-panel`; `challenge-detail`;
Playwright config and the lifecycle e2e spec.

The per-step checkboxes were never ticked during execution and were left
unticked: the red-phase gates and per-task commits cannot be reconstructed
afterwards, so ticking them would record verification nobody observed. The
passing suite and the code were the record instead.

Three cross-repo assumptions were made before the backend existed and all three
were closed on 2026-07-31 against the real DTOs, via `docs/2026-07-31-gap-analysis.md`:

- `DraftProblemStatementResponse.text` → `problemStatement` (the draft flow was
  silently broken until this landed).
- The phantom `SolutionOption.challengeId` removed.
- `proxy.conf.json` retargeted from the placeholder port to `https://localhost:7261`.
  Enum casing and the select/status response bodies were already correct.

First green `npm run e2e` against a live API was observed the same day.

### Wave 2 — UX behavior (2026-08-03, 4 tasks, spans both repos)

- **API:** `GET /api/challenges` gained `?userId=` as an independent, combinable
  filter (`GetAllAsync(status, userId)`; existing callers pass `null`).
- `getChallenges()` was replaced by
  `challengesResource(filters: () => ChallengeFilters)`, an `httpResource` keyed
  on the status-filter and user signals. `ngOnInit`/`load()` disappeared from
  `challenge-list`; its template was untouched because `challenges()` and
  `loading()` kept their names.
- The header title became a `routerLink="/"` home link.
- `challenge-detail` gained the `currentPanel` computed and an `@switch`, plus the
  read-only problem-statement section and `loadFailed`.

The panel mapping is load-bearing: an earlier revision mapped
`ProblemStatementDrafted` to the problem-statement panel and the test encoded the
same error, so the suite went green on a permanently dead-ended workflow. Caught
by the whole-branch review. The manual verification list exists mainly to catch
that class of defect — walk a challenge from creation to In Review and confirm
each step's next action is actually reachable.

### Wave 3 — Styling & theme (2026-08-03, 4 tasks)

Ran **after** wave 2 and never concurrently with it: both edit
`app.component.{ts,html,scss,spec.ts}`.

M3 palettes generated from the brand seeds into
`src/app/styles/_theme-colors.scss`; `mat.theme()` switched to
`theme-type: color-scheme`; `mat.theme-overrides` pinning `surface`/`on-surface`
to exact brand hex; `color-scheme` moved from `body` to `html` (where the tokens
are emitted, and where `light-dark()` resolves). `ThemeService` + header toggle +
the pre-paint script in `index.html`. Every hardcoded component hex replaced with
a token, and the five status-badge variants converted to `light-dark()` pairs.
Layout: button no-wrap, mobile breakpoints for the stepper actions and the
user-picker. The `team-challenge-colors` skill was written here as the durable
reference.

Two verification gates worth reusing: the built CSS must contain **51**
`light-dark(` occurrences (zero means `theme-type: color-scheme` never took
effect), and one `light-dark(#ffffff, #070c14)` proving the exact-hex override
survived. The schematic invocation needs kebab-case flags and a **trailing slash**
on `--directory`, which the schematic concatenates with the filename.

### Wave 4 — Auth & roles (2026-08-04, 7 tasks)

Landed after the backend's auth work. `core/auth/` with `AuthService`,
`authGuard`, `adminGuard`, and `AuthUser`. `userIdInterceptor` replaced by
`credentialsInterceptor`; `provideAppInitializer` awaiting `loadCurrentUser()`;
401-on-non-`/auth/` redirecting to `/sign-in`; the 409 snackbar scoped away from
`/users/`. `sign-in` and `sign-up` components on unguarded routes, every other
route guarded. `UserContextService` and `features/user-picker/` deleted; the shell
switched to username + sign-out; `challenge-list` rescoped onto the session user.
Admin `user-management` view with role change and delete. Both e2e specs updated
to sign in, plus a new auth-flow spec. `CLAUDE.md` rewritten to match.

`clearCurrentUser()` was added after the initial implementation, from the
whole-branch review: the API revalidates every request, so a stale `currentUser`
after a 401 redirect let a deleted or demoted user's toolbar and guards keep
trusting state the server had already thrown away.

### Wave 5 — Challenge ownership (2026-08-05, 5 tasks, spans both repos)

- **API:** one private `DenyIfCannotEdit(challengeId)` on `ChallengesController`,
  called as the first two lines of `Update`, `AddOption`, `SelectOption`,
  `Delete`, `DeleteOption` — and deliberately not from `GetAll`, `GetById`,
  `Create`, either `draft-*`, or `UpdateStatus`. Existence before ownership: 404
  then 403. Carries a `ponytail:` note that it costs a second read, to be pushed
  into `IChallengeService` only if that ever shows up in a trace.
- **Frontend:** the 403 branch in `errorHandlingInterceptor` (snackbar, no
  redirect); `userId` omitted for admins so the override is reachable; `canEdit`
  in `challenge-detail` gating the edit link and the problem-statement panel; a
  `canEdit` `@Input` on `solution-options-panel`.
- Documented the rule in both repos' top-level docs.

Watch the signal-vs-input difference: the parent's `canEdit` is a computed and
reads as `canEdit()`; the panel's is a plain `@Input` and reads as `canEdit`.
Writing `canEdit()` in the panel template throws "canEdit is not a function" at
runtime.

### Wave 6 — AI draft failure messaging (2026-08-06, 4 tasks)

The API moved from template drafting to real Claude calls, so both draft
endpoints can now answer `503 { "error": "<message>" }`. One narrow exclusion —
`error.status >= 500 && !req.url.includes('/draft-')` — plus a `draftError`
signal and a `role="alert"` paragraph in each panel.

The paired test matters as much as the feature: the file had **no** coverage of
the ≥ 500 branch at all, so a test asserting that a 500 on a non-draft URL still
snackbars is what stops the exclusion silently disabling the whole branch.

Task 4 — driving a deliberately invalid API key through the real UI — is **not
done**; see the spec's deferred gaps.

### Wave 7 — Toolbar and list styling (2026-08-10, 3 tasks)

Username moved beside the theme toggle at 1.1rem in `var(--mat-sys-tertiary)`;
"Users" and "Sign out" became icon-only `mat-icon-button`s (`group`, `logout`)
keeping `aria-label` and `matTooltip`; list card titles to 1.1rem; header and grid
given tonal backgrounds.

Two invariants this wave established: the existing class names (`app-username`,
`app-sign-out`, `app-admin-link`, `app-theme-toggle`, `app-title`) are selected on
by `app.component.spec.ts` and must not be renamed, and the theme toggle must stay
outside the signed-in block — a test exercises it with no session. The icon-swap
test asserts `mat-icon`'s ligature text (`'group'`, `'logout'`), which is what is
actually in the DOM before the icon font paints and also proves the visible label
is gone.

### Wave 8 — Detail panel and list polish (2026-08-11, 5 tasks)

List header and grid retinted to `--mat-sys-secondary-container` so they read as
one panel; card title `padding-left: 16px` to align with `mat-card-content`;
`app-status-stepper` moved directly under the header row; the options panel
reordered so the accepted list precedes drafting, with the drafting block hidden
at `OptionSelected` and `Select` widened to also cover `OptionSelected` so the
owner can switch; the selected row given its `light-dark()` green treatment with
horizontal padding on **every** row so widths don't shift when the selection moves.

Two things that look like failures but aren't: the `Selected` marker's
`padding-left` is a *minimum* gap in a `space-between` flex row, so on a short
option nothing appears to change; and the stepper-ordering test asserts relative
indices, so later work inserting siblings between header and stepper does not
break it.

### Wave 9 — Navigation and icon polish (2026-08-11, 6 tasks)

List `max-width: 1100px` removed; header to `space-between` with the bare
`mat-select` capped at 50% on desktop; `STATUS_LABELS` exported from the model and
consumed by both `status-badge` and the filter; the toolbar stacked below 600px;
the `.app-back` bar added; the user-management delete and the option
select/selected controls converted to icons, with a `confirm()` guard added to
user delete because stripping the word "Delete" removed the last thing standing
between a mis-click and a removed user.

The `confirm()` guard broke six existing user-management tests at once — jsdom's
unstubbed `window.confirm` returns `false`. Fixed with one suite-wide
`vi.spyOn(window, 'confirm').mockReturnValue(true)` plus
`vi.restoreAllMocks()`, overridden in the two tests that decline, rather than
editing six tests.

### Wave 10 — Challenge delete & author attribution (2026-08-11, 5 tasks)

`deleteChallenge` on the service; a Delete button beside Edit Title inside the
existing `@if (canEdit())`; `onDelete` with the `confirm()` and the 404-also-
navigates branch; `Challenge.submittedByName`; `authorName` on the detail page and
`myId` on the list; a delete step appended to the lifecycle e2e spec as its
natural teardown, which leaves the dev database as it was found.

Making `submittedByName` required was the safety net: five spec files annotate
`const fakeChallenge: Challenge` and stopped compiling until each got the field.
`challenge-list.component.spec.ts` is the exception worth remembering — it builds
its challenge inline inside the untyped `flush()`, so it compiled unchanged and
had to be updated by hand; the new byline test is what caught it.

## Verification

```bash
npx ng test --watch=false     # 114 passing, 19 files
npm run build                 # succeeds
npm run e2e                   # 3 passing; needs the sibling API on the http profile
```

Browser pass, both themes:

- Desktop: full-width list; filter left at 50% with "New Challenge" right; spaced
  status labels in the filter; tinted header/grid behind neutral cards with the
  card title aligned to the badge; back bar on every page except the list; icon
  buttons for Users, sign out, user delete, and option select; the selected option
  row green and readable with a filled check that inherits its color.
- Below 600px: toolbar stacked with nothing clipped, single-column grid, filter at
  its intrinsic width, forms and panels single-column, stepper actions stacked.
- Dark mode: every Material surface flips — toolbar, cards, form fields, select
  dropdown. Any surface still light means `theme-type: color-scheme` isn't
  reaching it. Reload and confirm no flash of the wrong theme.
- Workflow: create → draft/accept a problem statement → confirm the view moves to
  the **solution-options** panel with a working Draft button and the accepted
  statement readable above it → accept an option → select → In Review → confirm
  the selected option is shown and only the stepper's Approve/Reject remain.
- Ownership: as a non-owner collaborator, a peer's challenge is read-only with a
  working stepper and a visible byline; as an admin, the list is unscoped and the
  controls are present.

## Not built, on purpose

The full list with reasoning is the spec's "Deferred / Accepted Gaps". In short:
the AI-draft failure path has never been driven against a real provider (needs a
live key, cannot be automated); there is no e2e test for the ownership rule (needs
two concurrent browser contexts); `challenge-form`'s server-error block still has
no `role="alert"`; the two draft panels' near-identical error handling stays
duplicated until a third draft panel exists; and the `/draft-` exclusion stays a
substring check.
