# Team Challenge Hub — Challenge Ownership (Frontend)

**Date:** 2026-08-05
**Status:** Approved
**Base specs:** `2026-07-27-frontend-design.md`, `2026-08-03-auth-roles-frontend.md`,
`2026-08-03-ux-behavior-update.md`
**Companion spec:**
`../../../Team_Challenge_Hub_API/docs/specs/2026-08-05-challenge-ownership-backend.md`
(API-side, source of truth for the ownership rule)

## Problem Statement

The challenge detail page offers Edit, Delete, and option controls to every
signed-in user, on every challenge. The API is gaining owner-or-admin
enforcement on those writes, so those controls are about to start failing for
non-owners — and a 403 currently produces no feedback at all, because
`errorHandlingInterceptor` has no 403 branch.

Separately, the admin's new override is unreachable through the UI: the
challenge list filters to `userId = currentUser.id` for everyone, so an admin
can only reach another user's challenge by typing a URL.

## Scope

In scope:
- Hiding owner-only controls on a challenge the current user cannot edit
- Unscoping the challenge list for admins
- A 403 branch in the HTTP error interceptor

Out of scope:
- Any change to the status stepper — advancing status stays available to every
  signed-in user, per the backend spec's Role Rules
- Ownership indication on list cards (no "yours" badge, no owner column)
- Transferring ownership
- An e2e test for the rule (see Testing)

## Design

### Who can edit

```
canEdit = auth.isAdmin() || challenge.submittedByUserId === auth.currentUser()?.id
```

Computed in `challenge-detail`, which already holds the loaded challenge.

### challenge-detail

- The Edit link and the Delete action render only when `canEdit` is true.
- `solution-options-panel` gains a `canEdit` input; its add, delete, and select
  controls render only when true.
- `problem-statement-panel`'s draft and "Accept & Save" controls are likewise
  owner-only. "Accept & Save" issues `PUT /api/challenges/{id}`, which the API
  now gates. The two `draft-*` endpoints themselves stay open server-side —
  they are read-only and write nothing — but drafting exists only to feed that
  gated save, so offering it to a non-owner would be a dead end. Hiding the
  draft control is a UX decision, not an authorization one, and the API
  deliberately does not gate it.
- `status-stepper` is untouched. Its buttons stay driven by what the API allows,
  exactly as `2026-07-27-frontend-design.md` requires.

A non-owner therefore sees a read-only challenge with a working status stepper.

### challenge-list

```
userId: auth.isAdmin() ? null : (auth.currentUser()?.id ?? null)
```

Admins see every challenge; collaborators keep seeing only their own, per
`2026-08-03-ux-behavior-update.md`'s scoping decision. This is what makes the
admin's edit override reachable rather than dead flexibility.

### errorHandlingInterceptor

A new 403 branch shows a snackbar: the user attempted something their role or
ownership does not permit. It must **not** redirect — that is 401's job, and
redirecting on 403 would bounce an admin off `/admin/users` on a transient
failure.

This also covers the admin user-management view's 403s, which were silent
before (a known gap from the auth work's final review).

## Error Handling

- **403 on a content write** → snackbar. Reaching this means the UI and the
  server disagreed about ownership, so the message is a backstop rather than
  the primary guard.
- **403 on `GET /api/users`** → the existing admin-view snackbar path, now with
  the interceptor's message behind it.
- 401, 409 and 5xx handling are unchanged.

## Testing

- **Component test** (`challenge-detail.component.spec.ts`): controls hidden for
  a non-owner collaborator; visible for the owner; visible for an admin viewing
  someone else's challenge.
- **Component test** (`challenge-list.component.spec.ts`): an admin's list
  request omits the `userId` param; a collaborator's still sends it.
- **Interceptor test** (`error-handling.interceptor.spec.ts`): a 403 opens a
  snackbar and does not navigate.
- **No e2e test.** Proving the rule end-to-end needs two concurrent browser
  contexts so user B can open user A's challenge — real harness work for a rule
  already covered at the component layer here and by integration tests on the
  API. Documented gap, not an oversight.

## Assumptions

- Hiding owner-only controls is preferred to disabling them with a tooltip:
  disabled buttons are an accessibility trap on touch, and a read-only page
  reads more clearly than five dead controls — confirmed during design
  discussion (2026-08-05).
- The client-side check is a UX affordance, not a security boundary. The API is
  the enforcement point; the UI only avoids offering actions that would fail —
  confirmed during design discussion (2026-08-05).

## Open Questions

None — all decisions confirmed during design discussion (2026-08-05).
