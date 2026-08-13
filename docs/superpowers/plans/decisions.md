# Decision Log — Team Challenge Hub Angular

Append-only. Never edit or reorder an existing entry; add a new one that
supersedes it. Everything here was considered and rejected, or was true once and
is no longer. The current state is in `../../specs/2026-08-13-frontend-design.md`
and `2026-08-13-implementation-plan.md`.

Entries dated 2026-08-13 were harvested when the eleven per-feature specs and ten
per-feature plans were consolidated into those two documents; the date on each is
the date the decision was actually taken.

---

[2026-07-27] Rejected: a shared DTO package between the frontend and the API.
Reason: two repos at this scale don't justify a published contract package.
Superseded by: interfaces duplicated in `core/models/` and kept in step by hand
against the companion spec.

[2026-07-27, revised 2026-07-31] Rejected: Jasmine/Karma as the unit test runner.
Reason: `@angular/build:unit-test` with Vitest is the Angular 22 CLI default.
Superseded by: Vitest everywhere, including its matchers and the
no-`--include=` constraint.

[2026-07-29, closed 2026-07-31] Rejected: `DraftProblemStatementResponse { text: string }`.
Reason: recorded as an explicit unverified assumption before the backend existed;
the API sends `{ problemStatement }`, and the backend name is the better one — it
matches the field it populates, as `DraftSolutionOptionsResponse.Options` already
did. `response.text` was `undefined`, so the draft flow silently did nothing.
Superseded by: `DraftProblemStatementResponse { problemStatement: string }`.

[2026-07-29, closed 2026-07-31] Rejected: `SolutionOption.challengeId`.
Reason: the API's `SolutionOptionDto` never sends it, so the value was always
`undefined` while the type claimed otherwise.
Superseded by: the field removed from the model.

[2026-07-29, closed 2026-07-31] Rejected: `proxy.conf.json` targeting `https://localhost:5443`.
Reason: a placeholder written before the API was scaffolded; nothing listened
there, so every `/api/*` call in `ng serve` proxied to a dead port.
Superseded by: `https://localhost:7261`, with `http://localhost:5179` documented
as the fallback — and later, the `http` profile as a hard requirement for e2e.

[2026-07-29] Rejected: stub/placeholder components to force an early green build
while `app.routes.ts` referenced not-yet-written route targets.
Reason: throwaway code later tasks would have to delete, for a green build that
proves nothing.
Superseded by: an incremental plan that documents which build failures are
expected at which task.

[2026-07-31] Rejected: leaving the scaffold plan's per-step checkboxes ticked
retroactively after the work was found complete.
Reason: red-phase gates and per-task commits cannot be reconstructed after the
fact; ticking them would record verification nobody observed.
Superseded by: an explicit note that the passing suite and the code are the record.

[2026-08-03] Rejected: hand-rolled CSS custom properties on `:root`, flipped by a
`[data-theme="dark"]` attribute, as the dark-mode mechanism.
Reason: app-authored custom properties cannot restyle Angular Material
components, which read `--mat-sys-*` tokens emitted by `mat.theme()`. In a
Material-heavy app that would have left every Material surface light in "dark"
mode. Human partner ruling.
Superseded by: `theme-type: color-scheme` + CSS `light-dark()`, with the toggle
setting the `color-scheme` property on `<html>`.

[2026-08-03] Rejected: passing the raw brand hex values to `mat.theme()` as
`primary`/`tertiary`.
Reason: `mat.theme()` requires M3 palette maps — `_definition.scss` calls
`map.get`/`map.remove` on them and `validate-palette` rejects anything else.
Superseded by: palettes generated from the seeds by
`ng generate @angular/material:theme-color`, with `mat.theme-overrides` pinning
`surface`/`on-surface` to the exact brand hex so the background is exact while
the rest keeps M3's derived contrast. Human partner ruling.

[2026-08-03] Rejected: system-preference auto-detection for the theme
(`color-scheme: light dark`).
Reason: the app follows the user's explicit choice, per request.
Superseded by: `ThemeService` emitting exactly `light` or `dark`, with a test
asserting the value never contains a space.

