# Team Challenge Hub — Angular Frontend Design

**Date:** 2026-07-27
**Status:** Approved
**Companion spec:** `../../../Team_Challenge_Hub_API/docs/specs/2026-07-27-backend-design.md`

## Problem Statement

Team members need a way to submit delivery challenges, refine them into clear
problem statements with AI assistance, review AI-generated solution option
drafts, edit/accept them, and track a selected option through a review
workflow — all through a responsive web UI.

## Scope

In scope:
- Challenge list (responsive, filterable by status)
- Create / edit challenge form
- Challenge detail view with AI-draft-assisted problem statement and solution
  options, human review/edit before accept
- Status flow visualization and transition actions
- Simple user picker (no auth)

Out of scope:
- Real authentication/authorization
- Real-time collaboration (multi-user concurrent edit)
- Notifications/email

## Tech Stack

- **Angular 22** (latest, currently 22.0.8) — requires Node.js `^22.22.3 ||
  ^24.15.0 || >=26.0.0`; setup instructions must call out upgrading Node
  before scaffolding if the dev machine is on an older LTS
- Standalone components (no NgModules)
- Angular Material — component library for responsive, accessible UI
  primitives (list, cards, stepper, form fields, dialogs)
- Angular Router for view navigation
- `HttpClient` for API calls
- Reactive Forms for create/edit
- SCSS for styling (Angular CLI `--style=scss`)
- Vitest for component tests (`@angular/build:unit-test`, the Angular 22 CLI
  default — see `CLAUDE.md` for why this replaced the original Jasmine/Karma
  choice)
- Playwright for end-to-end tests

## Coding Conventions

- Component class file names use the legacy `.component` suffix (e.g.
  `challenge-list.component.ts`), generated via
  `ng generate component --style=scss` (schematics default,
  not the newer suffix-less style).
- Every component gets separate `.component.ts`, `.component.html`, and
  `.component.scss` files — no inline `template`/`styles`, so markup and
  styling stay reviewable and diffable on their own.
- One component per file/folder; folder name matches the component selector
  base (e.g. `challenge-list/challenge-list.component.ts`).
- Services use `.service.ts` suffix; models/interfaces plain `.model.ts` or
  `.ts` under `models/`; route config `.routes.ts`.
- Standalone components still declare an explicit `selector`, `standalone:
  true`, and typed `@Input`/`@Output` — no implicit `any`.
- Follow Angular style guide defaults otherwise: one exported class per
  file, OnPush change detection where feasible, `inject()` for DI in
  standalone components, strict TypeScript mode enabled in `tsconfig.json`.

## Architecture

Standalone-component Angular app, feature-folder structure:

```
src/app/
  core/
    models/                      # Challenge, SolutionOption, User, Status enum — mirrors API DTOs
    services/
      challenge-api.service.ts
      user-api.service.ts
    user-context/
      user-context.service.ts    # current "acting as" user, persisted to localStorage
  features/
    challenge-list/
      challenge-list.component.ts
      challenge-list.component.html
      challenge-list.component.scss
    challenge-form/               # shared create/edit form component
      challenge-form.component.ts
      challenge-form.component.html
      challenge-form.component.scss
    challenge-detail/
      challenge-detail.component.{ts,html,scss}
      problem-statement-panel/
        problem-statement-panel.component.{ts,html,scss}
      solution-options-panel/
        solution-options-panel.component.{ts,html,scss}
      status-stepper/
        status-stepper.component.{ts,html,scss}
  shared/
    status-badge/
      status-badge.component.{ts,html,scss}
```

No shared library between frontend and backend — contract is documented in
both specs as DTO shapes. Scale doesn't justify a shared package.

## Data Flow

1. On load, frontend fetches seeded user list (`GET /api/users`), shows a
   picker; selection stored in `localStorage` and attached as `X-User-Id`
   header on every subsequent API call via an `HttpInterceptor`.
2. Challenge list fetches `GET /api/challenges` (optional status filter query
   param), renders responsive cards/table with a status badge per challenge.
3. Create form posts `POST /api/challenges` (title, raw notes, submitter is
   implicit from the `X-User-Id` header) → new challenge status `Submitted`.
4. Detail view, "Draft problem statement" button calls
   `POST /api/challenges/{id}/draft-problem-statement` — response is AI draft
   text, shown in an **editable textarea**, NOT yet saved. User edits freely,
   then clicks "Accept & Save" → `PUT /api/challenges/{id}` persists the
   final text and advances status to `ProblemStatementDrafted`.
5. Same draft → edit → accept pattern for solution options
   (`POST /api/challenges/{id}/draft-solution-options` returns 2-3 draft
   option texts; user edits/accepts each into
   `POST /api/challenges/{id}/options`).
6. User selects one accepted option
   (`PUT /api/challenges/{id}/options/{optionId}/select`) → status
   `OptionSelected`.
7. Status stepper component exposes only the valid next transitions per the
   backend's transition rules (`InReview`, `Approved`, `Rejected`) via
   `PUT /api/challenges/{id}/status`; frontend does not hardcode transition
   logic beyond disabling invalid buttons — the API is the source of truth
   and returns 409 on an invalid transition attempt.

## Status Flow (shared contract with backend)

```
Submitted → ProblemStatementDrafted → OptionsDrafted → OptionSelected → InReview → Approved
                                                                                  ↘ Rejected
```

## Human Review Gate (AI content)

Every AI-draft endpoint is read-only on the server (no DB write). The
frontend always routes AI output through an editable form field and an
explicit "Accept & Save" action before any persistence call is made. There is
no code path where AI-generated text reaches the database without a human
clicking accept.

## Error Handling

- HTTP interceptor surfaces API validation errors (400) as inline form
  errors; 409 (invalid status transition) as a snackbar; 5xx as a generic
  retry-able snackbar.
- Loading and empty states for list/detail views.

## Responsive Design

- Angular Material's `BreakpointObserver` (or CSS grid + flex) to switch
  challenge list between a multi-column card grid (desktop) and single-column
  stacked cards (mobile).
- Forms and detail panels reflow to single-column under ~600px.

## Testing

- **Component test** (Jasmine/Karma + `TestBed`): `challenge-form` component
  — validates required fields, emits correct payload on submit.
- **E2E** (Playwright): create challenge → draft problem statement → edit →
  accept → verify it appears in the list with status
  `ProblemStatementDrafted`. Runs against the real backend + SQLite test DB.

## Assumptions

- Single browser tab per user session; no optimistic-concurrency conflict UI
  needed for this scope.
- User picker list is seeded server-side; frontend does not create users.
- No pagination needed at this scale (small demo dataset) — list loads all
  challenges at once.

## Open Questions

None — all decisions confirmed during design discussion (2026-07-27).
