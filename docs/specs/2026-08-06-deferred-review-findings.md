# Deferred Review Findings — AI Draft Failure Messaging

**Date:** 2026-08-06
**Status:** Open — none of these are fixed
**Source:** task reviews and the whole-branch review of `0a1b57b..6222836`, during
execution of `../superpowers/plans/2026-08-06-ai-draft-error-messaging.md`
**Related:** `2026-08-06-ai-draft-error-handling-design.md`
**Companion:** `../../../Team_Challenge_Hub_API/docs/specs/backend-design.md`

Everything here was raised by a reviewer, judged real or arguable, and
deliberately **not** fixed on that branch. Items the reviews found and that
*were* fixed are absent — they live in the git history.

The execution ledger these were harvested from is git-ignored scratch, so this
document is the durable record. Nothing below blocks merge.

## 1. `challenge-form` shows server errors with no live region

**Severity:** Minor, and the clearest candidate to actually do
**Where:** `src/app/features/challenge-form/challenge-form.component.html:19`

That component renders a server-error block with no `role="alert"` and no
`aria-live`, so a screen-reader user gets no announcement when a create or
update fails. This is the same defect the two draft panels just fixed — those
paragraphs now carry `role="alert"` and are, per the whole-branch review, the
only accessible error surfaces in the app.

**Why it was deferred:** entirely outside the branch's scope, which was AI draft
failures. Fixing it there would have meant touching a component no task
mentioned.

**Fix sketch:** add `role="alert"` to that block. One attribute, mirroring what
the draft panels do. Worth checking `sign-in` and `sign-up` at the same time —
they use `var(--mat-sys-error)` for colour, but whether they announce was not
examined.

## 2. The panel fallback fires for every failure status, not only AI-unavailable

**Severity:** Minor, accepted
**Where:** the `error` handlers in `problem-statement-panel.component.ts` and
`solution-options-panel.component.ts`

The handler sets `draftError` on any failure, so:

- a **403** (non-owner) produces both the interceptor's "You don't have
  permission to do that." snackbar *and* the panel's "AI drafting is
  unavailable" — two messages, one of them false;
- a **404** (challenge deleted in another tab) says AI drafting is unavailable.

Both are hard to reach, because `canEdit` gates the buttons that trigger a
draft. The same breadth is a small *win* on the 400 path: the API returns
`{ error: "Challenge has no accepted problem statement yet." }`, and the panel
now surfaces that inline where previously nothing appeared.

**Why it stands:** narrowing it means branching on status inside the panel,
which duplicates routing logic the interceptor already owns. Revisit only if
one of these combinations turns out to be reachable in practice.

## 3. `role="alert"` is created with the element rather than pre-existing

**Severity:** Minor, accepted
**Where:** both panel templates — the paragraph is inside `@if (draftError())`

Inserting a node that already carries `role="alert"` is announced by current
NVDA, JAWS, and VoiceOver, so this works today. The more robust pattern is an
always-rendered empty container holding the role, whose text is filled
conditionally, because it removes any dependence on how a given screen reader
treats a newly-inserted live region.

**Why it stands:** changing it adds an always-present empty element to both
templates for a benefit no observed screen reader needs. Change it only if a
real screen-reader pass shows a missed announcement.

## 4. One preservation test guards a state unreachable through the UI

**Severity:** Minor, keep the test
**Where:** `problem-statement-panel.component.spec.ts` — the "shows the server
message when drafting fails" test

That test seeds `draftText` via `updateDraftText()`, then fails the request, then
asserts the text survived. It was strengthened for a good reason (the original
version asserted `draftText() === ''` when `''` was already the initial value, so
it could not fail) and it was proven to discriminate. But the state it seeds is
not reachable through the UI: the template renders the draft button only when
`!challenge.problemStatement && !draftText()`, so a user can never have text in
the field *and* a draft button to press.

It is still worth keeping as cheap insurance on the error branch. What overstates
its scope is the comment — "A failed draft must not overwrite what the user has
in the field" describes a user-facing guarantee the UI does not currently permit
you to reach.

The equivalent test in `solution-options-panel.component.spec.ts` **is**
reachable (the draft button renders regardless of `draftOptions()`), so it
guards real behaviour and needs no caveat.

## 5. Settled rulings, recorded so they are not re-litigated

**The two panels' duplicated error handling stays duplicated.** Roughly twelve
lines are near-identical across the two components, and the differing parts (API
method, target signal, BEM class) are most of them. An extraction would need
either inheritance for two leaves or a helper that saves a single `??`
expression while adding a file, an import, and a spec. Neither pays at n=2.
**Trigger for revisiting: a third draft panel.** With three real examples the
right shape will be evident instead of guessed.

**The interceptor's `/draft-` substring check stays a substring check.** Only two
endpoints contain it, path parameters are numeric ids, and no user-supplied text
ever enters a URL in this app (no search, no pagination — both out of scope per
`CLAUDE.md`). Anchoring it to a regex would be more code for no behavioural
change. **Residual risk, accepted:** a future endpoint whose path contains
`/draft-` would silently inherit the exclusion and lose its generic ≥ 500
snackbar. The comment at the exclusion states the intent for whoever adds one.

## 6. Outstanding, not a finding: the end-to-end check has not run

Task 4 of the plan — driving the real UI against the API with a deliberately
invalid key, confirming the inline message appears with no snackbar, then
swapping in a valid key and confirming Accept & Save still works — is **not
done**. It needs a running API and a real Anthropic key, so it cannot be
delegated to an automated agent.

The whole-branch review inspected the wire contract and found it consistent on
both sides (status 503, body `{ error: <curated string> }`), so this pass is
confirmation rather than discovery. Its unique value is catching something no
unit test can see: a proxy or dev-server layer stripping the response body,
which would leave the panel showing its generic fallback instead of the server's
specific message.
