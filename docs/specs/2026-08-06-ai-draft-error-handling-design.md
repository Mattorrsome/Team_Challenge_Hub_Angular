# AI Draft Failure Messaging — Design

**Date:** 2026-08-06
**Status:** Approved
**Companion backend spec:**
`../../../Team_Challenge_Hub_API/docs/specs/2026-08-06-claude-ai-drafting-design.md`
**Parent spec:** `2026-07-27-frontend-design.md`

## Problem Statement

The backend is replacing its template drafting service with real Claude API
calls. A real provider can be unavailable, rate-limited, or can decline the
content, so the two draft endpoints will start returning
`503 { "error": "<message>" }`.

Today any status ≥ 500 hits one branch in `error-handling.interceptor.ts:34`
and produces a generic "Something went wrong. Please try again." snackbar,
while both panels swallow the error and only reset their spinner. The result
reads as "the app broke" and gives no hint that the user can simply write the
statement themselves. This design surfaces the server's message inline instead.

## Scope

In scope:
- One interceptor exclusion so draft failures do not raise the generic snackbar.
- An inline error message in each of the two draft panels.
- Unit tests for both paths.

Out of scope:
- Any change to how drafts are requested, edited, accepted, or saved. The human
  review gate is untouched: AI output still lands in an editable field behind an
  explicit accept action.
- Retry buttons, backoff, or offline queueing. The existing generate button is
  the retry.
- Changes to `ChallengeApiService` or any model — the response shape for a
  successful draft is unchanged.

## Design

### Interceptor exclusion

`error-handling.interceptor.ts` gains one condition on its ≥ 500 branch so the
panels own the message for draft calls:

```typescript
} else if (error.status >= 500 && !req.url.includes('/draft-')) {
  snackBar.open('Something went wrong. Please try again.', 'Dismiss', { duration: 5000 });
}
```

This follows the file's existing pattern of narrow, commented exclusions — the
`isAuthCall` check on 401 and the `/users/` check on 409 — rather than
introducing a new error-routing mechanism. Both draft routes end in
`/draft-problem-statement` and `/draft-solution-options`, so one substring
covers both and nothing else.

### Panel changes

`problem-statement-panel.component.ts` and
`solution-options-panel.component.ts` both already have an `error` handler that
resets `isDrafting`. Each gains a `draftError` signal set there:

```typescript
readonly draftError = signal<string | null>(null);

requestDraft(): void {
  this.isDrafting.set(true);
  this.draftError.set(null);           // clear on each attempt
  this.challengeApi.draftProblemStatement(this.challenge.id).subscribe({
    next: (response) => {
      this.draftText.set(response.problemStatement);
      this.isDrafting.set(false);
    },
    error: (error: HttpErrorResponse) => {
      this.isDrafting.set(false);
      this.draftError.set(
        error.error?.error ?? 'AI drafting is unavailable. Write the statement manually or try again.',
      );
    },
  });
}
```

The fallback string matters: it covers a network failure or a proxy error, where
there is no server body to read a message from.

Each template renders the message beside its generate button, and only when set:

```html
@if (draftError()) {
  <p class="draft-error">{{ draftError() }}</p>
}
```

`solution-options-panel` is identical apart from the signal being cleared in
`requestDrafts()` and its own fallback wording ("write the options manually").

Both panels keep `OnPush`; a signal read in the template is enough to refresh.

### Files touched

| File | Change |
|---|---|
| `core/interceptors/error-handling.interceptor.ts` | Exclude `/draft-` from the ≥ 500 snackbar |
| `features/challenge-detail/problem-statement-panel/*.component.ts` / `.html` / `.scss` | `draftError` signal, inline message, error style |
| `features/challenge-detail/solution-options-panel/*.component.ts` / `.html` / `.scss` | Same |

No new component, service, model, or route.

## Testing

`npm test -- --watch=false`

- `error-handling.interceptor.spec.ts` — a 503 on a `/draft-` URL opens no
  snackbar; an existing test already covers a 500 elsewhere still opening one.
- `problem-statement-panel.component.spec.ts` — a 503 with
  `{ error: "..." }` sets `draftError` to that message, leaves `draftText`
  untouched, and clears `isDrafting`; a 503 with no body falls back to the
  hardcoded string; a subsequent successful request clears `draftError`.
- `solution-options-panel.component.spec.ts` — the same three cases against
  `requestDrafts()`.

All tests use the existing `HttpTestingController` setup; no live calls, and
these pass whether the backend is running the mock or the real provider.
