# Gap Analysis — Team Challenge Hub Angular

Date: 2026-07-31
Sources: `docs/specs/2026-07-27-frontend-design.md`, `docs/superpowers/plans/2026-07-29-angular-frontend-scaffold.md`
Method: spec + plan read in full, cross-checked against `src/app`, `e2e/`, and the now-existing sibling backend at `../Team_Challenge_Hub_API`.

## Summary

Most of the spec is implemented. Two defects (F1, F2) each independently break the app against the real backend — both are consequences of the plan's "Post-Plan Follow-Up" section never being executed after the backend landed. Fix those first; everything else is polish.

> **Update 2026-07-31 — all findings closed.** F1 through F5 fixed, F6/F7 recorded, F8 unblocked and verified. `ng test --watch=false` passes **18/18** across 12 files (was 15), and `npm run e2e` passes **1/1** against a live backend — the first time that suite has been observed green.

---

## Findings

### F1 — Draft problem statement never populates the textarea (Critical) — RESOLVED 2026-07-31

`DraftProblemStatementResponse` is declared as `{ text: string }` in `src/app/core/models/challenge.model.ts:34`, and `problem-statement-panel.component.ts:51` reads `response.text`.

The backend returns `DraftProblemStatementResponse(string ProblemStatement)` (`../Team_Challenge_Hub_API/src/TeamChallengeHub.Api/DTOs/ChallengeDtos.cs:31`), which serializes as `{ "problemStatement": "..." }`. `response.text` is `undefined`.

Effect: clicking **Draft Problem Statement** sets the textarea to empty, silently. The core draft→edit→accept flow does not work, and the E2E assertion `await expect(textarea).not.toHaveValue('')` (`e2e/challenge-flow.spec.ts:18`) fails.

The backend name is the correct one — it matches the field it populates, and `DraftSolutionOptionsResponse.Options` already follows that convention (`draftSolutionOptions` works today for exactly that reason). Fix on this side.

Root cause: the plan recorded `{ text: string }` as an explicit unverified assumption (`plans/2026-07-29-angular-frontend-scaffold.md:33`) and scheduled a follow-up to confirm it once the backend existed (`:1888`). The backend exists; the follow-up never ran.

### F2 — Dev proxy points at a port nothing listens on (Critical) — RESOLVED 2026-07-31

`proxy.conf.json` targets `https://localhost:5443`, the placeholder the plan told us to replace.

The backend's actual dev URLs are `https://localhost:7261` and `http://localhost:5179` (`../Team_Challenge_Hub_API/src/TeamChallengeHub.Api/Properties/launchSettings.json:27`).

Effect: under `ng serve`, every `/api/*` call proxies to a dead port. Nothing in the app loads. Same unexecuted follow-up as F1.

### F3 — `SolutionOption.challengeId` does not exist on the wire (Minor, latent) — RESOLVED 2026-07-31

`src/app/core/models/solution-option.model.ts:3` declares `challengeId: number` as required. The backend `SolutionOptionDto(int Id, string Text, bool IsSelected, DateTime CreatedAt)` never sends it, so the value is always `undefined` at runtime despite the type claiming otherwise.

Harmless today — no template or service reads it. Options only ever arrive nested inside a parent `ChallengeDto`, so the parent id is always in scope and the field is redundant. Delete it rather than asking the backend to add it.

### F4 — Detail view spins forever when the load fails (Medium) — RESOLVED 2026-07-31

`challenge-detail.component.ts:36` subscribes to `getChallenge(id)` with a `next` handler only:

```ts
this.challengeApi.getChallenge(id).subscribe((challenge) => this.challenge.set(challenge));
```

On a 404 or network failure, `challenge()` stays `null`, so `challenge-detail.component.html:19` renders `<mat-spinner>` indefinitely with no message and no way out. A bad URL — `/challenges/9999` — is a dead page.

The spec requires "loading and empty states for list/detail views" (`docs/specs/2026-07-27-frontend-design.md:148`). `challenge-list` satisfies this (`challenge-list.component.html:16-19`); detail does not.

Note the error interceptor does not cover this: it surfaces a snackbar for 5xx but leaves the component's own spinner state untouched.

### F5 — Status stepper is a static legend, not a progress indicator (Medium) — RESOLVED 2026-07-31

`status-stepper.component.html:3-5` renders every entry of `STEP_ORDER` with identical `<app-status-badge [status]="step" />` markup, unconditioned on `challenge.status`. It looks the same for a `Submitted` challenge and an `Approved` one.

The spec asks for "status flow visualization" (`docs/specs/2026-07-27-frontend-design.md:21`). Only the header badge (`challenge-detail.component.html:5`) conveys the real status. The transition buttons in the same component are correct and correctly gated — the defect is purely the step display.

### F6 — Test runner deviates from spec (Accepted deviation, no action) — SPEC AMENDED 2026-07-31

Spec names "Jasmine/Karma for component tests (Angular CLI default)" (`docs/specs/2026-07-27-frontend-design.md:41`). Actual is Vitest (`package.json`, `vitest ^4.0.8`), with matchers rewritten accordingly (`challenge-form.component.spec.ts:48` uses `.toBe(true)` not `toBeTrue()`).

`CLAUDE.md` documents this as forced by the Angular 22 CLI default. Deliberate and recorded — logged only so the spec line item is not mistaken for an oversight. Recommend amending the spec to match reality.

### F7 — Plan checkboxes never updated (Process) — RESOLVED 2026-07-31