[2026-08-03] Rejected: `BreakpointObserver` for the responsive work.
Reason: nothing here needs TypeScript to know the breakpoint — these are pure
layout reflows, and the base spec allowed either.
Superseded by: CSS `@media (max-width: 600px)`, matching what was already in the
codebase.

[2026-08-03] Rejected: `effect()`, and `toObservable` + `switchMap`, for the
reactive challenge-list fetch.
Reason: Angular discourages `effect()` for data fetching and it gives no request
cancellation — two rapid user switches can deliver out of order and leave the
wrong user's challenges on screen. Confirmed with the human partner.
Superseded by: `httpResource()` keyed on the filter signals, which supersedes any
in-flight request.

[2026-08-03] Rejected: keeping `ChallengeApiService.getChallenges()` alongside the
new resource factory.
Reason: it had exactly one caller, which the same task rewrote, so it would have
been dead code.
Superseded by: `challengesResource(filters)`.

[2026-08-03] Rejected: mapping `ProblemStatementDrafted` to the
problem-statement panel.
Reason: it permanently dead-ends the workflow. `AddOptionAsync` accepts only
`ProblemStatementDrafted` or `OptionsDrafted` and auto-transitions the former on
the first option; the app's only `addOption` caller is in `solution-options-panel`
and the stepper has no button for that hop, so the challenge could never reach
`OptionsDrafted`. The spec, the plan, and the test all encoded the same error, so
the suite went green on a broken journey — caught by the whole-branch review.
Superseded by: `ProblemStatementDrafted` → `solution-options`, with the accepted
problem statement rendered as read-only text above the panel.

[2026-08-03] Rejected: reading "unique to the user that created it" as a
title-uniqueness constraint.
Reason: clarified in design discussion to mean list scoping.
Superseded by: `?userId=` scoping on the list fetch.

[2026-08-03] Rejected: a hex value in a plan comment that tripped the
"no hardcoded colors" grep gate.
Reason: a hex in a comment cannot affect rendering, but it made the plan
contradict its own verification step.
Superseded by: the gate skipping `//` comment lines and `light-dark(` lines, both
deliberate exclusions.

