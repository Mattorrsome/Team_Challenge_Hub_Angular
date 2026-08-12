# Team Challenge Hub — Challenge Delete & Author Attribution (Frontend)

**Date:** 2026-08-11
**Status:** Approved
**Base specs:** `2026-07-27-frontend-design.md`, `2026-08-03-ux-behavior-update.md`,
`2026-08-05-challenge-ownership-frontend.md`
**Companion spec:**
`../../../Team_Challenge_Hub_API/docs/specs/2026-08-11-challenge-author-attribution-backend.md`
(API-side, source of truth for the `submittedByName` field)

This spec **supersedes** two statements in
`2026-08-05-challenge-ownership-frontend.md`:

- the design note that "there is no Delete control to hide" because
  `DELETE /api/challenges/{id}` "has no UI at all today" — this spec builds that
  UI, under the same ownership rule the API already enforces
- the out-of-scope line excluding "ownership indication on list cards" — an
  author byline is now in scope. The "yours" badge and owner column it also
  excluded stay out of scope.

## Problem Statement

Two gaps, both on the read side of work the API already finished.

**No way to delete a challenge.** `DELETE /api/challenges/{id}` has been
implemented, authorized owner-or-admin, and integration-tested since
`2026-08-05` — but `challenge-api.service.ts` has no method for it and no
component offers the action. A user who submits a challenge by mistake cannot
remove it.

**No way to tell whose challenge you are looking at.** Admins see an unscoped
challenge list (`2026-08-05`) where every card is a bare title, with nothing
distinguishing their own challenges from four other people's. The detail page
has the same gap.

## Scope

In scope:
- A Delete control on the challenge detail page, gated by the existing `canEdit`
- `deleteChallenge` on `ChallengeApiService`
- An author byline on list cards and on the detail page, shown only when the
  challenge is not the viewer's own
- `submittedByName` on the `Challenge` model, mirroring the API's new field

Out of scope:
- Delete from the challenge **list** cards — the detail page is where a user has
  enough context to be sure, and a delete control on a grid of cards invites the
  mis-click the confirmation exists to prevent
- Any "yours" badge, owner column, author filter, or author sort
- Deleting solution options — `DELETE /api/challenges/{id}/options/{optionId}`
  still has no UI, unchanged by this spec
- Undo, soft delete, or a trash view. The API deletes immediately and cascades
  the challenge's options; there is nothing to restore from
- Any client-side authorization logic beyond the existing `canEdit` affordance

## Design

### Delete

**Service.** One method on `ChallengeApiService`, matching the file's existing
shape:

