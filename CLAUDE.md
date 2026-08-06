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
the dev HTTPS certificate causes trouble). The Playwright e2e tests
(`e2e/challenge-flow.spec.ts`, `e2e/auth-flow.spec.ts`) need that backend
running alongside `ng serve` — start it with `dotnet run --project
src/TeamChallengeHub.Api --launch-profile http` in the sibling repo, then `npm
run e2e`. It must be the `http` profile, not `https`: the `https` profile binds
both ports, so `UseHttpsRedirection()` 307s a proxied request on 5179 to the
HTTPS origin — cross-origin from the browser's view, which drops the
`SameSite=Lax` session cookie and fails every authenticated request. The
`http` profile binds only 5179, so there's no HTTPS port to redirect to and
requests stay same-origin. Note it writes to the API's dev SQLite database, so
the challenges and users it creates persist there.

## Architecture

Standalone-component Angular app (no NgModules), feature-folder structure:

```
src/app/
  core/
    models/              # Challenge, SolutionOption, User, Status enum — mirrors API DTOs
    services/            # challenge-api.service.ts, user-api.service.ts
    auth/                # auth.service.ts, auth.guard.ts, admin.guard.ts, models/auth-user.model.ts
  features/
    challenge-list/
    challenge-form/       # shared create/edit form component
    challenge-detail/
      problem-statement-panel/
      solution-options-panel/
      status-stepper/
    auth/
      sign-in/
      sign-up/
    admin/
      user-management/    # admin-only: list users, change role, delete
  shared/
    status-badge/
```

No shared library between this frontend and the backend repo — the DTO
contract is documented in both specs, not code-shared (scale doesn't justify it).

### Data flow

- Real credential auth. `AuthService` resolves the session via `GET
  /api/auth/me` in an app initializer before the first navigation; the session
  is an HttpOnly cookie, so `credentialsInterceptor` sets `withCredentials:
  true` on every request and no token is ever handled in application code.
  `authGuard` protects every route except `/sign-in` and `/sign-up`;
  `adminGuard` protects `/admin/users`. A 401 on any non-`/auth/` call
  redirects to `/sign-in`. Two roles: `Collaborator` (default) and `Admin` —
  only user management is role-gated.
- A challenge's content is owned, its workflow is shared. Only the owner
  (`submittedByUserId`) or an `Admin` may change a challenge's title, problem
  statement, or options — the API returns 403 otherwise, and
  `challenge-detail` hides those controls via its `canEdit` computed. Status
  transitions stay open to every signed-in user, so a challenge can be reviewed
  by someone other than its author. The challenge list is scoped to the signed-in
  user, except for admins, who see every challenge.
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

Out of scope for this app: password reset, email verification, MFA, and
sign-in rate limiting, real-time multi-user collaboration, notifications/email,
pagination (small demo dataset — list loads all challenges at once). Don't
build toward these.
