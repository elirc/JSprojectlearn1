# TS 21 — Callback types

**Lesson: callback contracts belong in types, not comments — and one
result-union callback beats two half-promised ones.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The contract lives in a comment, and the comment is already wrong: it
promises `onError` a message string; the code passes `{code: 400}` — the
error handler crashes *while handling an error*. The success path double-
fires (a paste bug that `any` made invisible to review — no signature
promised anything to violate), and the `user.nmae` typo compiles and
crashes twice. `onError?: Function` completes the set: optional (so
forgetting errors is the default), and `Function`-typed (ts#15's mush).
Every caller reverse-engineers the contract from the implementation, and
each gets a different answer.

## What changed in the refactor

Two steps, deliberately shown as a progression:

1. **Name the callback types** (`SuccessHandler`, `ErrorHandler`) — the
   comment's claims become checked code; the error payload's real shape is
   in the signature; and `onError` is *required* — an unhandled error
   should be a visible choice, not a quiet default (js#30).
2. **The stronger move: one callback, one discriminated result** (ts#10).
   `FetchResult = success-with-user | error-with-details`, and the
   "exactly one of these happens" contract — which two separate callbacks
   can never express — is now *in the type*. Callers narrow once and the
   compiler makes them face both arms; `result.user` before narrowing
   doesn't compile (type-tested).
3. The footnote that matters: shaped this way, promisification is
   mechanical — and Promises also fix the double-fire *structurally* (a
   promise settles once). The result-object step is what makes that
   migration safe. (js#43's world.)

## Key takeaway

When a function communicates through callbacks, the callbacks' signatures
*are* the API — name them, require the failure path, and prefer a single
callback carrying a discriminated result over parallel
success/error callbacks. The union says what prose comments only wish:
one outcome, fully described, impossible to half-handle.