[2026-08-04] Rejected: the self-reported `X-User-Id` header, `UserContextService`,
`userIdInterceptor`, and `features/user-picker/` — the whole no-auth identity model.
Reason: replaced by real credential auth against the API's cookie session.
Superseded by: `core/auth/` (`AuthService`, `authGuard`, `adminGuard`),
`credentialsInterceptor` setting `withCredentials: true`, and a
`provideAppInitializer` that resolves `/auth/me` before the first navigation. All
four were deleted, along with the list's `re-fetches for the new user when the
acting user switches` test — user switching went with the picker.

[2026-08-04] Rejected: manual bearer-token storage on the client.
Reason: the session is an HttpOnly signed cookie (backend spec's call), invisible
to JS.
Superseded by: `withCredentials: true` on every request; no token is handled in
application code.

[2026-08-04] Rejected: showing sign-in failures as a snackbar.
Reason: inconsistent with every other form in the app, which shows validation
errors inline.
Superseded by: an inline `serverError` on 401 with deliberately generic wording
(the API doesn't reveal whether the username exists), and a `server` error on the
username control for a taken username — with the generic error block filtering
`Username` out so the message isn't rendered twice.

[2026-08-04] Rejected: clearing only on `signOut()` after a 401 redirect.
Reason: the API revalidates the session on every request, so a stale
`currentUser` let a deleted or demoted user's toolbar and route guards keep
trusting state the server had already discarded. Whole-branch review finding.
Superseded by: `clearCurrentUser()`, called from the interceptor's 401 branch.

[2026-08-04] Rejected: navigating to `/sign-in` when `signOut()` fails.
Reason: the server session is still live, so the navigation would claim a
sign-out that didn't happen.
Superseded by: staying put and letting the interceptor's 5xx snackbar speak.

[2026-08-04] Rejected: a shared SCSS partial for the `.auth-form` block.
Reason: duplicating ~20 lines across two components beats introducing a partial
for two consumers.
Superseded by: `sign-up.component.scss` holding a copy of `sign-in`'s.

[2026-08-05] Rejected: gating `PUT /api/challenges/{id}/status` on ownership.
Reason: it would let an owner approve their own challenge, making the review step
a formality.
Superseded by: content writes owner-or-admin, the status workflow open to every
signed-in user, and `status-stepper` never gated on the client either.

[2026-08-05] Rejected: disabling owner-only controls with an explanatory tooltip.
Reason: disabled buttons are an accessibility trap on touch, and a read-only page
reads more clearly than five dead controls. Confirmed in design discussion.
Superseded by: hiding them behind `canEdit`.

[2026-08-05] Rejected: gating the two `draft-*` endpoints server-side.
Reason: they are read-only and write nothing; hiding the draft controls from a
non-owner is a UX decision, not an authorization one.
Superseded by: the endpoints staying open, with the controls hidden client-side
because drafting only exists to feed the gated save.

[2026-08-05] Rejected: redirecting on a 403.
Reason: that is 401's job; a redirect would bounce an admin off `/admin/users`
over one transient failure.
Superseded by: a snackbar with no navigation.

[2026-08-05] Rejected: collapsing 403 into 404 to avoid leaking that a challenge
id exists.
Reason: accepted at trusted-team scale; collapsing them would stop legitimate
users telling a dead link from a forbidden one.
Superseded by: existence checked before ownership — 404 then 403 — documented as
an accepted gap.

[2026-08-05] Rejected: pushing the ownership check into `IChallengeService` to
avoid a second read.
Reason: fine at this scale. Recorded as a `ponytail:` comment on
`DenyIfCannotEdit` with the upgrade path, to be taken only if the extra query
shows up in a trace.
Superseded by: the controller-level helper.

[2026-08-05] Rejected: "there is no Delete control to hide", and
"ownership indication on list cards" as out of scope.
Reason: both were true when written — `DELETE /api/challenges/{id}` had no UI and
`challenge-api.service.ts` had no method for it — and both were reversed on
2026-08-11.
Superseded by: a Delete button on the detail page under the same `canEdit`, and an
author byline on list cards and the detail page. The "yours" badge and owner
column stay out of scope.

[2026-08-06] Rejected: a new error-routing mechanism for draft failures.
Reason: the interceptor already had a pattern of narrow, commented exclusions
(`isAuthCall` on 401, `/users/` on 409).
Superseded by: one more condition, `&& !req.url.includes('/draft-')`, on the
≥ 500 branch.

[2026-08-06] Rejected: anchoring the `/draft-` exclusion to a regex.
Reason: only two endpoints contain it, path parameters are numeric ids, and no
user-supplied text ever enters a URL in this app (no search, no pagination).
More code for no behavioural change.
Superseded by: the substring check, with the residual risk recorded — a future
endpoint whose path contains `/draft-` would silently inherit the exclusion.

[2026-08-06] Rejected: retry buttons, backoff, or offline queueing for draft failures.
Reason: the existing generate button is the retry.
Superseded by: an inline `draftError` message beside that button.

[2026-08-06] Rejected: telling the user to write the content manually in the
draft-failure fallback message.
Reason: neither panel renders an editable field in the state a draft failure
leaves it in, so there is no manual path to point to.
Superseded by: "AI drafting is unavailable. Please try again."

[2026-08-06] Rejected: extracting the two draft panels' shared error handling.
Reason: about twelve near-identical lines whose differing parts (API method,
target signal, BEM class) are most of them; extraction needs either inheritance
for two leaves or a helper that saves one `??` while adding a file, an import, and
a spec. Doesn't pay at n=2.
Superseded by: deliberate duplication, with the trigger for revisiting recorded —
**a third draft panel**.

[2026-08-06] Rejected: narrowing the panels' `draftError` to only
AI-unavailable statuses.
Reason: it means branching on status inside the panel, duplicating routing the
interceptor owns; the reachable combinations are gated by `canEdit`, and the
breadth is a small win on the 400 path, where the API's "Challenge has no accepted
problem statement yet." now surfaces inline.
Superseded by: setting `draftError` on any failure, revisited only if one of the
bad combinations proves reachable.

[2026-08-06] Rejected: an always-rendered empty `role="alert"` container in both
draft panel templates.
Reason: current NVDA, JAWS, and VoiceOver all announce an inserted node that
already carries the role, so it works today; the robust pattern costs an
always-present empty element in both templates for a benefit no observed screen
reader needs.
Superseded by: the paragraph created with the role, inside its `@if`.

[2026-08-06] Rejected: deleting `problem-statement-panel`'s draft-preservation
test once its state was found unreachable through the UI.
Reason: it was strengthened for a good reason (the original asserted
`draftText() === ''` when `''` was already the initial value, so it could not
fail) and it is cheap insurance on the error branch.
Superseded by: keeping the test, with its comment noted as overstating scope. The
equivalent test in `solution-options-panel` **is** reachable and needs no caveat.

[2026-08-10] Rejected: per-user hashed username colors in the toolbar.
Reason: deferred in favour of one fixed accent.
Superseded by: `.app-username` in `var(--mat-sys-tertiary)`, the same in both themes.

[2026-08-10] Rejected: merging the theme toggle into the signed-in
`@if (auth.currentUser())` block while reordering the toolbar.
Reason: the toggle must work when signed out, and a test exercises it with no
session.
Superseded by: two separate `@if (auth.currentUser())` blocks with the toggle
between them.

[2026-08-10] Rejected: `--mat-sys-surface-container-low` / `--mat-sys-surface-container`
for the list header and grid.
Reason: too close to `mat-card`'s neutral surface to read as a panel behind the
cards, and the header and grid reading as two different things.
Superseded by (2026-08-11): both on `--mat-sys-secondary-container` with
`--mat-sys-on-secondary-container`, so they read as one tinted panel. The yellow
accent `#FFC72C` was rejected outright as a background, per the palette rule that
it is link/emphasis-only.