All 14 tasks in `docs/superpowers/plans/2026-07-29-angular-frontend-scaffold.md` remain `- [ ]`, though the code and tests exist. The plan therefore carries no record of which verification gates actually ran — notably Task 9's "run test to verify it fails, then passes" and Task 13's full-build check.

### F8 — E2E suite has never passed against a real backend (Blocked by F1 + F2) — RESOLVED 2026-07-31

The plan expected `npm run e2e` to fail only because the backend did not exist. The backend now exists, but F1 and F2 mean the suite still fails — for different, real reasons. The follow-up step "run `npm run e2e` for real and confirm Task 14's test passes" is outstanding, and until F1/F2 land, a failing E2E run tells us nothing new.

---

## Tasks

Ordered. T1 and T2 are independent of each other; both must land before T8 is meaningful.

**All tasks completed 2026-07-31.**

### T1 — Fix the draft-problem-statement field name

- [x] `src/app/core/models/challenge.model.ts:34` — rename the interface field:
      ```ts
      export interface DraftProblemStatementResponse {
        problemStatement: string;
      }
      ```
- [x] `src/app/features/challenge-detail/problem-statement-panel/problem-statement-panel.component.ts:51` — `this.draftText.set(response.problemStatement)`.
- [x] Grep for any other `\.text` read on a draft response before calling this done. One other `.text` hit exists — `solution-options-panel.component.html:29`'s `option.text` — which is a real `SolutionOption` field, not a draft response. No further changes.
- [x] Verify against the running backend, not just a unit test. Confirmed twice: `POST /api/challenges/{id}/draft-problem-statement` against a live instance returns `{"problemStatement":"Problem: ...\nImpact: ...\nContext: ..."}`, and the E2E assertion `expect(textarea).not.toHaveValue('')` now passes in a real browser against a real API.

### T2 — Point the dev proxy at the real backend port

- [x] `proxy.conf.json` — set `target` to `https://localhost:7261`. `"secure": false` kept for the dev self-signed certificate.
- [x] Confirm `ng serve` loads against a running API — verified by the E2E run, which drives `ng serve` through the proxy end to end.
- [x] The `http://localhost:5179` fallback was not needed; `"secure": false` handled the dev certificate. Fallback noted in `CLAUDE.md` anyway.

### T3 — Drop the phantom `challengeId` field

- [x] Removed `challengeId: number` from `src/app/core/models/solution-option.model.ts:3`.
- [x] `npx tsc --noEmit` clean — nothing referenced it.

### T4 — Add an error state to the challenge detail view

- [x] `challenge-detail.component.ts` — `error` handler added, setting a `loadFailed` signal.
- [x] `challenge-detail.component.html` — the `@else` now branches on `loadFailed()`: "Challenge not found." plus a **Back to challenges** button, instead of an endless spinner.
- [x] 404 covered by a new test in `challenge-detail.component.spec.ts` asserting `challenge()` stays null and `loadFailed()` flips true. The existing spec flushed its one request inside `beforeEach`, so that flush moved into a per-test `expectLoadRequest()` helper to let each test choose the response.

### T5 — Make the stepper reflect actual progress

- [x] `steps` is now a `computed()` deriving `done` / `current` / `upcoming` per step from `STEP_ORDER.indexOf(challenge.status)`.
- [x] Each step is wrapped in a `status-stepper__step--{state}` span; the wrapper carries the progress styling (dimmed for done/upcoming, outlined and bold for current) since `app-status-badge` keys only off the status name.
- [x] `Rejected` falls out correctly for free: `indexOf` returns -1, so no step reads as current and the separate Rejected badge carries the state. Covered by a test.
- [x] Transition buttons untouched.

### T6 — Reconcile the spec's test-runner line

- [x] `docs/specs/2026-07-27-frontend-design.md` now names Vitest (`@angular/build:unit-test`) and points at the `CLAUDE.md` rationale.

### T7 — Update plan tracking

- [x] Added a status header to `docs/superpowers/plans/2026-07-29-angular-frontend-scaffold.md` recording 14/14 tasks done and 18/18 tests passing, and struck through all three Post-Plan Follow-Up items with what closed them. The per-step boxes are deliberately left unticked: the red-phase gates ("run test to verify it fails") and per-task commits cannot be reconstructed after the fact, so ticking them would record verification nobody observed — exactly the F7 problem in a new form. The header states this outright.

### T8 — Run the E2E suite for real (after T1 and T2)

- [x] Backend started (`dotnet run --launch-profile https`, `:7261`), then `npm run e2e`.
- [x] **Result: `1 passed (26.3s)`.** First observed green run against a live API — new information, not a confirmation. It exercises the full create → draft → edit → accept → list flow in Chromium, which is the path F1 broke. Note it writes to the API's dev SQLite database, so the challenge it creates persists there.

---

## Not gaps

Verified present and matching the spec — listed so future reviews skip re-checking:

- User picker and `X-User-Id` interceptor.
- Error interceptor: 409 and 5xx snackbars, 400 passed through to forms.
- Challenge list with status filter and responsive grid, including loading and empty states.
- Create/edit form with required-field validation and server-error surfacing.
- Problem-statement and solution-options panels with correct draft→edit→accept gating — the AI draft is never persisted without an explicit accept.
- `problem-statement-panel.component.ts:24` correctly stops re-seeding the textarea once the user has typed, so a sibling panel's refresh cannot discard an in-progress edit.
- Option selection, and status transition buttons gated to `OptionSelected` / `InReview`.
- `draftSolutionOptions` — the `options` field name happens to match the backend, which is why this path works while F1 does not.