```ts
deleteChallenge(id: number): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/${id}`);
}
```

**Authorization.** `challenge-detail`'s existing `canEdit` computed is already
`auth.isAdmin() || challenge.submittedByUserId === user.id` — exactly the rule
this feature needs ("collaborators delete their own, admins delete any"), and
exactly what `DenyIfCannotEdit` enforces server-side. The Delete control reuses
it. No second computed, no second copy of the rule to drift.

**Template.** Inside the existing `@if (canEdit())` block, beside Edit Title:

```html
@if (canEdit()) {
  <a mat-button [routerLink]="['/challenges', c.id, 'edit']">Edit Title</a>
  <button mat-button color="warn" (click)="onDelete(c)">Delete</button>
}
```

**Confirmation.** A native `confirm()`, matching `user-management.component.ts`.
That component reached for the same thing for the same reason: the API deletes
immediately, there is no undo, and the confirm is the only thing between a
mis-click and a removed row. A `MatDialog` here would mean two confirmation
idioms in one app for one dialog's worth of polish.

**On success.** Navigate to `/challenges`. The list shows fresh data without any
explicit invalidation: routing there constructs a new `ChallengeListComponent`,
whose `challengesResource` is a field initializer and therefore issues a fresh
request. The deleted challenge is simply absent from it.

### Author byline

One rule, both screens: **show the author when the challenge is not yours.**

```ts
// challenge-detail.component.ts
readonly authorName = computed(() => {
  const challenge = this.challenge();
  const user = this.auth.currentUser();
  if (challenge === null || user === null || challenge.submittedByUserId === user.id) {
    return null;
  }
  return challenge.submittedByName;
});
```

`challenge-list` renders many challenges rather than one, so it exposes the
viewer's id once and compares per card in the template:

```ts
// challenge-list.component.ts
readonly myId = computed(() => this.auth.currentUser()?.id ?? null);
```

A `null` id (no session) never equals a `submittedByUserId`, so the byline would
render — unreachable in practice, since `authGuard` protects the route.

There is deliberately **no admin gate**. It falls out of the ownership rule for
free: a collaborator's list is scoped to `userId = currentUser.id`
(`2026-08-05`), so every card is their own and the byline never renders. An
admin's unscoped list shows a byline on everyone else's cards and none on their
own. A collaborator who reaches a peer's challenge by URL — which the shared
status workflow permits — sees the byline too, which is the case an admin-gated
rule would have got wrong.

The name comes from `challenge.submittedByName`, which the API now supplies on
every `ChallengeDto`. No second request, no id→name map, no client-side lookup.

**List placement** — `mat-card-subtitle` is Material's own slot directly beneath
the title, so this needs no new styling and `MatCardModule` is already imported:

```html
<mat-card-title class="challenge-list__card-title">{{ challenge.title }}</mat-card-title>
@if (challenge.submittedByUserId !== myId()) {
  <mat-card-subtitle>{{ challenge.submittedByName }}</mat-card-subtitle>
}
```

**Detail placement** — a byline sibling immediately after the `__header` row, so
it sits under the title rather than competing with the status badge and buttons
inside that flex row. `.challenge-detail` is a flex column with a `1rem` gap, so
the element positions itself; the new `&__author` block only sets
`margin: 0` and `color: var(--mat-sys-on-surface-variant)`, matching
`&__raw-notes`.

### Model

`Challenge` gains `submittedByName: string`, mirroring the API DTO. Per
`2026-07-27-frontend-design.md` there is no shared contract package — the
interface is kept in step with the companion spec by hand.

Because the field is required and TypeScript runs in strict mode, every test
fixture **annotated** as a `Challenge` stops compiling until it is added. Five
spec files declare one, each as a single `const fakeChallenge: Challenge`:
`challenge-detail`, `challenge-form`, `problem-statement-panel`,
`solution-options-panel`, and `status-stepper`. Each is a one-line addition.

`challenge-list.component.spec.ts` is the exception worth knowing about: it
builds its challenge inline as an argument to `flush()`, which is untyped, so it
compiles unchanged and would silently feed the component an object with no
`submittedByName`. It still needs the field, but the compiler will not ask for
it — the new byline test is what catches it.

## Error Handling

`errorHandlingInterceptor` already covers 401 (clear session, redirect), 403
(snackbar), 409, and 5xx. The delete path adds handling for the one case it does
not cover:

- **404 on delete** → navigate to `/challenges` anyway. The challenge is gone,
  which is the end state the user asked for; reporting a failure for an action
  that achieved its goal would be wrong. Reachable when someone else deleted the
  same challenge first.
- **403 on delete** → the interceptor's existing snackbar. Reaching it means the
  UI and server disagreed about ownership, so it is a backstop, not the guard.
- **401 / 5xx** → unchanged, interceptor-handled.
- A cancelled `confirm()` issues no request at all.

No new interceptor branch. No component-level snackbar — `challenge-detail` has
no `MatSnackBar` today and this change does not give it one.

## Testing

- **`challenge-api.service.spec.ts`** — `deleteChallenge` issues
  `DELETE` to `/api/challenges/{id}`.
- **`challenge-detail.component.spec.ts`**
  - Delete button rendered when `canEdit` is true (owner, and admin on someone
    else's challenge); absent for a non-owner collaborator
  - a cancelled `confirm()` issues no HTTP request
  - a successful delete navigates to `/challenges`
  - a 404 also navigates to `/challenges`
  - the author byline renders on another user's challenge and not on the
    viewer's own
- **`challenge-list.component.spec.ts`** — `mat-card-subtitle` renders on
  another user's card and not on the viewer's own.
- **`e2e/challenge-flow.spec.ts`** — one delete step appended to the end of the
  existing lifecycle flow. It is the natural teardown for a spec that already
  creates a challenge and drives it through the workflow, so it costs one block
  rather than a new file, and it exercises the confirm dialog and the redirect
  against the real API.

## Security & Privacy

- `canEdit` remains a UX affordance, not a security boundary — the API's
  `DenyIfCannotEdit` is the enforcement point, and it was already in place and
  tested before this UI existed. Hiding the button only avoids offering an
  action that would 403.
- The byline shows a display name, never a login handle. The API deliberately
  does not put `Username` on `ChallengeDto`; see the companion spec.
- Deletion is unrecoverable and cascades the challenge's solution options. The
  `confirm()` is the sole guard, which is why it is required rather than
  optional.

## Assumptions

- The display name (`Name` → `submittedByName`), not the login handle, is what
  the byline shows — confirmed during design discussion (2026-08-11).
- The author name is sourced from the challenge response rather than resolved
  client-side against `GET /api/users`, because that endpoint is admin-only and
  cannot serve a collaborator viewing a peer's challenge — confirmed during
  design discussion (2026-08-11).
- Delete belongs on the detail page only, beside Edit Title — confirmed during
  design discussion (2026-08-11).
- `confirm()` is sufficient confirmation for a destructive action, consistent
  with the existing user-management delete — confirmed during design discussion
  (2026-08-11).

## Open Questions

None — all decisions confirmed during design discussion (2026-08-11).
