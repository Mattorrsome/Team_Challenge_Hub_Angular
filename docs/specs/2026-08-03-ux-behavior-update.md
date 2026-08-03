# Team Challenge Hub — UX/Behavior Update

**Date:** 2026-08-03
**Status:** Approved
**Base spec:** `2026-07-27-frontend-design.md`
**Companion specs:** `2026-08-03-styling-theme-update.md`,
`2026-08-03-auth-roles-frontend.md` (+ API-side
`../../../Team_Challenge_Hub_API/docs/specs/2026-08-03-auth-roles-backend.md`)

## Problem Statement

Four behavior gaps in the current build: the challenge-detail view shows
every step's panel at once instead of guiding the user through one step at a
time, there's no way to get back to the challenge list from the header, the
list shows every challenge regardless of who created it, and switching the
acting user doesn't refresh the list to reflect the new owner.

## Scope

In scope:
- Challenge-detail view renders only the panel for the challenge's current
  status
- App header title links back to the challenge list
- Challenge list scoped to the current user's own challenges
- List reloads when the acting user changes

Out of scope:
- Visual/theme changes (see styling spec)
- How "current user" is determined (see auth spec — this spec assumes
  whatever mechanism auth introduces exposes a `currentUser` signal that
  changes on sign-in/out)

## Design

### One step visible at a time

`ChallengeDetailComponent` gains a computed `currentPanel` derived from
`challenge().status`:

| Status | Panel shown |
|---|---|
| `Submitted` | `problem-statement-panel` |
| `ProblemStatementDrafted`, `OptionsDrafted`, `OptionSelected` | `solution-options-panel` |
| `InReview`, `Approved`, `Rejected` | none — the header status badge and the stepper's own transition buttons cover this stage |

**Why `ProblemStatementDrafted` shows the solution-options panel, not the
problem-statement panel.** `ProblemStatementDrafted` is the state in which the
user's next action is *adding solution options*, so it belongs to the
solution-options step. The API is explicit about this: `AddOptionAsync`
(`ChallengeService.cs:93-101`) accepts only `ProblemStatementDrafted` or
`OptionsDrafted`, and auto-transitions `ProblemStatementDrafted →
OptionsDrafted` when the first option is added. Since
`solution-options-panel` holds the app's only `addOption` caller, and the
stepper has no button for that hop, mapping `ProblemStatementDrafted` to the
problem-statement panel dead-ends the workflow — the challenge can never
reach `OptionsDrafted`. (An earlier revision of this spec had that wrong; the
final whole-branch review caught it, 2026-08-03.)

Because the accepted problem statement is no longer visible in an editable
panel once the flow moves on, `challenge-detail` renders it as read-only text
above the panel whenever it is set. Otherwise the user would be drafting
solutions to a problem they cannot read — the raw notes alone are not the
refined statement. Accepting the problem statement is therefore a one-way
step: it can be re-drafted only before acceptance.

`StatusStepperComponent` is unchanged — it still renders all steps as a
progress trail across the top of the page. Only the content panel beneath it
narrows to the single relevant one, via an `@switch` on `currentPanel` in
`challenge-detail.component.html`.

### Title → home navigation

The app shell's header title/logo gets a `routerLink="/"` (the challenge
list route), matching standard site-header conventions. No change to the
challenge-detail page's own title.

### Challenge list scoped to current user

`ChallengeListComponent`'s fetch adds a `userId` query param sourced from
whatever auth mechanism exposes the current user
(`GET /api/challenges?userId={currentUser.id}&status=`), instead of an
unfiltered global fetch. The list's fetch effect depends on the current-user
signal, so switching the signed-in user re-triggers the fetch automatically
— no manual refresh needed.

## Error Handling

No new error paths — inherits the existing HTTP interceptor's 400/409/5xx
handling from the base spec.

## Testing

- **Component test**: `challenge-detail.component.spec.ts` — asserts only
  the panel matching each status renders (parameterized over the 7 statuses).
- **Component test**: header component — clicking the title navigates to
  `/`.
- **Component test**: `challenge-list.component.spec.ts` — asserts the
  `userId` query param is sent and the list re-fetches when the current-user
  signal changes.

## Assumptions

- "Unique to user that created it" (from the original request) means list
  scoping, not a title-uniqueness constraint — confirmed during design
  discussion (2026-08-03).

## Open Questions

None — all decisions confirmed during design discussion (2026-08-03).
