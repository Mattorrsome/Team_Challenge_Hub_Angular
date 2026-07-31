# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Scaffolded. Angular 22 app lives at repo root (`angular.json`, `package.json`,
`src/`), built per `docs/specs/2026-07-27-frontend-design.md` — that spec
remains the source of truth for architecture, conventions, and scope. This
file summarizes it; the spec has the details (exact routes, request/response
shapes, status flow).

Companion backend spec lives in a sibling repo:
`../Team_Challenge_Hub_API/docs/specs/2026-07-27-backend-design.md`.

## Setup / commands

Requires Node.js `^22.22.3 || ^24.15.0 || >=26.0.0` (Angular 22 requirement).

```
npm install
npm start           # ng serve
npm run build       # ng build
npm test            # ng test (Vitest, watch mode)
npm run e2e         # playwright test
```

Components are generated with the legacy suffix style (not the CLI's newer
suffix-less default):
```
ng generate component <path> --style=scss
```

The unit-test runner is **Vitest** (`@angular/build:unit-test`), not
Jasmine/Karma. Use `ng test --watch=false` (not `--include=...`) and Vitest
matchers (e.g. `.toBe(true)`, not Jasmine's `toBeTrue()`).

`proxy.conf.json` targets the sibling API's real Kestrel dev port,
`https://localhost:7261` (`http://localhost:5179` is the documented fallback if
the dev HTTPS certificate causes trouble). Task 14's Playwright e2e test
(`e2e/challenge-flow.spec.ts`) needs that backend running alongside `ng serve`
— start it with `dotnet run --project src/TeamChallengeHub.Api
--launch-profile https` in the sibling repo, then `npm run e2e`. Note it writes
to the API's dev SQLite database, so the challenges it creates persist there.

## Architecture

Standalone-component Angular app (no NgModules), feature-folder structure:

```
src/app/
  core/
    models/              # Challenge, SolutionOption, User, Status enum — mirrors API DTOs
    services/            # challenge-api.service.ts, user-api.service.ts
    user-context/         # current "acting as" user, persisted to localStorage
  features/
    challenge-list/
    challenge-form/       # shared create/edit form component
    challenge-detail/
      problem-statement-panel/
      solution-options-panel/
      status-stepper/
  shared/
    status-badge/
```

No shared library between this frontend and the backend repo — the DTO
contract is documented in both specs, not code-shared (scale doesn't justify it).

### Data flow

- No real auth. On load, a user picker (`GET /api/users`) selects an acting
  user, stored in `localStorage` and attached as `X-User-Id` on every request
  via an `HttpInterceptor`.
- Challenge status flow: `Submitted → ProblemStatementDrafted → OptionsDrafted
  → OptionSelected → InReview → Approved` (or `Rejected` from `InReview`).
- **AI draft endpoints are read-only on the server** — `draft-problem-statement`
  and `draft-solution-options` never write to the DB. The frontend always
  routes AI output through an editable field and an explicit "Accept & Save"
  action before any persisting call. Never wire an AI-draft response directly
  to a persistence call.
- The status stepper does not hardcode transition rules — it calls
  `PUT /api/challenges/{id}/status` and disables buttons based on what the API
  allows; the API is the source of truth and returns 409 on invalid
  transitions. Don't reimplement transition logic client-side.

## Coding conventions

- Component class files use the legacy `.component` suffix
  (`challenge-list.component.ts`), generated via `ng generate component
  --style=scss` — not the newer suffix-less schematic.
- Every component has separate `.component.ts` / `.component.html` /
  `.component.scss` files — no inline `template`/`styles`.
- One component per file/folder; folder name matches the component selector base.
- Services use `.service.ts`; models use `.model.ts` (or plain `.ts` under
  `models/`); route config uses `.routes.ts`.
- Standalone components declare explicit `selector`, `standalone: true`, and
  typed `@Input`/`@Output` — no implicit `any`.
- Otherwise follow Angular style guide defaults: one exported class per file,
  `OnPush` change detection where feasible, `inject()` for DI, strict
  TypeScript mode.

## Scope boundaries

Out of scope for this app: real authentication/authorization, real-time
multi-user collaboration, notifications/email, pagination (small demo
dataset — list loads all challenges at once). Don't build toward these.
