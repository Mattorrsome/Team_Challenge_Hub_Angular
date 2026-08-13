# Team Challenge Hub — Auth & Roles (Frontend)

**Date:** 2026-08-03
**Status:** Approved
**Base spec:** `2026-07-27-frontend-design.md`
**Companion specs:** `2026-08-03-ux-behavior-update.md`,
`2026-08-03-styling-theme-update.md`,
`../../../Team_Challenge_Hub_API/docs/specs/backend-design.md`
(API-side, source of truth for auth mechanics)

## Problem Statement

The app currently has no real identity — a user picker lets anyone act as
any seeded user via a self-reported header. This replaces that with real
sign-up/sign-in, ties challenges to an authenticated identity, and
introduces collaborator/admin roles with admin-only user management.

## Scope

> **Extended by `2026-08-05-challenge-ownership-frontend.md`,** which hides
> owner-only controls on challenges the current user cannot edit, unscopes the
> challenge list for admins, and adds the 403 branch this spec's interceptor
> lacks.

In scope:
- Sign-up and sign-in forms (username + password)
- Replacing the user-picker/header-based identity with a real session
- Role-aware UI: admin-only user-management view
- Route guards for authenticated-only and admin-only routes

Out of scope:
- Password reset / email verification (documented gap, matches base spec's
  existing "no real auth" gap philosophy — this is real credential auth, but
  still minimal)
- Real authorization hardening beyond role checks (e.g. no rate limiting on
  sign-in — see backend spec's Security section)

## Design

### AuthService (replaces UserContextService)

```
core/auth/
  auth.service.ts       # signUp(), signIn(), signOut(), currentUser signal
  auth.guard.ts          # functional route guard — redirects to /sign-in if unauthenticated
  admin.guard.ts         # functional route guard — redirects if currentUser().role !== 'Admin'
  models/
    auth-user.model.ts   # { id, username, role: 'Collaborator' | 'Admin' }
```

- On app init, `AuthService` calls `GET /api/auth/me`; the auth cookie (if
  present) resolves it to the signed-in user, populating `currentUser`
  signal. A 401 leaves `currentUser` null.
- `signIn(username, password)` calls `POST /api/auth/signin`; success sets
  `currentUser` from the response body (server also sets the HttpOnly
  cookie, invisible to JS).
- `signOut()` calls `POST /api/auth/signout`, clears `currentUser`.
- `signUp(username, password)` calls `POST /api/auth/signup`, then signs in
  automatically on success (default role `Collaborator`).

### user-picker replaced by sign-in/sign-up

`features/user-picker/` is removed. New:

```
features/auth/
  sign-in/
    sign-in.component.{ts,html,scss}
  sign-up/
    sign-up.component.{ts,html,scss}
```

Reactive forms, same validation-error display pattern as `challenge-form`
(inline errors from 400 responses via the existing HTTP interceptor).

### Route guards

- `authGuard` applied to all routes except `/sign-in` and `/sign-up` —
  unauthenticated access redirects to `/sign-in`.
- `adminGuard` applied to the new admin route — non-admin access redirects
  to the challenge list (home).

### HTTP interceptor changes

The existing interceptor drops its `X-User-Id` header injection and instead
sets `withCredentials: true` on every request, so the auth cookie is sent
automatically. No manual token handling in application code.

### Admin: user management view

```
features/admin/
  user-management/
    user-management.component.{ts,html,scss}
```

- Lists all users (`GET /api/users`, admin-only) with username and role.
- Delete action per user (`DELETE /api/users/{id}`) — on 409 (user owns
  challenges), shows a snackbar explaining the block, per backend rules.
- Role change control per user (`PUT /api/users/{id}/role`) — dropdown
  between `Collaborator`/`Admin`.
- Linked from the header, visible only when `currentUser().role === 'Admin'`.

## Data Flow

1. Unauthenticated user hits any route → `authGuard` redirects to
   `/sign-in`.
2. Sign in → cookie set, `currentUser` populated → redirected to challenge
   list, now scoped to `currentUser.id` (per UX spec's list-scoping change).
3. Header shows current username, a sign-out action, and (if admin) a link
   to user management.
4. Sign out → cookie cleared server-side, `currentUser` set to null,
   redirected to `/sign-in`.

## Error Handling

- Sign-in failure (invalid credentials) → inline form error, not a snackbar
  (same pattern as other form validation).
- Sign-up failure (username taken) → inline field error on the username
  field.
- 401 on any API call (session expired/cookie cleared server-side) →
  interceptor redirects to `/sign-in` globally.

## Testing

- **Component test**: `sign-in.component.spec.ts` / `sign-up.component.spec.ts`
  — validates required fields, emits correct payload, surfaces inline errors.
- **Component test**: `auth.guard.spec.ts` / `admin.guard.spec.ts` — redirect
  behavior for unauthenticated/non-admin access.
- **E2E** (Playwright): sign up → redirected to list (empty, own challenges
  only) → create a challenge → sign out → sign back in → challenge still
  there scoped to that user.

## Assumptions

- Lightweight auth: username + password (no email), simple server-issued
  session — not full production-grade identity (no MFA, no password
  reset) — confirmed during design discussion (2026-08-03).
- Session mechanism is an HttpOnly signed cookie (backend spec's call),
  requiring `withCredentials: true` on the frontend rather than manual
  bearer-token storage.

## Open Questions

None — all decisions confirmed during design discussion (2026-08-03).