[2026-08-11] Rejected: `max-width: 1100px` on the challenge list.
Reason: the team asked for the full window width; the grid is already
`repeat(auto-fill, minmax(260px, 1fr))`, so wider viewports simply fit more cards.
Superseded by: no `max-width`. Recorded as the change most likely to draw a
follow-up opinion on a large monitor.

[2026-08-11] Rejected: `justify-content: flex-end` on the list header (filter and
action grouped at the right).
Reason: the filter belongs at the left edge.
Superseded by: `space-between`, with the bare `mat-select` capped at `width: 50%`
above 601px only.

[2026-08-11] Rejected: duplicating the status-label map so the list filter could
show spaced labels.
Reason: two copies would let a new status pick up two different spellings.
Superseded by: `STATUS_LABELS` exported once from `core/models/challenge.model.ts`
and consumed by both `status-badge` and the filter. `CSS_CLASSES` stayed local to
the badge — colours are not display text.

[2026-08-11] Rejected: a history `back()` for the back bar.
Reason: a plain `routerLink` is predictable, never walks the user out of the app
on a deep link, and needs no history bookkeeping.
Superseded by: `routerLink="/challenges"`, accepting that from
`/challenges/:id/edit` it returns to the list rather than the detail page.

[2026-08-11] Rejected: a shared `MatDialog` confirmation component for
destructive actions.
Reason: it would look better and be more accessible, but it means a new shared
component plus its own spec — disproportionate, and two confirmation idioms in one
app is worse than one.
Superseded by: a native `confirm()` in both `user-management` and
`challenge-detail`, naming the target.

[2026-08-11] Rejected: generalizing the review-time selected-option display to
"whenever the panel is none".
Reason: deliberately narrower — `Approved` and `Rejected` show nothing extra.
Superseded by: `@if (c.status === 'InReview')`.

[2026-08-11] Rejected: asserting the options panel's state by
`queryAll('button').length` at `OptionSelected`.
Reason: the count moves there for two independent reasons, so a count assertion
can't say which behaviour broke.
Superseded by: asserting on button text, then on `aria-label` once the text
became an icon — which is also what the tooltip and a screen reader read.

[2026-08-11] Rejected: `<strong>Selected</strong>` and a text "Select" button in
the options list.
Reason: replaced by icons that differ by glyph shape, not merely fill.
Superseded by: a filled `check_circle` (`role="img"`, `aria-label`,
`aria-hidden="false"`, tooltip) and an outlined `radio_button_unchecked` icon
button labelled with the option text. The `strong { padding-left }` rule was
retargeted to `.solution-options-panel__selected-icon`, spelled in full because
`&` inside `&__accepted` would resolve to the wrong class.

[2026-08-11] Rejected: a colour rule for the selected-option icon.
Reason: `__selected-row` already sets `color: light-dark(#0b5228, #9fd8b4)` and
`mat-icon` inherits it, so the check picks up the row's green for free while the
action icon keeps the default foreground.
Superseded by: no rule at all.

[2026-08-11] Rejected: `aria-label="Delete"` on the user-management delete icon.
Reason: a screen-reader user moving down the list could not tell rows apart.
Superseded by: `'Delete ' + user.username`. Likewise the option select button
labels itself `'Select option: ' + option.text`.

[2026-08-11] Rejected: editing six user-management tests individually after the
`confirm()` guard broke them.
Reason: jsdom's unstubbed `window.confirm` returns `false`, so all six that reach
the DELETE broke at once — six edits for one cause.
Superseded by: one suite-wide `vi.spyOn(window, 'confirm').mockReturnValue(true)`
plus `vi.restoreAllMocks()`, overridden in the two tests that decline.

[2026-08-11] Rejected: a Delete control on the challenge list cards.
Reason: the detail page is where a user has enough context to be sure, and a
delete control on a grid of cards invites the mis-click the confirmation exists to
prevent. Confirmed in design discussion.
Superseded by: Delete on the detail page only, beside Edit Title.

[2026-08-11] Rejected: a second computed for "can delete".
Reason: `canEdit` is already exactly the rule the feature needs
(`isAdmin || submittedByUserId === user.id`) and exactly what `DenyIfCannotEdit`
enforces server-side. A second copy could drift.
Superseded by: the Delete control reusing `canEdit`.

[2026-08-11] Rejected: an interceptor branch for the 404-on-delete case.
Reason: 401, 403, 409, and 5xx are already covered; the 404 is specific to one
component's flow.
Superseded by: handling it in `onDelete` — navigate to `/challenges` anyway,
because the challenge is gone, which is the end state the user asked for.

[2026-08-11] Rejected: an admin gate on the author byline.
Reason: it falls out of the ownership rule for free — a collaborator's list is
scoped to their own challenges, so no byline renders there; and an admin-gated
rule would have got the case of a collaborator opening a peer's challenge by URL
wrong.
Superseded by: one rule on both screens — show the author when the challenge is
not yours.

[2026-08-11] Rejected: resolving the author name client-side against
`GET /api/users`.
Reason: that endpoint is admin-only, so it cannot serve a collaborator viewing a
peer's challenge. Confirmed in design discussion.
Superseded by: `submittedByName` on every `ChallengeDto` — no second request, no
id→name map. It is the display name, never the login handle; the API deliberately
keeps `Username` off the DTO.

[2026-08-11] Rejected: making `Challenge.submittedByName` optional to avoid
breaking test fixtures.
Reason: the compile break was the point — five spec files annotate
`const fakeChallenge: Challenge` and could not silently omit the field.
Superseded by: a required field, with `challenge-list.component.spec.ts` noted as
the one file the compiler could not protect (it builds its challenge inline inside
the untyped `flush()`), caught by the new byline test instead.

[2026-08-13] Rejected: eleven per-feature specs and ten per-feature plans as the
working documentation set.
Reason: the set had accumulated cross-references, superseding notes, and
contradictions that a reader had to reconcile in date order — nine specs
described styling and layout rules that three later documents had already
reversed. Requested by the human partner.
Superseded by: `../../specs/2026-08-13-frontend-design.md`,
`2026-08-13-implementation-plan.md`, and this log. The originals were deleted;
they remain in git history.
